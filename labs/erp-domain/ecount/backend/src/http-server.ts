import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";

import { LruCache } from "../../../shared/structures/lru-cache";
import {
  type CreateInventoryDocumentCommand,
  InventoryDocumentValidationError,
  InventoryDocumentWorkflowService,
} from "./inventory-document-workflow";
import { LabHttpError, PostgresInventoryDocumentPort } from "./postgres-workflow-port";

const MAX_BODY_BYTES = 128 * 1024;

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_BODY_BYTES) {
      throw new LabHttpError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new LabHttpError(400, "INVALID_JSON", "JSON 요청이 필요합니다.");
  }
}

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function asCommand(body: Record<string, unknown>): CreateInventoryDocumentCommand {
  return {
    tenantId: String(body.tenantId ?? ""),
    type: body.type as CreateInventoryDocumentCommand["type"],
    idempotencyKey: String(body.idempotencyKey ?? ""),
    lines: Array.isArray(body.lines)
      ? body.lines.map(line => ({
          productId: String((line as Record<string, unknown>).productId ?? ""),
          quantity: Number((line as Record<string, unknown>).quantity),
          ...(typeof (line as Record<string, unknown>).unit === "string"
            ? { unit: (line as Record<string, unknown>).unit as string }
            : {}),
          ...(typeof (line as Record<string, unknown>).sourceLocationId === "string"
            ? { sourceLocationId: (line as Record<string, unknown>).sourceLocationId as string }
            : {}),
          ...(typeof (line as Record<string, unknown>).destinationLocationId === "string"
            ? { destinationLocationId: (line as Record<string, unknown>).destinationLocationId as string }
            : {}),
          ...(typeof (line as Record<string, unknown>).sourceDocumentLineId === "string"
            ? { sourceDocumentLineId: (line as Record<string, unknown>).sourceDocumentLineId as string }
            : {}),
        }))
      : [],
    ...(typeof body.sourceDocumentId === "string" ? { sourceDocumentId: body.sourceDocumentId } : {}),
  };
}

export function createErpLabHttpServer(connectionString: string): { server: Server; close: () => Promise<void> } {
  const port = new PostgresInventoryDocumentPort(connectionString);
  const workflow = new InventoryDocumentWorkflowService(port);
  const cache = new LruCache<string, { quantity: number }>(Number(process.env.ERP_LAB_LRU_CAPACITY ?? "0"));
  let cacheHits = 0;
  let cacheMisses = 0;
  const availabilityKey = (tenantId: string, productId: string, locationId: string) =>
    `${tenantId}:${productId}:${locationId}`;
  const invalidate = (document: { balances?: Array<Record<string, unknown>>; tenantId: string }) => {
    for (const balance of document.balances ?? [])
      cache.delete(availabilityKey(document.tenantId, String(balance.product_id), String(balance.location_id)));
  };
  const server = createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const segments = url.pathname.split("/").filter(Boolean);
      if (method === "GET" && url.pathname === "/healthz") {
        respond(response, 200, { ok: true });
        return;
      }
      if (method === "POST" && url.pathname === "/lab/erp/inventory-documents") {
        const document = await workflow.createDraft(asCommand(await readJson(request)));
        respond(response, 201, { document });
        return;
      }
      if (method === "GET" && url.pathname === "/lab/erp/inventory-availability") {
        const tenantId = url.searchParams.get("tenantId") ?? "";
        const productId = url.searchParams.get("productId") ?? "";
        const locationId = url.searchParams.get("locationId") ?? "";
        if (!tenantId || !productId || !locationId)
          throw new LabHttpError(400, "INVALID_AVAILABILITY_QUERY", "tenantId, productId, locationId가 필요합니다.");
        const key = availabilityKey(tenantId, productId, locationId);
        const cached = cache.get(key);
        if (cached) {
          cacheHits += 1;
          respond(response, 200, {
            availability: { tenantId, productId, locationId, quantity: cached.quantity },
            cache: "HIT",
          });
          return;
        }
        cacheMisses += 1;
        const availability = await port.getAvailability(tenantId, productId, locationId);
        cache.put(key, { quantity: availability.quantity });
        respond(response, 200, { availability, cache: "MISS" });
        return;
      }
      const documentId = segments[3];
      if (segments.slice(0, 3).join("/") !== "lab/erp/inventory-documents" || !documentId) {
        throw new LabHttpError(404, "ROUTE_NOT_FOUND", "요청 경로를 찾을 수 없습니다.");
      }
      if (method === "GET" && segments.length === 4) {
        const tenantId = url.searchParams.get("tenantId") ?? "";
        respond(response, 200, { document: await port.getDocument(documentId, tenantId) });
        return;
      }
      const body = await readJson(request);
      const tenantId = String(body.tenantId ?? "");
      if (method === "POST" && segments[4] === "confirm") {
        respond(response, 200, { document: await workflow.confirm(documentId, tenantId) });
        return;
      }
      if (method === "POST" && segments[4] === "post") {
        const document = await workflow.postConfirmed(documentId, tenantId);
        invalidate(await port.getDocument(document.id, tenantId));
        respond(response, 200, { document, cache: { hits: cacheHits, misses: cacheMisses } });
        return;
      }
      if (method === "POST" && segments[4] === "reverse") {
        const document = await port.reverse(documentId, tenantId, String(body.idempotencyKey ?? ""));
        invalidate(await port.getDocument(document.id, tenantId));
        respond(response, 201, {
          document,
          cache: { hits: cacheHits, misses: cacheMisses },
        });
        return;
      }
      throw new LabHttpError(404, "ROUTE_NOT_FOUND", "요청 경로를 찾을 수 없습니다.");
    } catch (error) {
      const responseError =
        error instanceof LabHttpError
          ? error
          : error instanceof InventoryDocumentValidationError
            ? new LabHttpError(400, "INVALID_DOCUMENT_INPUT", "전표 입력값을 확인해 주세요.")
            : new LabHttpError(500, "INTERNAL_ERROR", "서버 처리 중 오류가 발생했습니다.");
      respond(response, responseError.status, {
        code: responseError.code,
        message: responseError.message,
        ...(responseError.details ? { details: responseError.details } : {}),
      });
    }
  });
  return { server, close: () => port.close() };
}

if (process.argv[1]?.endsWith("http-server.ts")) {
  const connectionString = process.env.ERP_LAB_DSN;
  if (!connectionString) {
    throw new Error("ERP_LAB_DSN is required");
  }
  const port = Number(process.env.ERP_LAB_PORT ?? "55442");
  const app = createErpLabHttpServer(connectionString);
  app.server.listen(port, "127.0.0.1", () => process.stdout.write(`erp-lab-http listening on ${port}\n`));
  process.on("SIGTERM", () => app.server.close(() => void app.close()));
}
