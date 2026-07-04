import { describe, expect, it, vi, afterEach } from "vitest";
import { Sluice } from "../src/sdk/index.js";

const { mockEvaluateReadiness, mockPrepareInboundChannel, mockRunPaymentProof } = vi.hoisted(() => ({
  mockEvaluateReadiness: vi.fn(),
  mockPrepareInboundChannel: vi.fn(),
  mockRunPaymentProof: vi.fn(),
}));

vi.mock("../src/core/readiness.js", () => ({
  evaluateReadiness: mockEvaluateReadiness,
}));

vi.mock("../src/core/coordinator.js", () => ({
  prepareInboundChannel: mockPrepareInboundChannel,
}));

vi.mock("../src/core/proof.js", () => ({
  runPaymentProof: mockRunPaymentProof,
}));

function mockNodeInfoResponse(pubkey: string): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      jsonrpc: "2.0",
      id: 1,
      result: {
        version: "0.8.1",
        commit_hash: "b560023",
        pubkey,
        features: [],
        node_name: "nodeX",
        addresses: ["/ip4/127.0.0.1/tcp/9999"],
        chain_hash: "0xdead",
        open_channel_auto_accept_min_ckb_funding_amount: "0x2540be400",
        auto_accept_channel_ckb_funding_amount: "0x0",
        default_funding_lock_script: {},
        tlc_expiry_delta: "0xdbba00",
        tlc_min_value: "0x0",
        tlc_fee_proportional_millionths: "0x3e8",
        channel_count: "0x0",
        pending_channel_count: "0x0",
        peers_count: "0x0",
        udt_cfg_infos: [],
      },
    }),
  }) as unknown as typeof fetch;
}

