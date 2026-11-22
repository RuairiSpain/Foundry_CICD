import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { PostgresWebhookInbox } from "../../apps/github-app/src/webhooks/postgres-inbox.ts";
import { PostgresOutboxDispatcher } from "../../apps/github-app/src/webhooks/outbox.ts";
import { testDatabaseUrl } from "./test-database.mjs";

test("outbox dispatch is tenant-scoped, retryable, and guarded by leases", async (t) => {
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_outbox_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  await pool.query(await readFile(new URL("../../apps/github-app/migrations/001_webhook_inbox.sql", import.meta.url), "utf8"));
  const inbox = new PostgresWebhookInbox(pool);
  const event = {
    deliveryId: randomUUID(), installationId: "123", repositoryId: "456",
    ref: "refs/heads/main", commitSha: "a".repeat(40), bodyDigest: "a".repeat(64),
  };
  await inbox.insert(event);
  await inbox.insert({ ...event, deliveryId: randomUUID(), installationId: "999" });
  const dispatcher = new PostgresOutboxDispatcher(pool);
  const published = [];
  assert.equal(await dispatcher.dispatchOne("321", async (item) => published.push(item)), "idle");
  await assert.rejects(dispatcher.dispatchOne("123", async () => { throw new Error("bus unavailable"); }), /bus unavailable/);
  assert.equal(await dispatcher.dispatchOne("123", async (item) => published.push(item)), "published");
  assert.deepEqual(published, [event]);
  assert.equal(await dispatcher.dispatchOne("123", async () => assert.fail("already published")), "idle");
  assert.equal(await dispatcher.dispatchOne("999", async (item) => assert.equal(item.installationId, "999")), "published");

  const concurrent = { ...event, deliveryId: randomUUID() };
  await inbox.insert(concurrent);
  let release;
  let started;
  const running = new Promise((resolve) => { started = resolve; });
  const wait = new Promise((resolve) => { release = resolve; });
  const first = dispatcher.dispatchOne("123", async () => { started(); await wait; });
  await running;
  assert.equal(await dispatcher.dispatchOne("123", async () => assert.fail("event is leased")), "idle");
  release();
  assert.equal(await first, "published");
});

test("a stale publisher cannot acknowledge an event claimed by another worker", async (t) => {
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_stale_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  await pool.query(await readFile(new URL("../../apps/github-app/migrations/001_webhook_inbox.sql", import.meta.url), "utf8"));
  const event = {
    deliveryId: randomUUID(), installationId: "123", repositoryId: "456",
    ref: "refs/heads/main", commitSha: "b".repeat(40), bodyDigest: "b".repeat(64),
  };
  await new PostgresWebhookInbox(pool).insert(event);
  const dispatcher = new PostgresOutboxDispatcher(pool);
  await assert.rejects(dispatcher.dispatchOne("123", async () => {
    await pool.query("UPDATE webhook_outbox SET lease_token = $1 WHERE delivery_id = $2", [randomUUID(), event.deliveryId]);
  }), /lease/i);
  const row = await pool.query("SELECT published_at FROM webhook_outbox WHERE delivery_id = $1", [event.deliveryId]);
  assert.equal(row.rows[0].published_at, null);
});
