import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { testDatabaseUrl } from "../tests/integration/test-database.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

export function findPython(env, platform = process.platform, rootDir = root, exists = existsSync) {
  if (env.FOUNDRY_PYTHON) return env.FOUNDRY_PYTHON;
  const projectPython = platform === "win32"
    ? join(rootDir, ".venv", "Scripts", "python.exe")
    : join(rootDir, ".venv", "bin", "python");
  return exists(projectPython) ? projectPython : "python";
}

export function runChecks({ env = process.env, run = spawnSync } = {}) {
  testDatabaseUrl(env.TEST_DATABASE_URL ?? "");
  if (!env.npm_execpath) throw new Error("Run this command using npm run check.");
  const pythonExecutable = findPython(env);
  const childEnv = {
    ...env,
    FOUNDRY_PYTHON: pythonExecutable,
    PYTHONPATH: [join(root, "services", "control-plane", "src"), env.PYTHONPATH]
      .filter(Boolean).join(delimiter),
  };
  const npm = (args) => [process.execPath, [env.npm_execpath, "run", ...args]];
  const python = (args) => [pythonExecutable, args];
  const checks = [
    npm(["test:coverage"]),
    npm(["typecheck"]),
    npm(["validate", "--", "project", "examples/project.yaml"]),
    npm(["validate", "--", "task", "examples/task.yaml"]),
    python(["-m", "ruff", "check", "services/control-plane/src", "scripts/export-openapi.py", "tests/python", "tests/python_integration"]),
    python(["-m", "ruff", "format", "--check", "services/control-plane/src", "scripts/export-openapi.py", "tests/python", "tests/python_integration"]),
    python(["-m", "mypy", "--strict", "services/control-plane/src", "scripts/export-openapi.py"]),
    python(["scripts/export-openapi.py", "--check"]),
    python(["-m", "pytest", "-q", "tests/python", "tests/python_integration", "--cov=foundry_control_plane", "--cov-report=term-missing", "--cov-fail-under=95"]),
  ];
  for (const [command, args] of checks) {
    console.log(`\nRunning ${command} ${args.join(" ")}`);
    const result = run(command, args, { cwd: root, env: childEnv, stdio: "inherit" });
    if (result.error) {
      console.error(`Could not start ${command}. Check that it is installed and accessible.`);
      return 1;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = runChecks();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Developer checks failed.");
    process.exitCode = 1;
  }
}
