import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv from "ajv";
import { parse } from "yaml";

const schema = {
  type: "object",
  required: ["version", "updates"],
  additionalProperties: false,
  properties: {
    version: { const: 2 },
    updates: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        required: ["package-ecosystem", "directory", "schedule"],
        additionalProperties: false,
        properties: {
          "package-ecosystem": { enum: ["npm", "github-actions"] },
          directory: { const: "/" },
          schedule: {
            type: "object",
            required: ["interval"],
            additionalProperties: false,
            properties: { interval: { enum: ["daily", "weekly", "monthly"] } },
          },
        },
      },
    },
  },
};

test("Dependabot config schedules npm and GitHub Actions updates at the repository root", async () => {
  let source;
  try {
    source = await readFile(new URL("../../.github/dependabot.yml", import.meta.url), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") assert.fail("Dependabot configuration is missing");
    throw error;
  }
  const config = parse(source, { uniqueKeys: true });
  const validate = new Ajv().compile(schema);
  assert.ok(validate(config), JSON.stringify(validate.errors));
  assert.deepEqual(
    new Set(config.updates.map((update) => update["package-ecosystem"])),
    new Set(["npm", "github-actions"]),
  );
});
