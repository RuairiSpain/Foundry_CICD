import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

const schema = JSON.parse(await readFile(new URL("../../schemas/task.schema.json", import.meta.url), "utf8"));
const example = parse(await readFile(new URL("../../examples/task.yaml", import.meta.url), "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);

test("the documented task contract is valid", () => {
  assert.equal(validate(example), true, JSON.stringify(validate.errors));
});

test("task contracts explicitly declare forbidden paths and security considerations", () => {
  for (const field of ["forbiddenPaths", "security"]) {
    const task = structuredClone(example);
    delete task[field];
    assert.equal(validate(task), false, field);
  }
  const task = structuredClone(example);
  task.security = [];
  assert.equal(validate(task), false);
});

test("scope, inputs, checks, and evidence cannot contain blank entries", () => {
  for (const field of ["allowedPaths", "forbiddenPaths", "inputs", "requiredChecks", "completionEvidence", "security"]) {
    const task = structuredClone(example);
    task[field] = ["   "];
    assert.equal(validate(task), false, field);
  }
});

test("reviewers must name recognized agents", () => {
  const task = structuredClone(example);
  task.reviewAgents = ["not-an-agent"];
  assert.equal(validate(task), false);
});
