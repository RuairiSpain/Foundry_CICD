import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { PostgresWebhookInbox } from "../../apps/github-app/src/webhooks/postgres-inbox.ts";
import { createWebhookServer } from "../../apps/github-app/src/webhooks/http.ts";
import { testDatabaseUrl } from "./test-database.mjs";

test("inbox persists and deduplicates concurrent deliveries without losing conflicts", async (t) => {
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_test_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  const migration = await readFile(new URL("../../apps/github-app/migrations/001_webhook_inbox.sql", import.meta.url), "utf8");
  await pool.query(migration);
  const inbox = new PostgresWebhookInbox(pool);
  const event = {
    deliveryId: randomUUID(),
    installationId: "123",
    repositoryId: "456",
    ref: "refs/heads/main",
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    bodyDigest: "a".repeat(64),
  };
  const results = await Promise.all(Array.from({ length: 10 }, () => inbox.insert(event)));
  assert.equal(results.filter((result) => result === "inserted").length, 1);
  assert.equal(results.filter((result) => result === "duplicate").length, 9);
  assert.equal(await inbox.insert({ ...event, bodyDigest: "b".repeat(64) }), "conflict");
  const rows = await pool.query("SELECT installation_id, repository_id, body_digest FROM webhook_inbox");
  assert.equal(rows.rowCount, 1);
  assert.deepEqual(rows.rows[0], { installation_id: "123", repository_id: "456", body_digest: "a".repeat(64) });
  const outbox = await pool.query("SELECT delivery_id FROM webhook_outbox WHERE delivery_id = $1", [event.deliveryId]);
  assert.equal(outbox.rowCount, 1);

  await pool.query("ALTER TABLE webhook_outbox ADD CONSTRAINT fail_inserts CHECK (false) NOT VALID");
  const failedDelivery = randomUUID();
  await assert.rejects(inbox.insert({ ...event, deliveryId: failedDelivery }));
  const partial = await pool.query("SELECT delivery_id FROM webhook_inbox WHERE delivery_id = $1", [failedDelivery]);
  assert.equal(partial.rowCount, 0);
  await pool.query("ALTER TABLE webhook_outbox DROP CONSTRAINT fail_inserts");

  const server = createWebhookServer({ secret: "local-integration-secret", inbox, onError: (code) => { throw new Error(code); } });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/github/webhooks`;
  const deliveryId = randomUUID();
  const body = JSON.stringify({
    installation: { id: 123 },
    repository: { id: 456 },
    ref: "refs/heads/main",
    after: event.commitSha,
  });
  const signature = `sha256=${createHmac("sha256", "local-integration-secret").update(body).digest("hex")}`;
  const headers = {
    "content-type": "application/json",
    "x-hub-signature-256": signature,
    "x-github-event": "push",
    "x-github-delivery": deliveryId,
  };
  assert.equal((await fetch(url, { method: "POST", headers, body })).status, 202);
  assert.equal((await fetch(url, { method: "POST", headers, body })).status, 202);
  const httpRows = await pool.query("SELECT COUNT(*)::integer AS count FROM webhook_inbox WHERE delivery_id = $1", [deliveryId]);
  assert.equal(httpRows.rows[0].count, 1);
});
