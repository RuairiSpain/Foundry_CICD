import assert from "node:assert/strict";
import test from "node:test";
import { getInstallation } from "../../apps/github-app/src/github/installations.ts";

const request = {
  installationId: "9007199254740993",
  appId: "9007199254740995",
  appJwt: "header.payload.signature",
};
const installation = '{"id":9007199254740993,"app_id":9007199254740995,"target_id":9007199254740997,"target_type":"Organization","account":{"id":9007199254740997,"login":"example-org","type":"Organization"},"repository_selection":"selected","permissions":{"metadata":"read","checks":"write","organization_projects":"admin"},"suspended_at":null}';
const reply = (body, status = 200) => new Response(body, { status });

test("reads exact installation and account identities from GitHub", async () => {
  const result = await getInstallation(request, async (url, init) => {
    assert.equal(url, "https://api.github.com/app/installations/9007199254740993");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.authorization, "Bearer header.payload.signature");
    return reply(installation);
  });
  assert.deepEqual(result, {
    installationId: "9007199254740993",
    appId: "9007199254740995",
    accountId: "9007199254740997",
    accountLogin: "example-org",
    targetType: "Organization",
    repositorySelection: "selected",
    permissions: { metadata: "read", checks: "write", organization_projects: "admin" },
    suspended: false,
  });
});

test("reports suspension without treating a webhook as authorization", async () => {
  const body = installation.replace('"suspended_at":null', '"suspended_at":"2026-01-02T03:04:05Z"');
  assert.equal((await getInstallation(request, async () => reply(body))).suspended, true);
});

test("rejects unsafe inputs and mismatched or malformed provider data", async () => {
  const neverCalled = async () => assert.fail("invalid inputs must not contact GitHub");
  for (const change of [{ installationId: "1/2" }, { appId: "0" }, { appJwt: "secret\n" }]) {
    await assert.rejects(getInstallation({ ...request, ...change }, neverCalled));
  }
  for (const body of [
    "not-json",
    installation.replace("9007199254740993", "9007199254740992"),
    installation.replace("9007199254740995", "9007199254740994"),
    installation.replace('"repository_selection":"selected"', '"repository_selection":"unknown"'),
    installation.replace('"suspended_at":null', '"suspended_at":"not-a-date"'),
    installation.replace('"checks":"write"', '"checks":"unexpected"'),
    installation.replace('"target_type":"Organization"', '"target_type":"Enterprise"'),
    "x".repeat(1024 * 1024 + 1),
  ]) await assert.rejects(getInstallation(request, async () => reply(body)));
});

test("provider failures are sanitized and never converted to an active installation", async () => {
  await assert.rejects(getInstallation(request, async () => reply('{"message":"sensitive"}', 404)),
    (error) => error.message.includes("404") && !error.message.includes("sensitive"));
  await assert.rejects(getInstallation(request, async () => { throw new Error("sensitive"); }),
    (error) => !error.message.includes("sensitive"));
});
