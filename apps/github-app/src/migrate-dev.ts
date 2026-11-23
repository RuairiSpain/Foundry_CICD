import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { localDatabaseUrl } from "./local-database.ts";

async function main(): Promise<void> {
  const databaseUrl = localDatabaseUrl(process.env.DATABASE_URL);
  const migrations = [
    { version: "001_webhook_inbox.sql", path: new URL("../migrations/001_webhook_inbox.sql", import.meta.url) },
    { version: "001_dev_push_operations.sql", path: new URL("../../../services/control-plane/migrations/001_dev_push_operations.sql", import.meta.url) },
  ];
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('foundry-github-app-migrations'))");
      await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL)");
      for (const { version, path } of migrations) {
        const sql = await readFile(path, "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const previous = await client.query<{ checksum: string }>(
          "SELECT checksum FROM schema_migrations WHERE version = $1", [version],
        );
        if (previous.rowCount) {
          if (previous.rows[0].checksum !== checksum) throw new Error("Migration checksum mismatch.");
        } else {
          await client.query(sql);
          await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [version, checksum]);
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
  console.log("Local database migration is current.");
}

main().catch(() => {
  console.error("Local migration failed; check the database and migration history.");
  process.exitCode = 1;
});
