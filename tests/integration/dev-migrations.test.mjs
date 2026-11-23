import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

test("local migrations are repeatable and detect changed migration history", async (t) => {
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_migrate_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const scoped = new URL(databaseUrl);
  scoped.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new pg.Pool({ connectionString: scoped.toString() });
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  const script = fileURLToPath(new URL("../../apps/github-app/src/migrate-dev.ts", import.meta.url));
  const run = () => spawnSync(process.execPath, [script], {
    env: { ...process.env, DATABASE_URL: scoped.toString() }, encoding: "utf8",
  });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.equal((await pool.query("SELECT version FROM schema_migrations")).rowCount, 2);
  assert.equal((await pool.query("SELECT operation_id FROM dev_push_operations LIMIT 0")).rowCount, 0);
  await pool.query("UPDATE schema_migrations SET checksum = $1 WHERE version = $2", ["0".repeat(64), "001_webhook_inbox.sql"]);
  const mismatch = run();
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /migration/i);
});

test("local migration tool refuses remote database URLs", () => {
  const script = fileURLToPath(new URL("../../apps/github-app/src/migrate-dev.ts", import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, DATABASE_URL: "postgresql://user:dummy@remote.example.invalid/db" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /dummy/);
});
