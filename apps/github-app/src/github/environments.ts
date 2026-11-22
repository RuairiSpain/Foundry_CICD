import { readBoundedBody } from "./read-bounded-body.ts";
import { isValidRepositoryScope, type RepositoryScope } from "./repository-scope.ts";

interface EnvironmentRule {
  type: string;
  preventSelfReview: boolean | null;
  reviewers: { type: "User" | "Team"; id: string }[] | null;
  waitTimer: number | null;
}

export interface EnvironmentSnapshot {
  id: string;
  name: string;
  rules: EnvironmentRule[] | null;
  branchPolicy: { protectedBranches: boolean; customBranchPolicies: boolean } | null | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRule(rule: unknown): EnvironmentRule {
  if (!isRecord(rule) || typeof rule.type !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(rule.type) ||
    (rule.prevent_self_review != null && typeof rule.prevent_self_review !== "boolean") ||
    (rule.wait_timer != null && (!Number.isInteger(rule.wait_timer) || typeof rule.wait_timer !== "number" ||
      rule.wait_timer < 0 || rule.wait_timer > 43200)) ||
    (rule.reviewers != null && (!Array.isArray(rule.reviewers) || rule.reviewers.length > 6))
  ) throw new Error("GitHub environment protection rule was invalid.");
  let reviewers: EnvironmentRule["reviewers"] = null;
  if (Array.isArray(rule.reviewers)) {
    reviewers = rule.reviewers.map((entry: unknown) => {
      if (!isRecord(entry) || (entry.type !== "User" && entry.type !== "Team") ||
        !isRecord(entry.reviewer) || typeof entry.reviewer.id !== "string" ||
        !/^[1-9][0-9]{0,19}$/.test(entry.reviewer.id)
      ) throw new Error("GitHub environment reviewer was invalid.");
      return { type: entry.type, id: entry.reviewer.id };
    });
  }
  return {
    type: rule.type,
    preventSelfReview: typeof rule.prevent_self_review === "boolean" ? rule.prevent_self_review : null,
    reviewers,
    waitTimer: typeof rule.wait_timer === "number" ? rule.wait_timer : null,
  };
}

export async function getEnvironment(
  request: RepositoryScope & { environment: string }, send: typeof fetch = fetch,
): Promise<EnvironmentSnapshot> {
  if (!isValidRepositoryScope(request) || typeof request.environment !== "string" ||
    !request.environment.trim() || request.environment.length > 255 ||
    /[\x00-\x1f\x7f]/.test(request.environment) || [".", ".."].includes(request.environment)
  ) throw new Error("Invalid environment inspection request.");
  let encodedEnvironment: string;
  try {
    encodedEnvironment = encodeURIComponent(request.environment);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    throw new Error("Invalid environment inspection request.");
  }
  const url = `https://api.github.com/repos/${request.owner}/${request.repository}/environments/${encodedEnvironment}`;
  let response: Response;
  try {
    response = await send(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${request.token}`,
        "x-github-api-version": "2022-11-28",
      },
      redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("GitHub environment inspection failed.");
  }
  if (response.status !== 200) throw new Error(`GitHub environment inspection failed (${response.status}).`);
  let result: unknown;
  try {
    result = JSON.parse(await readBoundedBody(response), (key: string, value: unknown, context?: { source?: string }) =>
      key === "id" && typeof value === "number" ? context?.source : value,
    );
  } catch {
    throw new Error("GitHub environment inspection response was invalid.");
  }
  if (
    !isRecord(result) || typeof result.id !== "string" || !/^[1-9][0-9]{0,19}$/.test(result.id) ||
    typeof result.name !== "string" || result.name.toLowerCase() !== request.environment.toLowerCase() ||
    (result.protection_rules != null && !Array.isArray(result.protection_rules))
  ) throw new Error("GitHub environment inspection response did not match the request.");
  let branchPolicy: EnvironmentSnapshot["branchPolicy"];
  if (result.deployment_branch_policy === null) {
    branchPolicy = null;
  } else if (result.deployment_branch_policy !== undefined) {
    const policy = result.deployment_branch_policy;
    if (!isRecord(policy) || typeof policy.protected_branches !== "boolean" ||
      typeof policy.custom_branch_policies !== "boolean" ||
      policy.protected_branches === policy.custom_branch_policies
    ) throw new Error("GitHub environment branch policy was invalid.");
    branchPolicy = { protectedBranches: policy.protected_branches, customBranchPolicies: policy.custom_branch_policies };
  }
  return {
    id: result.id, name: result.name,
    rules: Array.isArray(result.protection_rules) ? result.protection_rules.map(parseRule) : null,
    branchPolicy,
  };
}
