import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createAppJwt } from "../../apps/github-app/src/auth/app-jwt.ts";

test("GitHub App JWT is RS256-signed with bounded lifetime and exact client identity", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const token = createAppJwt("Iv1.example", pem, 1_700_000_000);
  const [header, payload, signature] = token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), {
    iss: "Iv1.example", iat: 1_699_999_940, exp: 1_700_000_540,
  });
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${header}.${payload}`);
  assert.equal(verifier.verify(publicKey, Buffer.from(signature, "base64url")), true);
});

test("GitHub App JWT rejects invalid identities, weak or non-RSA keys, and invalid clocks", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const weak = privateKey.export({ type: "pkcs8", format: "pem" });
  const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" });
  assert.throws(() => createAppJwt("app", weak, 1_700_000_000));
  assert.throws(() => createAppJwt("app", ec, 1_700_000_000));
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
  assert.throws(() => createAppJwt("bad\nidentity", rsa, 1_700_000_000));
  assert.throws(() => createAppJwt("app", rsa, Number.NaN));
  assert.throws(() => createAppJwt("app", rsa, Number.MAX_SAFE_INTEGER));
});
