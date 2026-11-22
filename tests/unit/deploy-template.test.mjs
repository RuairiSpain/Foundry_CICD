import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parse } from "yaml";

test("release IDs are passed literally to the deploy script, not executed as shell code", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "foundry-deploy-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "scripts"));
  const script = join(directory, "scripts", "deploy-release.sh");
  await writeFile(script, "#!/bin/sh\nprintf '%s\\n' \"$@\" > arguments.txt\n");
  await chmod(script, 0o755);
  const template = parse(await readFile(new URL("../../templates/github/workflows/deploy.template.yml", import.meta.url), "utf8"));
  const step = template.jobs.deploy.steps.find((item) => item.name === "Deploy existing release");
  const release = "release-$(touch injected)";
  const inputs = { release_id: release, environment: "test" };
  const render = (text) => text
    .replace(/\$\{\{\s*inputs\.(release_id|environment)\s*\}\}/g, (_, key) => inputs[key])
    .replace(/\$\{\{\s*needs\.validate\.outputs\.environment\s*\}\}/g, inputs.environment);
  const env = Object.fromEntries(Object.entries(step.env ?? {}).map(([key, value]) => [key, render(value)]));
  const result = spawnSync("bash", ["-c", render(step.run)], {
    cwd: directory,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual((await readFile(join(directory, "arguments.txt"), "utf8")).trimEnd().split("\n"),
    ["--release", release, "--environment", "test"]);
  await assert.rejects(stat(join(directory, "injected")), { code: "ENOENT" });
});

test("deployment environment is validated before GitHub selects its protection rules", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "foundry-deploy-env-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const template = parse(await readFile(new URL("../../templates/github/workflows/deploy.template.yml", import.meta.url), "utf8"));
  assert.ok(template.jobs.validate, "the environment must be validated before the deploy job");
  assert.equal(template.jobs.deploy.needs, "validate");
  assert.equal(template.jobs.deploy.environment, "${{ needs.validate.outputs.environment }}");
  const step = template.jobs.validate.steps.find((item) => item.id === "environment");
  const output = join(directory, "output");
  for (const environment of ["development", "test", "production", "production\ninjected=true", "production-$(touch injected)"]) {
    await writeFile(output, "");
    const result = spawnSync("bash", ["-c", step.run], {
      cwd: directory, env: { ...process.env, TARGET_ENVIRONMENT: environment, GITHUB_OUTPUT: output }, encoding: "utf8",
    });
    if (["development", "test", "production"].includes(environment)) {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(await readFile(output, "utf8"), `environment=${environment}\n`);
    } else {
      assert.notEqual(result.status, 0);
      assert.equal(await readFile(output, "utf8"), "");
    }
  }
  await assert.rejects(stat(join(directory, "injected")), { code: "ENOENT" });
});

test("the incomplete deployment template fails closed before acquiring OIDC credentials", async () => {
  const template = parse(await readFile(new URL("../../templates/github/workflows/deploy.template.yml", import.meta.url), "utf8"));
  const guard = template.jobs.validate.steps.find((item) => item.name === "Block incomplete deployment");
  assert.ok(guard, "unfinished deployment must not obtain credentials");
  const result = spawnSync("bash", ["-c", guard.run], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not implemented/i);
});
