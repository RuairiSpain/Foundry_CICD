import assert from "node:assert/strict";
import test from "node:test";
import { createCheckRun, findCheckRuns, updateCheckRun } from "../../apps/github-app/src/github/check-runs.ts";

const request = {
  owner: "example-org",
  repository: "agent-repo",
  token: "ghs_local_test",
  name: "Foundry validation",
  headSha: "0123456789abcdef0123456789abcdef01234567",
  externalId: "op-123",
};

const reply = (body, status = 201) => new Response(body, {
  status,
  headers: { "content-type": "application/json" },
});

test("creates a queued check and preserves an exact GitHub identifier", async () => {
  const checkId = await createCheckRun(request, async (url, init) => {
    assert.equal(url, "https://api.github.com/repos/example-org/agent-repo/check-runs");
    assert.equal(init.method, "POST");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.authorization, "Bearer ghs_local_test");
    assert.deepEqual(JSON.parse(init.body), {
      name: "Foundry validation",
      head_sha: "0123456789abcdef0123456789abcdef01234567",
      external_id: "op-123",
      status: "queued",
    });
    return reply('{"id":9007199254740993,"head_sha":"0123456789abcdef0123456789abcdef01234567","external_id":"op-123","name":"Foundry validation","status":"queued"}');
  });
  assert.equal(checkId, "9007199254740993");
});

test("updates a known check with its completed result", async () => {
  const result = await updateCheckRun({
    ...request, checkId: "9007199254740993", conclusion: "failure",
    title: "Validation failed", summary: "Review the policy findings.",
  }, async (url, init) => {
    assert.equal(url, "https://api.github.com/repos/example-org/agent-repo/check-runs/9007199254740993");
    assert.equal(init.method, "PATCH");
    assert.deepEqual(JSON.parse(init.body), {
      status: "completed", conclusion: "failure",
      output: { title: "Validation failed", summary: "Review the policy findings." },
    });
    return reply('{"id":9007199254740993,"head_sha":"0123456789abcdef0123456789abcdef01234567","external_id":"op-123","name":"Foundry validation","status":"completed","conclusion":"failure"}', 200);
  });
  assert.equal(result, "9007199254740993");
});

test("rejects unsafe check requests before contacting GitHub", async () => {
  const neverCalled = async () => assert.fail("invalid inputs must not contact GitHub");
  for (const changes of [
    { owner: "../wrong" }, { repository: "." }, { token: "secret\r\nInjected: true" },
    { headSha: "not-a-sha" }, { externalId: "" }, { name: "" },
  ]) await assert.rejects(createCheckRun({ ...request, ...changes }, neverCalled));
  for (const changes of [
    { checkId: "01" }, { conclusion: "stale" }, { title: "" }, { summary: "x".repeat(65536) },
  ]) await assert.rejects(updateCheckRun({
    ...request, checkId: "42", conclusion: "failure", title: "Failed", summary: "See details",
    ...changes,
  }, neverCalled));
});

test("fails safely on ambiguous creation and never retries a mutation", async () => {
  let calls = 0;
  await assert.rejects(createCheckRun(request, async () => {
    calls += 1;
    throw new Error("sensitive provider detail");
  }), (error) => /unknown/i.test(error.message) && !error.message.includes("sensitive"));
  assert.equal(calls, 1);
});

test("rejects provider failures and malformed or mismatched check results without leaking content", async () => {
  for (const body of [
    "not-json",
    "x".repeat(1024 * 1024 + 1),
    '{"id":0,"head_sha":"0123456789abcdef0123456789abcdef01234567","external_id":"op-123","name":"Foundry validation","status":"queued"}',
    '{"id":42,"head_sha":"ffffffffffffffffffffffffffffffffffffffff","external_id":"op-123","name":"Foundry validation","status":"queued"}',
  ]) await assert.rejects(createCheckRun(request, async () => reply(body)));
  await assert.rejects(createCheckRun(request, async () => reply('{"message":"sensitive"}', 403)),
    (error) => error.message.includes("403") && !error.message.includes("sensitive"));
  await assert.rejects(updateCheckRun({
    ...request, checkId: "42", conclusion: "failure", title: "Failed", summary: "See details",
  }, async () => reply('{"id":43,"head_sha":"0123456789abcdef0123456789abcdef01234567","external_id":"op-123","name":"Foundry validation","status":"completed","conclusion":"failure"}', 200)));
});

