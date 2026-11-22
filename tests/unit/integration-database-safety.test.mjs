import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const suites = [
  "dev-migrations.test.mjs",
  "dev-server.test.mjs",
  "local-gateway.test.mjs",
  "outbox-dispatch.test.mjs",
  "webhook-inbox.test.mjs",
];

test("database integration suites reject remote hosts and connection-string overrides", () => {
  for (const suite of suites) {
    const path = fileURLToPath(new URL(`../integration/${suite}`, import.meta.url));
    for (const databaseUrl of [
      "postgresql://test:dummy@127.0.0.2:1/test",
      "postgresql://test:dummy@127.0.0.1:1/test?host=127.0.0.2",
    ]) {
      const env = { ...process.env, TEST_DATABASE_URL: databaseUrl };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, ["--test", path], {
        env,
        encoding: "utf8",
        timeout: 5000,
      });
      assert.equal(result.error, undefined, `${suite}: ${result.error}`);
      assert.notEqual(result.status, 0, `${suite} unexpectedly accepted ${databaseUrl}`);
      assert.match(`${result.stdout}\n${result.stderr}`, /loopback.*without.*query/i, suite);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /ECONNREFUSED|ETIMEDOUT/i, suite);
    }
  }
});
