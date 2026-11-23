import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = new URL("../../scripts/validate-config.mjs", import.meta.url);
const project = new URL("../../examples/project.yaml", import.meta.url);
const task = new URL("../../examples/task.yaml", import.meta.url);
const run = (...args) => spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: "utf8" });
const filename = (url) => fileURLToPath(url);

test("validates the documented project and task examples", () => {
  for (const [kind, path] of [["project", filename(project)], ["task", filename(task)]]) {
    const result = run(kind, path);
    assert.equal(result.status, 0, result.stderr);
  }
});

test("reports invalid YAML and schema errors without success", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "foundry-config-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const invalidYaml = join(dir, "bad.yaml");
  await writeFile(invalidYaml, "spec: [\n", "utf8");
  const syntax = run("project", invalidYaml);
  assert.notEqual(syntax.status, 0);
  assert.match(syntax.stderr, /yaml/i);
  const invalidProject = join(dir, "invalid.yaml");
  await writeFile(invalidProject, "apiVersion: foundryops.io/v1\n", "utf8");
  const invalid = run("project", invalidProject);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /invalid/i);
  const duplicate = join(dir, "duplicate.yaml");
  await writeFile(duplicate, "apiVersion: one\napiVersion: two\n", "utf8");
  const duplicateResult = run("project", duplicate);
  assert.notEqual(duplicateResult.status, 0);
  assert.match(duplicateResult.stderr, /yaml/i);
});

test("rejects unknown kinds and missing files", () => {
  assert.notEqual(run("unknown", filename(project)).status, 0);
  assert.notEqual(run("project", join(tmpdir(), "missing-foundry-project.yaml")).status, 0);
  assert.notEqual(run().status, 0);
});

test("reports excessive YAML aliases without exposing a stack trace", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "foundry-config-alias-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "aliases.yaml");
  await writeFile(file, `anchor: &item [value]\nitems: [${Array(101).fill("*item").join(", ")}]\n`);
  const result = run("project", file);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid yaml configuration/i);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});
