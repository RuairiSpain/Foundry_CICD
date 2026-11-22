import assert from "node:assert/strict";
import test from "node:test";
import { getEnvironment } from "../../apps/github-app/src/github/environments.ts";

const request = { owner: "example-org", repository: "agent-repo", token: "ghs_local_test", environment: "Production/Europe" };
const reply = (body, status = 200) => new Response(body, { status });
const environment = '{"id":9007199254740993,"name":"Production/Europe","protection_rules":[{"type":"required_reviewers","prevent_self_review":true,"reviewers":[{"type":"Team","reviewer":{"id":9007199254740995}}]},{"type":"wait_timer","wait_timer":30}],"deployment_branch_policy":{"protected_branches":true,"custom_branch_policies":false}}';

test("inspects a GitHub environment without making a deployment decision", async () => {
  const result = await getEnvironment(request, async (url, init) => {
    assert.equal(url, "https://api.github.com/repos/example-org/agent-repo/environments/Production%2FEurope");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.authorization, "Bearer ghs_local_test");
    return reply(environment);
  });
  assert.deepEqual(result, {
    id: "9007199254740993", name: "Production/Europe",
    rules: [
      { type: "required_reviewers", preventSelfReview: true, reviewers: [{ type: "Team", id: "9007199254740995" }], waitTimer: null },
      { type: "wait_timer", preventSelfReview: null, reviewers: null, waitTimer: 30 },
    ],
    branchPolicy: { protectedBranches: true, customBranchPolicies: false },
  });
});

test("preserves missing protections as unknown rather than inventing a pass", async () => {
  const result = await getEnvironment(request, async () => reply('{"id":42,"name":"Production/Europe"}'));
  assert.equal(result.rules, null);
  assert.equal(result.branchPolicy, undefined);
  const unrestricted = await getEnvironment(request, async () =>
    reply('{"id":42,"name":"Production/Europe","protection_rules":[],"deployment_branch_policy":null}'));
  assert.deepEqual(unrestricted.rules, []);
  assert.equal(unrestricted.branchPolicy, null);
});

test("rejects unsafe request paths and invalid provider responses", async () => {
  const neverCalled = async () => assert.fail("invalid inputs must not contact GitHub");
  for (const change of [{ owner: "../wrong" }, { repository: ".." }, { environment: ".." }, { environment: "bad\nname" }, { environment: "\ud800" }, { token: "secret\n" }]) {
    await assert.rejects(getEnvironment({ ...request, ...change }, neverCalled));
  }
  for (const body of [
    "not-json",
    environment.replace('"name":"Production/Europe"', '"name":"Development"'),
    environment.replace('"prevent_self_review":true', '"prevent_self_review":"true"'),
    environment.replace('"id":9007199254740995', '"id":0'),
    environment.replace('"protected_branches":true', '"protected_branches":"true"'),
    "x".repeat(1024 * 1024 + 1),
  ]) await assert.rejects(getEnvironment(request, async () => reply(body)));
});

test("reports provider errors without leaking response bodies or tokens", async () => {
  await assert.rejects(getEnvironment(request, async () => reply('{"message":"sensitive"}', 404)),
    (error) => error.message.includes("404") && !error.message.includes("sensitive"));
  await assert.rejects(getEnvironment(request, async () => { throw new Error("sensitive"); }),
    (error) => !error.message.includes("sensitive"));
});
