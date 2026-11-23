import { readBoundedBody } from "../github/read-bounded-body.ts";

type Access = "read" | "write";

export interface TokenRequest {
  installationId: string;
  repositoryId: string;
  appJwt: string;
  permissions: Record<string, Access>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function createRepositoryToken(
  request: TokenRequest,
  send: typeof fetch = fetch,
): Promise<{ token: string; expiresAt: string }> {
  if (
    !/^[1-9][0-9]{0,19}$/.test(request.installationId) ||
    !/^[1-9][0-9]{0,19}$/.test(request.repositoryId) ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(request.appJwt) ||
    !isRecord(request.permissions)
  ) throw new Error("Invalid installation token request.");
  const permissions = Object.entries(request.permissions);
  if (
    permissions.length === 0 ||
    permissions.some(([name, access]) => !/^[a-z][a-z0-9_]{0,63}$/.test(name) || !["read", "write"].includes(access))
  ) throw new Error("Explicit installation permissions are required.");

  let response: Response;
  try {
    response = await send(`https://api.github.com/app/installations/${request.installationId}/access_tokens`, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${request.appJwt}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: `{"repository_ids":[${request.repositoryId}],"permissions":${JSON.stringify(request.permissions)}}`,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error("GitHub installation token request failed.");
  }
  if (response.status !== 201) throw new Error(`GitHub installation token request failed (${response.status}).`);

  let result: unknown;
  try {
    result = JSON.parse(await readBoundedBody(response), (key: string, value: unknown, context?: { source?: string }) =>
      key === "id" && typeof value === "number" ? context?.source : value,
    );
  } catch {
    throw new Error("GitHub installation token response was invalid.");
  }
  if (
    !isRecord(result) || typeof result.token !== "string" || !/^[\x21-\x7e]+$/.test(result.token) ||
    typeof result.expires_at !== "string" || !Number.isFinite(Date.parse(result.expires_at)) ||
    Date.parse(result.expires_at) <= Date.now() || !isRecord(result.permissions) ||
    !Array.isArray(result.repositories) || result.repositories.length !== 1 ||
    !isRecord(result.repositories[0]) || result.repositories[0].id !== request.repositoryId
  ) throw new Error("GitHub installation token response did not match the requested scope.");
  const actualPermissions = result.permissions;
  for (const [name, access] of Object.entries(actualPermissions)) {
    if (name === "metadata" && access === "read" && !Object.hasOwn(request.permissions, name)) continue;
    if (!Object.hasOwn(request.permissions, name) || request.permissions[name] !== access) {
      throw new Error("GitHub installation token response did not match the requested permissions.");
    }
  }
  if (permissions.some(([name, access]) => actualPermissions[name] !== access)) {
    throw new Error("GitHub installation token response did not match the requested permissions.");
  }
  return { token: result.token, expiresAt: result.expires_at };
}
