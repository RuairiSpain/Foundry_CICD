import assert from "node:assert/strict";
import test from "node:test";
import { createRepositoryToken } from "../../apps/github-app/src/auth/installation-token.ts";

const request = {
  installationId: "123",
  repositoryId: "9007199254740993",
  appJwt: "header.payload.signature",
  permissions: { contents: "read", checks: "write" },
};

function response(body, status = 201) {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

test("installation token requests are restricted to one exact repository and explicit permissions", async () => {
  const result = await createRepositoryToken(request, async (url, init) => {
    assert.equal(url, "https://api.github.com/app/installations/123/access_tokens");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.authorization, "Bearer header.payload.signature");
    assert.equal(init.body, '{"repository_ids":[9007199254740993],"permissions":{"contents":"read","checks":"write"}}');
    return response('{"token":"ghs_local_test","expires_at":"2099-01-01T00:00:00Z","permissions":{"contents":"read","checks":"write","metadata":"read"},"repositories":[{"id":9007199254740993}]}');
  });
  assert.deepEqual(result, { token: "ghs_local_test", expiresAt: "2099-01-01T00:00:00Z" });
});

test("installation token creation rejects missing scope, unsafe IDs and excess permissions", async () => {
  const neverCalled = async () => assert.fail("invalid inputs must not contact GitHub");
  for (const invalid of [
    { ...request, repositoryId: "1/../../" },
    { ...request, installationId: "01" },
    { ...request, appJwt: "header.payload.signature\ninjected" },
    { ...request, permissions: {} },
  ]) await assert.rejects(createRepositoryToken(invalid, neverCalled));

  const excessive = response('{"token":"secret-token","expires_at":"2099-01-01T00:00:00Z","permissions":{"contents":"write","checks":"write"},"repositories":[{"id":9007199254740993}]}');
  await assert.rejects(createRepositoryToken(request, async () => excessive), (error) => !error.message.includes("secret-token"));
  const wrongRepo = response('{"token":"secret-token","expires_at":"2099-01-01T00:00:00Z","permissions":{"contents":"read","checks":"write"},"repositories":[{"id":9007199254740992}]}');
  await assert.rejects(createRepositoryToken(request, async () => wrongRepo), (error) => !error.message.includes("secret-token"));
});

test("installation token provider errors do not expose response bodies", async () => {
  await assert.rejects(
    createRepositoryToken(request, async () => response('{"message":"secret-token"}', 403)),
    (error) => error.message.includes("403") && !error.message.includes("secret-token"),
  );
});

test("installation token creation rejects malformed, expired or unbounded provider responses", async () => {
  for (const body of [
    "not-json",
    "x".repeat(1024 * 1024 + 1),
    '{"token":"secret-token","expires_at":"2000-01-01T00:00:00Z","permissions":{"contents":"read","checks":"write"},"repositories":[{"id":9007199254740993}]}',
    '{"token":"secret-token","expires_at":"2099-01-01T00:00:00Z","permissions":{"contents":"read","checks":"write"}}',
    '{"token":"secret\\u0000token","expires_at":"2099-01-01T00:00:00Z","permissions":{"contents":"read","checks":"write"},"repositories":[{"id":9007199254740993}]}',
  ]) {
    await assert.rejects(createRepositoryToken(request, async () => response(body)),
      (error) => !error.message.includes("secret-token"));
  }
  await assert.rejects(createRepositoryToken(request, async () => { throw new Error("secret-token"); }),
    (error) => !error.message.includes("secret-token"));
});
