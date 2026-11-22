import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { ingestWebhook } from "../../apps/github-app/src/webhooks/ingest.ts";

test("the gateway emits the versioned push-event contract without provider precision loss", async () => {
  const schema = JSON.parse(await readFile(new URL("../../schemas/push-event.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const body = Buffer.from(`{"installation":{"id":9007199254740993},"repository":{"id":456},"ref":"refs/heads/main","after":"${"a".repeat(40)}"}`);
  const signature = `sha256=${createHmac("sha256", "test").update(body).digest("hex")}`;
  let actual;
  assert.deepEqual(await ingestWebhook("test", {
    body, signature, event: "push", deliveryId: "27c30c56-d6b0-4b9e-b9bc-191502697d50",
  }, { async insert(event) { actual = event; return "inserted"; } }), { status: "accepted" });
  assert.equal(validate(actual), true, JSON.stringify(validate.errors));
  assert.equal(actual.installationId, "9007199254740993");
  assert.equal(validate({ ...actual, installationId: "01" }), false);
  assert.equal(validate({ ...actual, unexpected: true }), false);
});
