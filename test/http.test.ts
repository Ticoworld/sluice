import { afterEach, describe, expect, it, vi } from "vitest";
import { startSluiceHttpServer, type HttpSluice } from "../src/http/server.js";
import type { SluicePrepareInboundResult, SluiceProvePaymentResult, SluiceQuote, SluiceReadiness } from "../src/sdk/types.js";

function makeQuote(): SluiceQuote {
  return {
    target_payment: { shannons: "100000000", ckb: "1 CKB" },
    receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
    receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
    fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
    minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
    recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
    estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
    explanation: "quote",
  };
}

function makeReadiness(): SluiceReadiness {
  return {
    service_node: "node4",
    receiver_pubkey: "02receiver",
    service_node_pubkey: "02service",
    receiver_reachable: true,
    peer_connected: true,
    channel_ready: true,
    outbound_liquidity_sufficient: true,
    readiness_status: "ready",
    reason: "ready",
    recommended_quote: makeQuote(),
  };
}

function makePrepareResult(): SluicePrepareInboundResult {
  return {
    mode: "dry-run",
    plan: {
      service_node: "node4",
      receiver_node: "node5",
      receiver_pubkey: "02receiver",
      target_payment: { shannons: "100000000", ckb: "1 CKB" },
      opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
      receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
      readiness_satisfied: false,
      accept_mode: "detect",
      planned_steps: ["open", "accept"],
      readiness: makeReadiness(),
    },
  };
}

function makeProofResult(): SluiceProvePaymentResult {
  return {
    mode: "dry-run",
    plan: {
      service_node: "node4",
      receiver_node: "node5",
      receiver_pubkey: "02receiver",
      target_payment: { shannons: "100000000", ckb: "1 CKB" },
      quote: makeQuote(),
      invoice_currency: "Fibt",
      invoice_description: "phase 8 before/after payment proof",
      readiness_before: makeReadiness(),
      channel_plan: makePrepareResult().plan,
      planned_steps: ["create invoice"],
    },
  };
}

function createFakeSluice(overrides: Partial<HttpSluice> = {}): HttpSluice {
  return {
    quote: vi.fn(() => makeQuote()),
    checkReadiness: vi.fn(async () => makeReadiness()),
    prepareInbound: vi.fn(async () => makePrepareResult()),
    provePayment: vi.fn(async () => makeProofResult()),
    ...overrides,
  };
}

async function startTestServer(createSluice: (serviceRpcUrl: string) => HttpSluice = vi.fn(() => createFakeSluice()) as unknown as (serviceRpcUrl: string) => HttpSluice) {
  const server = await startSluiceHttpServer({ port: 0, createSluice });
  return {
    ...server,
    createSluice,
  };
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("HTTP API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health", async () => {
    const server = await startTestServer();
    try {
      const response = await fetch(`${server.url}/health`);
      const body = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(body).toEqual({ ok: true, service: "sluice", mode: "http" });
    } finally {
      await server.close();
    }
  });

  it("returns a reserve-aware quote", async () => {
    const createSluice = vi.fn(() => createFakeSluice());
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/quote`, { amountCkb: "1" });
      const body = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.quote.minimum_opener_funding.ckb).toBe("120 CKB");
      expect(body.quote.receiver_accept_funding.ckb).toBe("99 CKB");
      expect(createSluice).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });

  it("calls the readiness SDK path", async () => {
    const checkReadiness = vi.fn(async () => makeReadiness());
    const createSluice = vi.fn(() =>
      createFakeSluice({
        checkReadiness,
      }),
    );
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/readiness`, {
        serviceRpcUrl: "http://127.0.0.1:8257",
        receiverRpcUrl: "http://127.0.0.1:8287",
        amountCkb: "1",
      });
      const body = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.readiness.readiness_status).toBe("ready");
      expect(checkReadiness).toHaveBeenCalledWith({
        receiverRpcUrl: "http://127.0.0.1:8287",
        receiverPubkey: undefined,
        amountCkb: "1",
        amountShannons: undefined,
      });
    } finally {
      await server.close();
    }
  });

  it("defaults prepare to dry-run", async () => {
    const prepareInbound = vi.fn(async () => makePrepareResult());
    const createSluice = vi.fn(() =>
      createFakeSluice({
        prepareInbound,
      }),
    );
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/prepare`, {
        serviceRpcUrl: "http://127.0.0.1:8257",
        receiverRpcUrl: "http://127.0.0.1:8287",
        amountCkb: "1",
      });
      const body = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.prepare.mode).toBe("dry-run");
      expect(prepareInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          execute: false,
          yes: false,
          dryRun: true,
        }),
      );
    } finally {
      await server.close();
    }
  });

  it("rejects prepare execute without yes", async () => {
    const createSluice = vi.fn(() => createFakeSluice());
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/prepare`, {
        serviceRpcUrl: "http://127.0.0.1:8257",
        receiverRpcUrl: "http://127.0.0.1:8287",
        amountCkb: "1",
        execute: true,
      });
      const body = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(body).toEqual({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "execute=true requires yes=true",
        },
      });
      expect(createSluice).not.toHaveBeenCalledWith("http://127.0.0.1:8257");
    } finally {
      await server.close();
    }
  });

  it("defaults prove-payment to dry-run", async () => {
    const provePayment = vi.fn(async () => makeProofResult());
    const createSluice = vi.fn(() =>
      createFakeSluice({
        provePayment,
      }),
    );
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/prove-payment`, {
        serviceRpcUrl: "http://127.0.0.1:8257",
        receiverRpcUrl: "http://127.0.0.1:8287",
        amountCkb: "1",
      });
      const body = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.proof.mode).toBe("dry-run");
      expect(provePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          execute: false,
          yes: false,
          dryRun: true,
        }),
      );
    } finally {
      await server.close();
    }
  });

  it("rejects prove-payment execute without yes", async () => {
    const createSluice = vi.fn(() => createFakeSluice());
    const server = await startTestServer(createSluice);

    try {
      const response = await postJson(`${server.url}/v1/prove-payment`, {
        serviceRpcUrl: "http://127.0.0.1:8257",
        receiverRpcUrl: "http://127.0.0.1:8287",
        amountCkb: "1",
        execute: true,
      });
      const body = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(body).toEqual({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "execute=true requires yes=true",
        },
      });
    } finally {
      await server.close();
    }
  });

  it("returns a readable error for invalid body", async () => {
    const server = await startTestServer();

    try {
      const response = await postJson(`${server.url}/v1/quote`, {});
      const body = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("BAD_REQUEST");
    } finally {
      await server.close();
    }
  });

  it("returns a readable error for unknown routes", async () => {
    const server = await startTestServer();

    try {
      const response = await fetch(`${server.url}/v1/unknown`, { method: "POST" });
      const body = (await response.json()) as any;

      expect(response.status).toBe(404);
      expect(body).toEqual({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "No route for /v1/unknown.",
        },
      });
    } finally {
      await server.close();
    }
  });
});
