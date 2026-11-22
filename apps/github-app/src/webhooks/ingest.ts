import { createHash } from "node:crypto";
import { verifyWebhookSignature } from "./signature.ts";

export interface PushEvent {
  deliveryId: string;
  installationId: string;
  repositoryId: string;
  ref: string;
  commitSha: string;
  bodyDigest: string;
}

export interface WebhookInbox {
  insert(event: PushEvent): Promise<"inserted" | "duplicate" | "conflict">;
}

export interface WebhookRequest {
  body: Uint8Array;
  signature: string | undefined;
  event: string | undefined;
  deliveryId: string | undefined;
}

type IngestResult =
  | { status: "accepted" | "duplicate" | "ignored" }
  | { status: "rejected"; code: "invalid_body" | "invalid_signature" | "invalid_delivery" | "invalid_payload" | "delivery_conflict" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProviderId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,19}$/.test(value);
}

export async function ingestWebhook(
  secret: string,
  request: WebhookRequest,
  inbox: WebhookInbox,
): Promise<IngestResult> {
  if (request.body.byteLength > 25 * 1024 * 1024) {
    return { status: "rejected", code: "invalid_body" };
  }
  if (!verifyWebhookSignature(secret, request.body, request.signature)) {
    return { status: "rejected", code: "invalid_signature" };
  }
  if (!request.deliveryId || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(request.deliveryId)) {
    return { status: "rejected", code: "invalid_delivery" };
  }
  if (!request.event || !/^[a-z][a-z0-9_]{0,63}$/.test(request.event)) {
    return { status: "rejected", code: "invalid_delivery" };
  }
  if (request.event !== "push") {
    return { status: "ignored" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(request.body),
      (key: string, value: unknown, context?: { source?: string }) =>
        key === "id" ? (typeof value === "number" ? context?.source : null) : value,
    );
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return { status: "rejected", code: "invalid_payload" };
    }
    throw error;
  }
  if (
    !isRecord(payload) || !isRecord(payload.installation) || !isProviderId(payload.installation.id) ||
    !isRecord(payload.repository) || !isProviderId(payload.repository.id) ||
    typeof payload.ref !== "string" || !/^refs\/[^\x00-\x20\x7f]{1,250}$/.test(payload.ref) ||
    typeof payload.after !== "string" || !/^[0-9a-f]{40}$/i.test(payload.after)
  ) {
    return { status: "rejected", code: "invalid_payload" };
  }
  if (payload.after === "0".repeat(40)) {
    return { status: "ignored" };
  }
  const result = await inbox.insert({
    deliveryId: request.deliveryId.toLowerCase(),
    installationId: payload.installation.id,
    repositoryId: payload.repository.id,
    ref: payload.ref,
    commitSha: payload.after.toLowerCase(),
    bodyDigest: createHash("sha256").update(request.body).digest("hex"),
  });
  if (result === "conflict") {
    return { status: "rejected", code: "delivery_conflict" };
  }
  return { status: result === "inserted" ? "accepted" : "duplicate" };
}
