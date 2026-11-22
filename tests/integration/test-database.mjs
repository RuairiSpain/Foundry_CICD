export function testDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
  const message = "TEST_DATABASE_URL must point to an isolated loopback PostgreSQL database without query parameters or fragments";
  if (!value || value.includes("?") || value.includes("#")) throw new Error(message);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || !url.pathname || url.pathname === "/") {
    throw new Error(message);
  }
  return value;
}
