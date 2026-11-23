import assert from "node:assert/strict";
import { delimiter, join } from "node:path";
import test from "node:test";
import { findPython, runChecks } from "../../scripts/check.mjs";

test("developer checks use a project virtual environment unless Python is explicitly selected", () => {
  const root = "repo";
  assert.equal(findPython({ FOUNDRY_PYTHON: "chosen-python" }, "win32", root, () => true), "chosen-python");
  assert.equal(findPython({}, "win32", root, () => true), join(root, ".venv", "Scripts", "python.exe"));
  assert.equal(findPython({}, "linux", root, () => true), join(root, ".venv", "bin", "python"));
  assert.equal(findPython({}, "linux", root, () => false), "python");
});

test("developer checks run CI-equivalent local gates with the selected Python", () => {
  const calls = [];
  const env = {
    TEST_DATABASE_URL: "postgresql://test:test@127.0.0.1/test",
    FOUNDRY_PYTHON: "custom-python",
    PYTHONPATH: "existing",
    npm_execpath: "npm-cli.js",
  };
  assert.equal(runChecks({ env, run: (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0 };
  } }), 0);
  assert.deepEqual(calls.slice(0, 4).map(({ args }) => args.slice(1)), [
    ["run", "test:coverage"],
    ["run", "typecheck"],
    ["run", "validate", "--", "project", "examples/project.yaml"],
    ["run", "validate", "--", "task", "examples/task.yaml"],
  ]);
  assert.equal(calls.length, 9);
  assert.ok(calls.slice(4).every(({ command }) => command === "custom-python"));
  assert.equal(calls[0].options.env.FOUNDRY_PYTHON, "custom-python");
  assert.ok(calls[4].options.env.PYTHONPATH.endsWith(`${delimiter}existing`));
  assert.equal(calls[4].options.env.TEST_DATABASE_URL, env.TEST_DATABASE_URL);
});

test("developer checks stop immediately on failure and reject unsafe databases", () => {
  let count = 0;
  const run = () => { count += 1; return { status: 17 }; };
  assert.equal(runChecks({
    env: { TEST_DATABASE_URL: "postgresql://test:test@127.0.0.1/test", npm_execpath: "npm-cli.js" },
    run,
  }), 17);
  assert.equal(count, 1);
  assert.throws(() => runChecks({
    env: { TEST_DATABASE_URL: "postgresql://test:test@127.0.0.1/test?host=remote", npm_execpath: "npm-cli.js" },
    run,
  }), /loopback.*without.*query/i);
  assert.equal(count, 1);
});
