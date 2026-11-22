import { readBoundedBody } from "./read-bounded-body.ts";
import { isValidRepositoryScope, type RepositoryScope } from "./repository-scope.ts";

interface CheckScope extends RepositoryScope {
  name: string;
  headSha: string;
  externalId: string;
}

interface CompletedCheck extends CheckScope {
  checkId: string;
  conclusion: "action_required" | "cancelled" | "failure" | "neutral" | "success" | "skipped" | "timed_out";
  title: string;
  summary: string;
}

function validateScope(request: CheckScope): void {
  if (
    !isValidRepositoryScope(request) ||
    !/^[0-9a-f]{40}$/.test(request.headSha) ||
    typeof request.name !== "string" || !request.name.trim() || request.name.length > 255 ||
    typeof request.externalId !== "string" || !request.externalId.trim() || request.externalId.length > 255
  ) throw new Error("Invalid GitHub check request.");
}

async function mutateCheck(
  request: CheckScope, method: "POST" | "PATCH", suffix: string, body: object,
  expectedStatus: number, expectedState: string, expectedConclusion: string | null, send: typeof fetch,
): Promise<string> {
  const url = `https://api.github.com/repos/${request.owner}/${request.repository}/check-runs${suffix}`;
  let response: Response;
  try {
    response = await send(url, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${request.token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("GitHub check mutation outcome is unknown; reconcile before retrying.");
  }
  if (response.status !== expectedStatus) {
    throw new Error(`GitHub check mutation failed (${response.status}); reconcile before retrying.`);
  }

  let result: unknown;
  try {
    result = JSON.parse(await readBoundedBody(response), (key: string, value: unknown, context?: { source?: string }) =>
      key === "id" && typeof value === "number" ? context?.source : value,
    );
  } catch {
    throw new Error("GitHub check mutation response was invalid; reconcile before retrying.");
  }
  if (
    typeof result !== "object" || result === null || Array.isArray(result) ||
    !("id" in result) || typeof result.id !== "string" || !/^[1-9][0-9]{0,19}$/.test(result.id) ||
    !("head_sha" in result) || result.head_sha !== request.headSha ||
    !("external_id" in result) || result.external_id !== request.externalId ||
    !("name" in result) || result.name !== request.name ||
    !("status" in result) || result.status !== expectedState ||
    (method === "PATCH" && (!("conclusion" in result) || result.conclusion !== expectedConclusion)) ||
    (method === "PATCH" && suffix !== `/${result.id}`)
  ) throw new Error("GitHub check mutation response did not match the request; reconcile before retrying.");
  return result.id;
}

export async function createCheckRun(request: CheckScope, send: typeof fetch = fetch): Promise<string> {
  validateScope(request);
  return mutateCheck(request, "POST", "", {
    name: request.name, head_sha: request.headSha, external_id: request.externalId, status: "queued",
  }, 201, "queued", null, send);
}

export async function updateCheckRun(request: CompletedCheck, send: typeof fetch = fetch): Promise<string> {
  validateScope(request);
  if (
    !/^[1-9][0-9]{0,19}$/.test(request.checkId) ||
    !["action_required", "cancelled", "failure", "neutral", "success", "skipped", "timed_out"].includes(request.conclusion) ||
    typeof request.title !== "string" || !request.title.trim() || request.title.length > 255 ||
    typeof request.summary !== "string" || request.summary.length > 65535
  ) throw new Error("Invalid GitHub check result.");
  return mutateCheck(request, "PATCH", `/${request.checkId}`, {
    status: "completed", conclusion: request.conclusion, output: { title: request.title, summary: request.summary },
  }, 200, "completed", request.conclusion, send);
}

export async function findCheckRuns(
  request: CheckScope & { appId: string }, send: typeof fetch = fetch,
): Promise<string[]> {
  validateScope(request);
  if (!/^[1-9][0-9]{0,19}$/.test(request.appId)) throw new Error("Invalid GitHub App ID.");
  const found: string[] = [];
  const seen = new Set<string>();
  let total: number | undefined;
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`https://api.github.com/repos/${request.owner}/${request.repository}/commits/${request.headSha}/check-runs`);
    url.search = new URLSearchParams({
      check_name: request.name, app_id: request.appId, filter: "all", per_page: "100", page: String(page),
    }).toString();
    let response: Response;
    try {
      response = await send(url.toString(), {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${request.token}`,
          "x-github-api-version": "2022-11-28",
        },
        redirect: "error", signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new Error("GitHub check lookup failed.");
    }
    if (response.status !== 200) throw new Error(`GitHub check lookup failed (${response.status}).`);
    let result: unknown;
    try {
      result = JSON.parse(await readBoundedBody(response), (key: string, value: unknown, context?: { source?: string }) =>
        key === "id" && typeof value === "number" ? context?.source : value,
      );
    } catch {
      throw new Error("GitHub check lookup response was invalid.");
    }
    if (
      typeof result !== "object" || result === null || Array.isArray(result) ||
      !("total_count" in result) || typeof result.total_count !== "number" ||
      !Number.isSafeInteger(result.total_count) || result.total_count < 0 || result.total_count > 1000 ||
      (total !== undefined && result.total_count !== total) ||
      !("check_runs" in result) || !Array.isArray(result.check_runs) ||
      result.check_runs.length !== Math.min(100, result.total_count - (page - 1) * 100)
    ) throw new Error("GitHub check lookup response was incomplete or changed.");
    total = result.total_count;
    for (const run of result.check_runs as unknown[]) {
      if (
        typeof run !== "object" || run === null || Array.isArray(run) ||
        !("id" in run) || typeof run.id !== "string" || !/^[1-9][0-9]{0,19}$/.test(run.id) ||
        !("name" in run) || typeof run.name !== "string" ||
        !("head_sha" in run) || typeof run.head_sha !== "string" ||
        !("external_id" in run) || (typeof run.external_id !== "string" && run.external_id !== null) ||
        !("app" in run) || (run.app !== null && (
          typeof run.app !== "object" || Array.isArray(run.app) ||
          !("id" in run.app) || typeof run.app.id !== "string" || !/^[1-9][0-9]{0,19}$/.test(run.app.id)
        )) || seen.has(run.id)
      ) throw new Error("GitHub check lookup response was invalid or duplicated.");
      seen.add(run.id);
      if (
        run.name === request.name && run.head_sha === request.headSha &&
        run.external_id === request.externalId && run.app !== null &&
        typeof run.app === "object" && "id" in run.app && run.app.id === request.appId
      ) found.push(run.id);
    }
    if (seen.size === total) return found;
  }
  throw new Error("GitHub check lookup exceeded its page limit.");
}
