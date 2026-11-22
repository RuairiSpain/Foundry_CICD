import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

const schema = JSON.parse(await readFile(new URL("../../schemas/project.schema.json", import.meta.url), "utf8"));
const example = parse(await readFile(new URL("../../examples/project.yaml", import.meta.url), "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);

test("the documented project example is valid", () => {
  assert.equal(validate(example), true, JSON.stringify(validate.errors));
});

test("each required environment must occur exactly once", () => {
  const project = structuredClone(example);
  project.spec.environments[1].name = "dev";
  assert.equal(validate(project), false);
});

test("project paths cannot traverse or use ambiguous dot segments", () => {
  for (const path of ["..", "../outside", "agents/../../outside", "agents/./app"]) {
    const project = structuredClone(example);
    project.metadata.path = path;
    assert.equal(validate(project), false, path);
  }
});

test("normal nested project paths remain valid", () => {
  const project = structuredClone(example);
  project.metadata.path = "agents/my-agent";
  assert.equal(validate(project), true, JSON.stringify(validate.errors));
});

test("production configuration cannot switch off the hardened security tier", () => {
  for (const tier of ["flexible", "hardening-preview"]) {
    const project = structuredClone(example);
    project.spec.environments[2].securityTier = tier;
    assert.equal(validate(project), false, tier);
  }
});

test("agent source must remain a repository-relative path", () => {
  for (const source of ["../outside", "agents/../../outside", "agents/./app", "/etc/passwd", "C:\\outside", "https://example.com/agent"]) {
    const project = structuredClone(example);
    project.spec.agent.source = source;
    assert.equal(validate(project), false, source);
  }
  const project = structuredClone(example);
  project.spec.agent.source = "agents/my-agent";
  assert.equal(validate(project), true, JSON.stringify(validate.errors));
});