describe("Sluice SDK", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns reserve-aware quote values", () => {
    const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });

    const quote = sluice.quote({ amountCkb: "1" });

    expect(quote.target_payment.ckb).toBe("1 CKB");
    expect(quote.receiver_reserve_required.ckb).toBe("99 CKB");
    expect(quote.receiver_accept_funding.ckb).toBe("99 CKB");
    expect(quote.recommended_opener_funding.ckb).toBe("120 CKB");
  });

  it("resolves the receiver pubkey from receiverRpcUrl for readiness checks", async () => {
    const fetchImpl = mockNodeInfoResponse("02receiver");
    const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257", fetchImpl });

    mockEvaluateReadiness.mockResolvedValue({
      service_node: "http://127.0.0.1:8257",
      receiver_pubkey: "02receiver",
      service_node_pubkey: "02service",
      receiver_reachable: true,
      peer_connected: true,
      channel_ready: false,
      outbound_liquidity_sufficient: false,
      readiness_status: "not_ready",
      reason: "not ready",
      recommended_quote: {
        target_payment: { shannons: "100000000", ckb: "1" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
        fee_headroom: { shannons: "2000000000", ckb: "20" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21" },
        explanation: "quoted",
      },
    });

    const result = await sluice.checkReadiness({
      receiverRpcUrl: "http://127.0.0.1:8287",
      amountCkb: "1",
    });

    expect(result.receiver_pubkey).toBe("02receiver");
    expect(mockEvaluateReadiness).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "http://127.0.0.1:8257",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8287",
      expect.objectContaining({
        body: expect.stringContaining('"method":"node_info","params":{}'),
      }),
    );
  });

  it("defaults prepareInbound to detect mode and does not mutate in dry-run mode", async () => {
    const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
    mockPrepareInboundChannel.mockResolvedValue({
      mode: "dry-run",
      plan: {
        service_node: "http://127.0.0.1:8257",
        receiver_node: "http://127.0.0.1:8287",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1" },
        opener_funding: { shannons: "12000000000", ckb: "120" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
        readiness_satisfied: false,
        accept_mode: "detect",
        planned_steps: ["open reserve-aware channel"],
        readiness: {
          service_node: "http://127.0.0.1:8257",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
            fee_headroom: { shannons: "2000000000", ckb: "20" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21" },
            explanation: "quoted",
          },
        },
      },
    });

    const result = await sluice.prepareInbound({
      receiverRpcUrl: "http://127.0.0.1:8287",
      receiverPubkey: "02receiver",
      amountCkb: "1",
    });

    expect(result.mode).toBe("dry-run");
    expect(result.plan.accept_mode).toBe("detect");
    expect(mockPrepareInboundChannel).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "http://127.0.0.1:8257",
        receiverNode: "http://127.0.0.1:8287",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      }),
      expect.objectContaining({
        execute: false,
        acceptMode: "detect",
      }),
    );
  });

  it("rejects execute without explicit yes confirmation", async () => {
    const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });

    await expect(
      sluice.prepareInbound({
        receiverRpcUrl: "http://127.0.0.1:8287",
        receiverPubkey: "02receiver",
        amountCkb: "1",
        execute: true,
      }),
    ).rejects.toThrow(/execute: true and yes: true/i);

    expect(mockPrepareInboundChannel).not.toHaveBeenCalled();
  });

  it("wraps a dry-run proof result cleanly", async () => {
    const sluice = new Sluice({ serviceRpcUrl: "http://127.0.0.1:8257" });
    mockRunPaymentProof.mockResolvedValue({
      mode: "dry-run",
      plan: {
        service_node: "http://127.0.0.1:8257",
        receiver_node: "http://127.0.0.1:8287",
        receiver_pubkey: "02receiver",
        target_payment: { shannons: "100000000", ckb: "1" },
        quote: {
          target_payment: { shannons: "100000000", ckb: "1" },
          receiver_reserve_required: { shannons: "9900000000", ckb: "99" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
          fee_headroom: { shannons: "2000000000", ckb: "20" },
          minimum_opener_funding: { shannons: "12000000000", ckb: "120" },
          recommended_opener_funding: { shannons: "12000000000", ckb: "120" },
          estimated_usable_liquidity: { shannons: "2100000000", ckb: "21" },
          explanation: "quoted",
        },
        invoice_currency: "Fibt",
        invoice_description: "phase 8 before/after payment proof",
        readiness_before: {
          service_node: "http://127.0.0.1:8257",
          receiver_pubkey: "02receiver",
          service_node_pubkey: "02service",
          receiver_reachable: false,
          peer_connected: false,
          channel_ready: false,
          outbound_liquidity_sufficient: false,
          readiness_status: "not_ready",
          reason: "not ready",
          recommended_quote: {
            target_payment: { shannons: "100000000", ckb: "1" },
            receiver_reserve_required: { shannons: "9900000000", ckb: "99" },
            receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
            fee_headroom: { shannons: "2000000000", ckb: "20" },
            minimum_opener_funding: { shannons: "12000000000", ckb: "120" },
            recommended_opener_funding: { shannons: "12000000000", ckb: "120" },
            estimated_usable_liquidity: { shannons: "2100000000", ckb: "21" },
            explanation: "quoted",
          },
        },
        channel_plan: {
          service_node: "http://127.0.0.1:8257",
          receiver_node: "http://127.0.0.1:8287",
          receiver_pubkey: "02receiver",
          target_payment: { shannons: "100000000", ckb: "1" },
          opener_funding: { shannons: "12000000000", ckb: "120" },
          receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
          readiness_satisfied: false,
          accept_mode: "detect",
          planned_steps: ["create invoice"],
          readiness: {
            service_node: "http://127.0.0.1:8257",
            receiver_pubkey: "02receiver",
            service_node_pubkey: "02service",
            receiver_reachable: false,
            peer_connected: false,
            channel_ready: false,
            outbound_liquidity_sufficient: false,
            readiness_status: "not_ready",
            reason: "not ready",
            recommended_quote: {
              target_payment: { shannons: "100000000", ckb: "1" },
              receiver_reserve_required: { shannons: "9900000000", ckb: "99" },
              receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
              fee_headroom: { shannons: "2000000000", ckb: "20" },
              minimum_opener_funding: { shannons: "12000000000", ckb: "120" },
              recommended_opener_funding: { shannons: "12000000000", ckb: "120" },
              estimated_usable_liquidity: { shannons: "2100000000", ckb: "21" },
              explanation: "quoted",
            },
          },
        },
        planned_steps: ["create invoice"],
      },
    } as never);

    const result = await sluice.provePayment({
      receiverRpcUrl: "http://127.0.0.1:8287",
      receiverPubkey: "02receiver",
      amountCkb: "1",
    });

    expect(result.mode).toBe("dry-run");
    expect(result.plan.channel_plan.accept_mode).toBe("detect");
    expect(mockRunPaymentProof).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "http://127.0.0.1:8257",
        receiverNode: "http://127.0.0.1:8287",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      }),
      expect.objectContaining({
        execute: false,
        acceptMode: "detect",
      }),
    );
  });
});
