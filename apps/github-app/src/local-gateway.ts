import type { Server } from "node:http";
import pg from "pg";
import { localDatabaseUrl } from "./local-database.ts";
import { createWebhookServer } from "./webhooks/http.ts";
import { PostgresWebhookInbox } from "./webhooks/postgres-inbox.ts";

export async function startLocalGateway(options: {
  databaseUrl: string;
  secret: string;
  port: number;
}): Promise<{ server: Server; address: string; close: () => Promise<void> }> {
  const databaseUrl = localDatabaseUrl(options.databaseUrl);
  if (!options.secret || !Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error("A secret and valid local port are required.");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    await pool.query("SELECT delivery_id FROM webhook_inbox LIMIT 0");
    await pool.query("SELECT delivery_id FROM webhook_outbox LIMIT 0");
    const server = createWebhookServer({
      secret: options.secret,
      inbox: new PostgresWebhookInbox(pool),
      onError: (code) => console.error(`webhook error: ${code}`),
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      throw new Error("Local gateway address is unavailable.");
    }
    let closing: Promise<void> | undefined;
    return {
      server,
      address: `http://127.0.0.1:${address.port}`,
      close: () => closing ??= (async () => {
        try {
          await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        } finally {
          await pool.end();
        }
      })(),
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
