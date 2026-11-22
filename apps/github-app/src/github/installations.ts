import { readBoundedBody } from "./read-bounded-body.ts";

type Permission = "read" | "write" | "admin";

export interface InstallationSnapshot {
  installationId: string;
  appId: string;
  accountId: string;
  accountLogin: string;
  targetType: "User" | "Organization";
  repositorySelection: "all" | "selected";
  permissions: Record<string, Permission>;
  suspended: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getInstallation(
  request: { installationId: string; appId: string; appJwt: string },
  send: typeof fetch = fetch,
): Promise<InstallationSnapshot> {
  if (
    !/^[1-9][0-9]{0,19}$/.test(request.installationId) ||
    !/^[1-9][0-9]{0,19}$/.test(request.appId) ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(request.appJwt)
  ) throw new Error("Invalid installation inspection request.");
  let response: Response;
  try {
    response = await send(`https://api.github.com/app/installations/${request.installationId}`, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${request.appJwt}`,
        "x-github-api-version": "2022-11-28",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("GitHub installation inspection failed.");
  }
  if (response.status !== 200) throw new Error(`GitHub installation inspection failed (${response.status}).`);

  let result: unknown;
  try {
    result = JSON.parse(await readBoundedBody(response), (key: string, value: unknown, context?: { source?: string }) =>
      ["id", "app_id", "target_id"].includes(key) && typeof value === "number" ? context?.source : value,
    );
  } catch {
    throw new Error("GitHub installation inspection response was invalid.");
  }
  if (
    !isRecord(result) || result.id !== request.installationId || result.app_id !== request.appId ||
    !isRecord(result.account) || typeof result.account.id !== "string" ||
    !/^[1-9][0-9]{0,19}$/.test(result.account.id) || result.target_id !== result.account.id ||
    typeof result.account.login !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(result.account.login) ||
    (result.target_type !== "User" && result.target_type !== "Organization") ||
    result.account.type !== result.target_type ||
    (result.repository_selection !== "all" && result.repository_selection !== "selected") ||
    !isRecord(result.permissions) ||
    (result.suspended_at !== null && (
      typeof result.suspended_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(result.suspended_at) ||
      !Number.isFinite(Date.parse(result.suspended_at))
    ))
  ) throw new Error("GitHub installation inspection response did not match the requested App and installation.");
  const permissions: Record<string, Permission> = {};
  for (const [name, access] of Object.entries(result.permissions)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name) ||
      (access !== "read" && access !== "write" && access !== "admin")) {
      throw new Error("GitHub installation permission snapshot was invalid.");
    }
    permissions[name] = access;
  }
  return {
    installationId: request.installationId,
    appId: request.appId,
    accountId: result.account.id,
    accountLogin: result.account.login,
    targetType: result.target_type,
    repositorySelection: result.repository_selection,
    permissions,
    suspended: result.suspended_at !== null,
  };
}
