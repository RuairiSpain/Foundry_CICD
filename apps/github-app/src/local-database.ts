export function localDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("DATABASE_URL is required.");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Local tools only accept a local PostgreSQL connection.");
  }
  const options = url.searchParams.getAll("options");
  if (
    url.hash || [...url.searchParams.keys()].some((key) => key !== "options") ||
    options.length > 1 || (options.length === 1 && !/^-c search_path=[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(options[0]))
  ) {
    throw new Error("Unsupported local database connection options.");
  }
  return value;
}
