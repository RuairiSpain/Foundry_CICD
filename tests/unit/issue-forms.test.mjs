import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";

async function loadForm(name) {
  const url = new URL(`../../.github/ISSUE_TEMPLATE/${name}.yml`, import.meta.url);
  let source;
  try {
    source = await readFile(url, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") assert.fail(`${name} issue form is missing`);
    throw error;
  }
  return parse(source, { uniqueKeys: true });
}

function requiredField(form, label, types = ["input", "textarea"]) {
  const field = form.body.find((item) => types.includes(item.type) && label.test(item.attributes?.label ?? ""));
  assert.ok(field, `missing field matching ${label}`);
  assert.equal(field.validations?.required, true, `${field.attributes.label} must be required`);
  return field;
}

for (const name of ["feature", "bug", "deployment"]) {
  test(`${name} is a parseable GitHub issue form with usable controls`, async () => {
    const form = await loadForm(name);
    assert.ok(typeof form.name === "string" && form.name.trim());
    assert.ok(typeof form.description === "string" && form.description.trim());
    assert.ok(Array.isArray(form.body) && form.body.length > 0);
    const ids = new Set();
    for (const item of form.body) {
      assert.ok(["markdown", "input", "textarea", "dropdown", "checkboxes"].includes(item.type));
      assert.ok(item.attributes && typeof item.attributes === "object");
      if (item.type === "markdown") {
        assert.ok(typeof item.attributes.value === "string" && item.attributes.value.trim());
      } else {
        assert.ok(typeof item.id === "string" && item.id);
        assert.ok(!ids.has(item.id), `duplicate field id: ${item.id}`);
        ids.add(item.id);
        assert.ok(typeof item.attributes.label === "string" && item.attributes.label.trim());
      }
    }
  });
}

test("feature intake requires the problem and expected outcome or acceptance criteria", async () => {
  const form = await loadForm("feature");
  requiredField(form, /problem/i);
  requiredField(form, /outcome|acceptance/i);
});

test("bug intake requires reproduction, expected and actual behavior, and impact", async () => {
  const form = await loadForm("bug");
  requiredField(form, /reproduc/i);
  requiredField(form, /expected/i);
  requiredField(form, /actual/i);
  requiredField(form, /impact/i);
});

test("deployment intake requires a release and an explicit Stage or Production selection", async () => {
  const form = await loadForm("deployment");
  requiredField(form, /release/i);
  const environment = requiredField(form, /environment/i, ["dropdown"]);
  assert.deepEqual(new Set(environment.attributes.options), new Set(["Stage", "Production"]));
  assert.equal(environment.attributes.multiple ?? false, false);
  assert.equal(environment.attributes.default, undefined);
});

test("deployment intake explains that submitting an issue neither deploys nor authorizes deployment", async () => {
  const form = await loadForm("deployment");
  const text = form.body.filter((item) => item.type === "markdown").map((item) => item.attributes.value).join(" ");
  assert.match(text, /does not deploy/i);
  assert.match(text, /does not authori[sz]e/i);
});
