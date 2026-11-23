import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

test("local gateway lifecycle starts on loopback and closes its database resources", async (t) => {
  const { startLocalGateway } = await import("../../apps/github-app/src/local-gateway.ts");
  const databaseUrl = testDatabaseUrl();
  const admin = new pg.Client({ connectionString: databaseUrl });
  await admin.connect();
  const schema = `webhook_lifecycle_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const scoped = new URL(databaseUrl);
  scoped.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new pg.Pool({ connectionString: scoped.toString() });
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  await pool.query(await readFile(new URL("../../apps/github-app/migrations/001_webhook_inbox.sql", import.meta.url), "utf8"));
  const gateway = await startLocalGateway({ databaseUrl: scoped.toString(), secret: "local", port: 0 });
  assert.match(gateway.address, /^http:\/\/127\.0\.0\.1:\d+$/);
  const response = await fetch(`${gateway.address}/not-a-route`);
  assert.equal(response.status, 404);
  await Promise.all([gateway.close(), gateway.close()]);
  await assert.rejects(fetch(`${gateway.address}/not-a-route`));
  await assert.rejects(startLocalGateway({ databaseUrl: scoped.toString(), secret: "", port: 0 }));

  const moduleUrl = new URL("../../apps/github-app/src/dev.ts", import.meta.url).href;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { main } from ${JSON.stringify(moduleUrl)};
    const originalSigint = process.listenerCount("SIGINT");
    const originalSigterm = process.listenerCount("SIGTERM");
    const running = await main();
    await running.close();
    if (process.listenerCount("SIGINT") !== originalSigint || process.listenerCount("SIGTERM") !== originalSigterm) {
      throw new Error("Signal handlers were not released");
    }
    delete process.env.WEBHOOK_SECRET;
    await main().then(() => { throw new Error("Missing secret was accepted"); }, () => {});
  `], { env: { ...process.env, DATABASE_URL: scoped.toString(), WEBHOOK_SECRET: "local", PORT: "0" }, encoding: "utf8", timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);

  const failed = spawnSync(process.execPath, [fileURLToPath(moduleUrl)], {
    env: { ...process.env, DATABASE_URL: scoped.toString(), WEBHOOK_SECRET: "", PORT: "0" }, encoding: "utf8",
  });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /startup failed/);
  assert.doesNotMatch(failed.stderr, /local_test_only/);
});
