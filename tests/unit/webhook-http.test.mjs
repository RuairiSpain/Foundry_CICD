import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { createWebhookServer } from "../../apps/github-app/src/webhooks/http.ts";

const secret = "local-http-test";
const body = JSON.stringify({
  installation: { id: 1 },
  repository: { id: 2 },
  ref: "refs/heads/main",
  after: "0123456789abcdef0123456789abcdef01234567",
});
const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

async function serve(t, inbox) {
  const errors = [];
  const server = createWebhookServer({ secret, inbox, onError: (code) => errors.push(code) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return { url: `http://127.0.0.1:${server.address().port}`, errors };
}

function headers(overrides = {}) {
  return {
    "content-type": "application/json",
    "x-hub-signature-256": signature,
    "x-github-event": "push",
    "x-github-delivery": randomUUID(),
    ...overrides,
  };
}

test("accepts a signed push and rejects forged or unsupported HTTP requests", async (t) => {
  const stored = [];
  const inbox = { async insert(event) { stored.push(event); return "inserted"; } };
  const { url } = await serve(t, inbox);
  const accepted = await fetch(`${url}/github/webhooks`, { method: "POST", headers: headers(), body });
  assert.equal(accepted.status, 202);
  const forged = await fetch(`${url}/github/webhooks`, { method: "POST", headers: headers({ "x-hub-signature-256": "bad" }), body });
  assert.equal(forged.status, 401);
  const wrongType = await fetch(`${url}/github/webhooks`, { method: "POST", headers: headers({ "content-type": "text/plain" }), body });
  assert.equal(wrongType.status, 415);
  assert.equal((await fetch(`${url}/elsewhere`)).status, 404);
  assert.equal(stored.length, 1);
});

test("surfaces storage failures as 503 without leaking payloads or internal details", async (t) => {
  const inbox = { async insert() { throw new Error("sensitive provider details"); } };
  const { url, errors } = await serve(t, inbox);
  const result = await fetch(`${url}/github/webhooks`, { method: "POST", headers: headers(), body });
  assert.equal(result.status, 503);
  const text = await result.text();
  assert.doesNotMatch(text, /sensitive provider details|refs\/heads\/main/);
  assert.deepEqual(errors, ["inbox_unavailable"]);
});

test("rejects oversized requests and conflicting deliveries", async (t) => {
  const inbox = { async insert() { return "conflict"; } };
  const { url } = await serve(t, inbox);
  const conflict = await fetch(`${url}/github/webhooks`, { method: "POST", headers: headers(), body });
  assert.equal(conflict.status, 409);
  const oversized = await fetch(`${url}/github/webhooks`, {
    method: "POST", headers: headers(), body: Buffer.alloc(25 * 1024 * 1024 + 1),
  });
  assert.equal(oversized.status, 413);
});
