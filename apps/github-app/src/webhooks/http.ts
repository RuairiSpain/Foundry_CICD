import { createServer, type IncomingMessage, type Server } from "node:http";
import { ingestWebhook, type WebhookInbox } from "./ingest.ts";

const maxBodyBytes = 25 * 1024 * 1024;

interface ServerOptions {
  secret: string;
  inbox: WebhookInbox;
  onError: (code: "request_read_failed" | "inbox_unavailable") => void;
}

function header(request: IncomingMessage, name: string): string | undefined {
  const values = request.headersDistinct[name];
  return values?.length === 1 ? values[0] : undefined;
}

function readBody(request: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= maxBodyBytes) chunks.push(chunk);
    });
    request.on("end", () => resolve(size <= maxBodyBytes ? Buffer.concat(chunks, size) : null));
    request.on("error", reject);
    request.on("aborted", () => reject(new Error("Request aborted.")));
  });
}

export function createWebhookServer(options: ServerOptions): Server {
  if (!options.secret) throw new Error("Webhook secret must not be empty.");
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/github/webhooks") {
      response.writeHead(404).end();
      return;
    }
    const contentType = header(request, "content-type");
    if (!contentType || contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
      response.writeHead(415).end();
      return;
    }
    let body: Buffer | null;
    try {
      body = await readBody(request);
    } catch {
      options.onError("request_read_failed");
      response.writeHead(400).end();
      return;
    }
    if (body === null) {
      response.writeHead(413).end();
      return;
    }
    try {
      const result = await ingestWebhook(options.secret, {
        body,
        signature: header(request, "x-hub-signature-256"),
        event: header(request, "x-github-event"),
        deliveryId: header(request, "x-github-delivery"),
      }, options.inbox);
      if (result.status !== "rejected") {
        response.writeHead(202).end();
      } else {
        const status = result.code === "invalid_signature" ? 401 : result.code === "delivery_conflict" ? 409 : 400;
        response.writeHead(status).end();
      }
    } catch {
      options.onError("inbox_unavailable");
      response.writeHead(503).end();
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  return server;
}
