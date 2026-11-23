import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { PushEvent } from "./ingest.ts";

export class PostgresOutboxDispatcher {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async dispatchOne(
    installationId: string,
    publish: (event: PushEvent) => Promise<void>,
  ): Promise<"idle" | "published"> {
    if (!/^[1-9][0-9]*$/.test(installationId)) throw new Error("Invalid installation ID.");
    const token = randomUUID();
    const result = await this.pool.query<PushEvent>(
      `WITH next_event AS (
         SELECT o.delivery_id
         FROM webhook_outbox o
         JOIN webhook_inbox i ON i.delivery_id = o.delivery_id
         WHERE i.installation_id = $1 AND o.published_at IS NULL
           AND (o.leased_until IS NULL OR o.leased_until <= now())
         ORDER BY o.created_at, o.delivery_id
         FOR UPDATE OF o SKIP LOCKED
         LIMIT 1
       )
       UPDATE webhook_outbox o
       SET lease_token = $2, leased_until = now() + interval '1 minute'
       FROM next_event n, webhook_inbox i
       WHERE o.delivery_id = n.delivery_id AND i.delivery_id = o.delivery_id
       RETURNING i.delivery_id::text AS "deliveryId", i.installation_id AS "installationId",
         i.repository_id AS "repositoryId", i.ref, i.commit_sha AS "commitSha", i.body_digest AS "bodyDigest"`,
      [installationId, token],
    );
    if (result.rowCount === 0) return "idle";
    const event = result.rows[0];
    try {
      await publish(event);
    } catch (error) {
      try {
        await this.pool.query(
          "UPDATE webhook_outbox SET lease_token = NULL, leased_until = NULL WHERE delivery_id = $1 AND lease_token = $2 AND published_at IS NULL",
          [event.deliveryId, token],
        );
      } catch (releaseError) {
        throw new AggregateError([error, releaseError], "Publishing failed and the lease could not be released.");
      }
      throw error;
    }
    const acknowledged = await this.pool.query(
      `UPDATE webhook_outbox SET published_at = now(), lease_token = NULL, leased_until = NULL
       WHERE delivery_id = $1 AND lease_token = $2 AND leased_until > now() AND published_at IS NULL`,
      [event.deliveryId, token],
    );
    if (acknowledged.rowCount !== 1) throw new Error("Outbox lease expired or changed before acknowledgement.");
    return "published";
  }
}
