import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

test("local gateway dispatches signed events to durable operations and mock checks", { timeout: 20000 }, async (t) => {
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_dev_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const scoped = new URL(databaseUrl);
  scoped.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new pg.Pool({ connectionString: scoped.toString() });
  const migration = await readFile(new URL("../../apps/github-app/migrations/001_webhook_inbox.sql", import.meta.url), "utf8");
  await pool.query(migration);
  const workerMigration = await readFile(new URL("../../services/control-plane/migrations/001_dev_push_operations.sql", import.meta.url), "utf8");
  await pool.query(workerMigration);
  const child = spawn(process.execPath, [fileURLToPath(new URL("../../apps/github-app/src/dev.ts", import.meta.url))], {
    env: { ...process.env, DATABASE_URL: scoped.toString(), WEBHOOK_SECRET: "integration-only", PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  const address = await Promise.race([
    once(child.stdout, "data").then(([chunk]) => chunk.toString().trim()),
    once(child, "exit").then(([code]) => { throw new Error(`gateway exited before readiness: ${code}`); }),
  ]);
  assert.match(address, /^http:\/\/127\.0\.0\.1:\d+$/);
  const body = JSON.stringify({ installation: { id: 11 }, repository: { id: 12 }, ref: "refs/heads/main", after: "0".repeat(40) });
  const signature = `sha256=${createHmac("sha256", "integration-only").update(body).digest("hex")}`;
  const deliveryId = randomUUID();
  const response = await fetch(`${address}/github/webhooks`, { method: "POST", body, headers: {
    "content-type": "application/json",
    "x-hub-signature-256": signature,
    "x-github-event": "push",
    "x-github-delivery": deliveryId,
  } });
  assert.equal(response.status, 202);
  assert.equal((await pool.query("SELECT delivery_id FROM webhook_outbox WHERE delivery_id=$1", [deliveryId])).rowCount, 1);
  const missingWorker = spawnSync(process.execPath, [
    fileURLToPath(new URL("../../apps/github-app/src/dev-dispatch.ts", import.meta.url)),
    "11",
  ], { env: { ...process.env, DATABASE_URL: scoped.toString(), FOUNDRY_PYTHON: "nonexistent-foundry-python" }, encoding: "utf8", timeout: 10000 });
  assert.notEqual(missingWorker.status, 0);
  assert.doesNotMatch(missingWorker.stderr, /local_test_only/);
  const pending = await pool.query("SELECT published_at, lease_token FROM webhook_outbox WHERE delivery_id=$1", [deliveryId]);
  assert.deepEqual(pending.rows, [{ published_at: null, lease_token: null }]);
  const dispatch = spawnSync(process.execPath, [
    fileURLToPath(new URL("../../apps/github-app/src/dev-dispatch.ts", import.meta.url)),
    "11",
  ], { env: { ...process.env, DATABASE_URL: scoped.toString() }, encoding: "utf8", timeout: 10000 });
  assert.equal(dispatch.status, 0, dispatch.stderr);
  const operation = await pool.query("SELECT installation_id, repository_id, commit_sha FROM dev_push_operations WHERE delivery_id=$1", [deliveryId]);
  assert.deepEqual(operation.rows, [{ installation_id: "11", repository_id: "12", commit_sha: "0".repeat(40) }]);
  const checks = await pool.query("SELECT status FROM dev_mock_checks");
  assert.deepEqual(checks.rows, [{ status: "queued" }]);
  assert.equal((await pool.query("SELECT published_at IS NOT NULL AS published FROM webhook_outbox WHERE delivery_id=$1", [deliveryId])).rows[0].published, true);
});
