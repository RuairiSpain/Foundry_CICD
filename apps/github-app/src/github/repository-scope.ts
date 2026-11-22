export interface RepositoryScope {
  owner: string;
  repository: string;
  token: string;
}

export function isValidRepositoryScope(scope: RepositoryScope): boolean {
  return typeof scope.owner === "string" && /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(scope.owner) &&
    typeof scope.repository === "string" && /^[A-Za-z0-9_.-]{1,100}$/.test(scope.repository) &&
    ![".", ".."].includes(scope.repository) &&
    typeof scope.token === "string" && /^[\x21-\x7e]{1,2048}$/.test(scope.token);
}
