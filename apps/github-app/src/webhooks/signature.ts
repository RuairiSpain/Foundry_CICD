import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(
  secret: string,
  rawBody: Uint8Array,
  signature: string | undefined,
): boolean {
  if (!secret) {
    throw new Error("Webhook secret must not be empty.");
  }
  if (!signature || !/^sha256=[0-9a-f]{64}$/.test(signature)) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature.slice(7), "hex");
  return timingSafeEqual(expected, received);
}