test("finds matching check runs across pages without trusting another App", async () => {
  const unrelated = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1, name: "Foundry validation", external_id: `other-${i}`,
    head_sha: request.headSha, app: { id: 123 },
  }));
  const matches = await findCheckRuns({ ...request, appId: "123" }, async (url, init) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.github.com");
    assert.equal(parsed.pathname, `/repos/example-org/agent-repo/commits/${request.headSha}/check-runs`);
    assert.equal(parsed.searchParams.get("filter"), "all");
    assert.equal(parsed.searchParams.get("app_id"), "123");
    assert.equal(parsed.searchParams.get("check_name"), request.name);
    assert.equal(init.redirect, "error");
    const runs = parsed.searchParams.get("page") === "1" ? unrelated : [
      { id: 9007199254740991, name: request.name, external_id: request.externalId, head_sha: request.headSha, app: { id: 999 } },
      { id: 9007199254740992, name: request.name, external_id: request.externalId, head_sha: request.headSha, app: { id: 123 } },
    ];
    return reply(JSON.stringify({ total_count: 102, check_runs: runs }), 200);
  });
  assert.deepEqual(matches, ["9007199254740992"]);
});

test("reconciliation preserves duplicates and does not infer a safe create", async () => {
  const response = { total_count: 2, check_runs: [41, 42].map((id) => ({
    id, name: request.name, external_id: request.externalId, head_sha: request.headSha, app: { id: 123 },
  })) };
  assert.deepEqual(await findCheckRuns({ ...request, appId: "123" }, async () => reply(JSON.stringify(response), 200)), ["41", "42"]);
  assert.deepEqual(await findCheckRuns({ ...request, appId: "123" }, async () => reply('{"total_count":0,"check_runs":[]}', 200)), []);
});

test("reconciliation preserves exact large check and App identifiers", async () => {
  const body = '{"total_count":1,"check_runs":[{"id":9007199254740995,"name":"Foundry validation","external_id":"op-123","head_sha":"0123456789abcdef0123456789abcdef01234567","app":{"id":9007199254740993}}]}';
  assert.deepEqual(await findCheckRuns({ ...request, appId: "9007199254740993" }, async () => reply(body, 200)),
    ["9007199254740995"]);
});

test("reconciliation fails closed on invalid or incomplete provider responses", async () => {
  const invalid = async () => assert.fail("invalid inputs must not contact GitHub");
  await assert.rejects(findCheckRuns({ ...request, appId: "1/2" }, invalid));
  for (const body of [
    "not-json",
    '{"total_count":1,"check_runs":[]}',
    '{"total_count":1,"check_runs":[{"id":1}]}',
    '{"total_count":1001,"check_runs":[]}',
  ]) await assert.rejects(findCheckRuns({ ...request, appId: "123" }, async () => reply(body, 200)));
  await assert.rejects(findCheckRuns({ ...request, appId: "123" }, async () => { throw new Error("sensitive"); }),
    (error) => !error.message.includes("sensitive"));
  await assert.rejects(findCheckRuns({ ...request, appId: "123" }, async () => reply('{"message":"sensitive"}', 403)),
    (error) => error.message.includes("403") && !error.message.includes("sensitive"));
});

test("reconciliation rejects a changing list or repeated IDs across pages", async () => {
  const firstPage = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1, name: request.name, external_id: `other-${i}`,
    head_sha: request.headSha, app: null,
  }));
  for (const secondPage of [
    { total_count: 102, check_runs: [] },
    { total_count: 101, check_runs: [firstPage[0]] },
  ]) {
    let page = 0;
    await assert.rejects(findCheckRuns({ ...request, appId: "123" }, async () =>
      reply(JSON.stringify(++page === 1 ? { total_count: 101, check_runs: firstPage } : secondPage), 200)));
  }
});
