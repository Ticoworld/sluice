import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Sluice } from "../sdk/sluice.js";
import type {
  AmountInput,
  CheckReadinessInput,
  PrepareInboundInput,
  ProvePaymentInput,
  SluicePrepareInboundResult,
  SluiceProvePaymentResult,
  SluiceQuote,
  SluiceReadiness,
} from "../sdk/types.js";
import {
  prepareRequestSchema,
  provePaymentRequestSchema,
  quoteRequestSchema,
  readinessRequestSchema,
  type PrepareRequest,
  type ProvePaymentRequest,
  type QuoteRequest,
  type ReadinessRequest,
} from "./types.js";

const DEFAULT_HOST = "127.0.0.1";
const QUOTE_SERVICE_RPC_URL = "http://127.0.0.1:0";
const MAX_BODY_BYTES = 1_048_576;

export interface HttpSluice {
  quote(input: AmountInput): SluiceQuote;
  checkReadiness(input: CheckReadinessInput): Promise<SluiceReadiness>;
  prepareInbound(input: PrepareInboundInput): Promise<SluicePrepareInboundResult>;
  provePayment(input: ProvePaymentInput): Promise<SluiceProvePaymentResult>;
}

export interface SluiceHttpOptions {
  host?: string;
  port: number;
  createSluice?: (serviceRpcUrl: string) => HttpSluice;
}

export interface SluiceHttpServer {
  server: Server;
  url: string;
  close(): Promise<void>;
}

class HttpApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpApiError";
    this.status = status;
    this.code = code;
  }
}

function defaultCreateSluice(serviceRpcUrl: string): HttpSluice {
  return new Sluice({ serviceRpcUrl });
}

function isHttpApiError(error: unknown): error is HttpApiError {
  return error instanceof HttpApiError;
}

function responsePayload(code: string, message: string) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > MAX_BODY_BYTES) {
      throw new HttpApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }
}

function ensureLiveMutationAllowed(execute: boolean | undefined, yes: boolean | undefined): void {
  if (execute && yes !== true) {
    throw new HttpApiError(400, "BAD_REQUEST", "execute=true requires yes=true");
  }
}

function parseQuoteRequest(body: unknown): QuoteRequest {
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpApiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  return parsed.data;
}

function parseReadinessRequest(body: unknown): ReadinessRequest {
  const parsed = readinessRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpApiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  return parsed.data;
}

function parsePrepareRequest(body: unknown): PrepareRequest {
  const parsed = prepareRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpApiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  return parsed.data;
}

function parseProvePaymentRequest(body: unknown): ProvePaymentRequest {
  const parsed = provePaymentRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpApiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  return parsed.data;
}

function createHandler(createSluice: (serviceRpcUrl: string) => HttpSluice) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? DEFAULT_HOST}`);

      if (req.method === "GET" && requestUrl.pathname === "/health") {
        sendJson(res, 200, {
          ok: true,
          service: "sluice",
          mode: "http",
        });
        return;
      }

      if (req.method !== "POST") {
        throw new HttpApiError(405, "METHOD_NOT_ALLOWED", `Method ${req.method ?? "UNKNOWN"} is not allowed.`);
      }

      const body = await readJsonBody(req);

      if (requestUrl.pathname === "/v1/quote") {
        const input = parseQuoteRequest(body);
        const quote = createSluice(QUOTE_SERVICE_RPC_URL).quote(input);
        sendJson(res, 200, {
          ok: true,
          quote,
        });
        return;
      }

      if (requestUrl.pathname === "/v1/readiness") {
        const input = parseReadinessRequest(body);
        const sluice = createSluice(input.serviceRpcUrl);
        const readiness = await sluice.checkReadiness({
          receiverRpcUrl: input.receiverRpcUrl,
          receiverPubkey: input.receiverPubkey,
          amountCkb: input.amountCkb,
          amountShannons: input.amountShannons,
        });

        sendJson(res, 200, {
          ok: true,
          readiness,
        });
        return;
      }

      if (requestUrl.pathname === "/v1/prepare") {
        const input = parsePrepareRequest(body);
        ensureLiveMutationAllowed(input.execute, input.yes);
        const execute = input.execute ?? false;
        const yes = input.yes ?? false;
        const sluice = createSluice(input.serviceRpcUrl);
        const prepare = await sluice.prepareInbound({
          receiverRpcUrl: input.receiverRpcUrl,
          receiverPubkey: input.receiverPubkey,
          amountCkb: input.amountCkb,
          amountShannons: input.amountShannons,
          acceptMode: input.acceptMode,
          execute,
          yes,
          dryRun: !execute,
          timeoutMs: input.timeoutMs,
          pollIntervalMs: input.pollIntervalMs,
        });

        sendJson(res, 200, {
          ok: true,
          prepare,
        });
        return;
      }

      if (requestUrl.pathname === "/v1/prove-payment") {
        const input = parseProvePaymentRequest(body);
        ensureLiveMutationAllowed(input.execute, input.yes);
        const execute = input.execute ?? false;
        const yes = input.yes ?? false;
        const sluice = createSluice(input.serviceRpcUrl);
        const proof = await sluice.provePayment({
          receiverRpcUrl: input.receiverRpcUrl,
          receiverPubkey: input.receiverPubkey,
          amountCkb: input.amountCkb,
          amountShannons: input.amountShannons,
          acceptMode: input.acceptMode,
          execute,
          yes,
          dryRun: !execute,
          timeoutMs: input.timeoutMs,
          pollIntervalMs: input.pollIntervalMs,
        });

        sendJson(res, 200, {
          ok: true,
          proof,
        });
        return;
      }

      throw new HttpApiError(404, "NOT_FOUND", `No route for ${requestUrl.pathname}.`);
    } catch (error) {
      if (isHttpApiError(error)) {
        sendJson(res, error.status, responsePayload(error.code, error.message));
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, responsePayload("INTERNAL_ERROR", message));
    }
  };
}

export function createSluiceHttpHandler(options: Pick<SluiceHttpOptions, "createSluice"> = {}): ReturnType<typeof createHandler> {
  return createHandler(options.createSluice ?? defaultCreateSluice);
}

export async function startSluiceHttpServer(options: SluiceHttpOptions): Promise<SluiceHttpServer> {
  const host = options.host ?? DEFAULT_HOST;
  const handler = createHandler(options.createSluice ?? defaultCreateSluice);
  const server = createServer(handler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine HTTP server address.");
  }

  const displayHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;

  return {
    server,
    url: `http://${displayHost}:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
