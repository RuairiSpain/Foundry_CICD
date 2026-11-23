import { spawnSync } from "node:child_process";
import { delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { localDatabaseUrl } from "./local-database.ts";
import { PostgresOutboxDispatcher } from "./webhooks/outbox.ts";

async function main(): Promise<void> {
  const databaseUrl = localDatabaseUrl(process.env.DATABASE_URL);
  const installationId = process.argv[2];
  if (!installationId || !/^[1-9][0-9]{0,19}$/.test(installationId) || process.argv.length !== 3) {
    throw new Error("Provide one installation ID.");
  }
  const pythonPath = fileURLToPath(new URL("../../../services/control-plane/src", import.meta.url));
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    const result = await new PostgresOutboxDispatcher(pool).dispatchOne(installationId, async (event) => {
      const child = spawnSync(process.env.FOUNDRY_PYTHON || "python", ["-m", "foundry_control_plane.dev_worker"], {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          PYTHONPATH: [pythonPath, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
        },
        input: JSON.stringify(event),
        encoding: "utf8",
        timeout: 45000,
        maxBuffer: 1024 * 1024,
      });
      if (child.error || child.status !== 0) throw new Error("Local worker failed or timed out.");
    });
    console.log(result);
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Local dispatch failed; check the worker and database.");
  process.exitCode = 1;
});
