import assert from "node:assert/strict";
import test from "node:test";
import { verifyWebhookSignature } from "../../apps/github-app/src/webhooks/signature.ts";

// Public test vector from GitHub's webhook validation documentation.
const secret = "It's a Secret to Everybody";
const body = Buffer.from("Hello, World!", "utf8");
const signature = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

test("accepts GitHub's published HMAC-SHA256 test vector", () => {
  assert.equal(verifyWebhookSignature(secret, body, signature), true);
});

test("rejects altered raw payload or secret", () => {
  assert.equal(verifyWebhookSignature(secret, Buffer.from("Hello, world!"), signature), false);
  assert.equal(verifyWebhookSignature("different secret", body, signature), false);
});

test("rejects missing and malformed signature headers", () => {
  for (const header of [undefined, "", "sha1=123", "sha256=xyz", `${signature}00`, signature.toUpperCase()]) {
    assert.equal(verifyWebhookSignature(secret, body, header), false);
  }
});

test("rejects a well-formed signature with an incorrect digest", () => {
  assert.equal(verifyWebhookSignature(secret, body, `sha256=${"0".repeat(64)}`), false);
});

test("rejects an empty configured secret", () => {
  assert.throws(() => verifyWebhookSignature("", body, signature), /secret/i);
});
