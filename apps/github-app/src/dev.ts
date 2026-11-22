import { pathToFileURL } from "node:url";
import { startLocalGateway } from "./local-gateway.ts";

export async function main(): Promise<Awaited<ReturnType<typeof startLocalGateway>>> {
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.WEBHOOK_SECRET;
  const portText = process.env.PORT ?? "3000";
  if (!databaseUrl || !secret || !/^\d{1,5}$/.test(portText) || Number(portText) > 65535) {
    throw new Error("DATABASE_URL, WEBHOOK_SECRET and a valid PORT are required.");
  }
  const gateway = await startLocalGateway({ databaseUrl, secret, port: Number(portText) });
  const shutdown = () => {
    void gateway.close().catch(() => {
      console.error("Local gateway shutdown failed.");
      process.exitCode = 1;
    });
  };
  const close = gateway.close;
  gateway.close = () => {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
    return close();
  };
  gateway.server.on("error", () => {
    console.error("Local gateway server failed.");
    process.exitCode = 1;
    shutdown();
  });
  console.log(gateway.address);
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return gateway;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("Local gateway startup failed; check configuration and database migrations.");
    process.exitCode = 1;
  });
}
