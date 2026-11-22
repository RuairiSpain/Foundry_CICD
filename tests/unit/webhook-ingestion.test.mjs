import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { ingestWebhook } from "../../apps/github-app/src/webhooks/ingest.ts";

const secret = "local-test-only";
const deliveryId = "72d3162e-cc78-11e3-81ab-4c9367dc0958";
const payload = {
  installation: { id: 123 },
  repository: { id: 456 },
  ref: "refs/heads/main",
  after: "0123456789abcdef0123456789abcdef01234567",
};

function request(value = payload, overrides = {}) {
  const body = Buffer.from(JSON.stringify(value));
  return {
    body,
    signature: `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
    event: "push",
    deliveryId,
    ...overrides,
  };
}

function memoryInbox() {
  const events = new Map();
  return {
    events,
    async insert(event) {
      const previous = events.get(event.deliveryId);
      if (previous) return previous.bodyDigest === event.bodyDigest ? "duplicate" : "conflict";
      events.set(event.deliveryId, event);
      return "inserted";
    },
  };
}

test("records signed push metadata once and recognizes redelivery", async () => {
  const inbox = memoryInbox();
  assert.deepEqual(await ingestWebhook(secret, request(), inbox), { status: "accepted" });
  assert.deepEqual(await ingestWebhook(secret, request(), inbox), { status: "duplicate" });
  assert.equal(inbox.events.size, 1);
  const event = inbox.events.get(deliveryId);
  assert.equal(event.installationId, "123");
  assert.equal(event.repositoryId, "456");
  assert.equal(event.ref, "refs/heads/main");
  assert.equal(event.commitSha, payload.after);
  assert.equal("body" in event, false);
});

test("rejects forged signatures before parsing or persistence", async () => {
  const inbox = memoryInbox();
  const result = await ingestWebhook(secret, request(payload, {
    body: Buffer.from("{not json"),
    signature: `sha256=${"0".repeat(64)}`,
  }), inbox);
  assert.deepEqual(result, { status: "rejected", code: "invalid_signature" });
  assert.equal(inbox.events.size, 0);
});

test("rejects malformed or ambiguous deliveries without persisting", async () => {
  const inbox = memoryInbox();
  const badRequests = [
    request(payload, { deliveryId: "not-a-guid" }),
    request(payload, { event: undefined }),
    request({ ...payload, repository: { id: 0 } }),
    request({ ...payload, after: "not-a-sha" }),
    request({ ...payload, ref: "refs/heads/main\nunsafe" }),
  ];
  for (const bad of badRequests) {
    const result = await ingestWebhook(secret, bad, inbox);
    assert.equal(result.status, "rejected");
  }
  assert.equal(inbox.events.size, 0);
});

test("rejects a conflicting redelivery and ignores signed unsupported events", async () => {
  const inbox = memoryInbox();
  await ingestWebhook(secret, request(), inbox);
  assert.deepEqual(await ingestWebhook(secret, request({ ...payload, ref: "refs/heads/other" }), inbox),
    { status: "rejected", code: "delivery_conflict" });
  assert.deepEqual(await ingestWebhook(secret, request(payload, { event: "issues" }), inbox),
    { status: "ignored" });
  assert.equal(inbox.events.size, 1);
});

test("does not turn inbox storage failures into successful acknowledgements", async () => {
  const inbox = { async insert() { throw new Error("storage unavailable"); } };
  await assert.rejects(ingestWebhook(secret, request(), inbox), /storage unavailable/);
});

test("rejects oversized and malformed signed payloads", async () => {
  const inbox = memoryInbox();
  const oversized = request(payload, { body: Buffer.alloc(25 * 1024 * 1024 + 1) });
  assert.deepEqual(await ingestWebhook(secret, oversized, inbox), { status: "rejected", code: "invalid_body" });
  for (const body of [Buffer.from("{"), Buffer.from([0xff])]) {
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    assert.deepEqual(await ingestWebhook(secret, request(payload, { body, signature }), inbox),
      { status: "rejected", code: "invalid_payload" });
  }
  assert.equal(inbox.events.size, 0);
});

test("preserves GitHub IDs beyond JavaScript's safe integer range", async () => {
  const inbox = memoryInbox();
  const body = Buffer.from(`{"installation":{"id":9007199254740993},"repository":{"id":456},"ref":"refs/heads/main","after":"${payload.after}"}`);
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.deepEqual(await ingestWebhook(secret, request(payload, { body, signature }), inbox), { status: "accepted" });
  assert.equal(inbox.events.get(deliveryId).installationId, "9007199254740993");
});
