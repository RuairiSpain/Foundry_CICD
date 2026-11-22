import type { Pool } from "pg";
import type { PushEvent, WebhookInbox } from "./ingest.ts";

export class PostgresWebhookInbox implements WebhookInbox {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async insert(event: PushEvent): Promise<"inserted" | "duplicate" | "conflict"> {
    const result = await this.pool.query(
      `WITH inserted AS (
         INSERT INTO webhook_inbox
           (delivery_id, installation_id, repository_id, ref, commit_sha, body_digest)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (delivery_id) DO NOTHING
         RETURNING delivery_id
       )
       INSERT INTO webhook_outbox (delivery_id)
       SELECT delivery_id FROM inserted
       RETURNING delivery_id`,
      [event.deliveryId, event.installationId, event.repositoryId, event.ref, event.commitSha, event.bodyDigest],
    );
    if (result.rowCount === 1) return "inserted";

    const existing = await this.pool.query<{ body_digest: string }>(
      "SELECT body_digest FROM webhook_inbox WHERE delivery_id = $1",
      [event.deliveryId],
    );
    if (existing.rowCount !== 1) {
      throw new Error("Inbox delivery disappeared after conflict.");
    }
    return existing.rows[0].body_digest === event.bodyDigest ? "duplicate" : "conflict";
  }
}
