import { afterEach, describe, expect, it, vi } from "vitest";
import { runPaymentProof } from "../src/core/proof.js";
import type { ReadinessCheckResult } from "../src/core/readiness.js";

const { mockEvaluateReadiness, mockPrepareInboundChannel } = vi.hoisted(() => ({
  mockEvaluateReadiness: vi.fn(),
  mockPrepareInboundChannel: vi.fn(),
}));

vi.mock("../src/core/readiness.js", () => ({
  evaluateReadiness: mockEvaluateReadiness,
}));

vi.mock("../src/core/coordinator.js", () => ({
  prepareInboundChannel: mockPrepareInboundChannel,
}));

function makeReadiness(status: ReadinessCheckResult["readiness_status"]): ReadinessCheckResult {
  return {
    service_node: "node4",
    receiver_pubkey: "02receiver",
    service_node_pubkey: "02service",
    receiver_reachable: status === "ready",
    peer_connected: status === "ready",
    channel_ready: status === "ready",
    outbound_liquidity_sufficient: status === "ready",
    readiness_status: status,
    reason: status === "ready" ? "ready" : "not ready",
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
  };
}

function makePlan() {
  return {
    service_node: "node4",
    receiver_node: "node7",
    receiver_pubkey: "02receiver",
    target_payment: { shannons: "100000000", ckb: "1" },
    opener_funding: { shannons: "12000000000", ckb: "120" },
    receiver_accept_funding: { shannons: "9900000000", ckb: "99" },
    readiness_satisfied: false,
    planned_steps: ["create invoice", "attempt payment", "open channel", "retry payment"],
    readiness: makeReadiness("not_ready"),
  };
}

function makeClients() {
  return {
    service: {
      nodeInfo: vi.fn().mockResolvedValue({ pubkey: "02service" }),
      listPeers: vi.fn().mockResolvedValue({ peers: [{ pubkey: "02receiver", address: "/ip4/127.0.0.1/tcp/8278" }] }),
      listChannels: vi.fn().mockResolvedValue({ channels: [] }),
      openChannel: vi.fn().mockResolvedValue({ temporary_channel_id: "0xtemp" }),
      sendPayment: vi
        .fn()
        .mockResolvedValueOnce({
          payment_hash: "0xhash",
          status: "Failed",
          created_at: 1,
          last_updated_at: 1,
          failed_error: "no path found",
          fee: "0",
          custom_records: null,
          routers: [],
        })
        .mockResolvedValueOnce({
          payment_hash: "0xhash",
          status: "Success",
          created_at: 2,
          last_updated_at: 2,
          failed_error: null,
          fee: "0",
          custom_records: null,
          routers: [],
        }),
      getPayment: vi.fn().mockResolvedValue({
        payment_hash: "0xhash",
        status: "Success",
        created_at: 2,
        last_updated_at: 2,
        failed_error: null,
        fee: "0",
        custom_records: null,
        routers: [],
      }),
      listPayments: vi.fn().mockResolvedValue({ payments: [{ payment_hash: "0xhash" }], last_cursor: null }),
    },
    receiver: {
      nodeInfo: vi.fn().mockResolvedValue({ pubkey: "02receiver" }),
      listPeers: vi.fn().mockResolvedValue({ peers: [{ pubkey: "02service", address: "/ip4/127.0.0.1/tcp/8258" }] }),
      listChannels: vi.fn().mockResolvedValue({ channels: [] }),
      newInvoice: vi.fn().mockResolvedValue({
        invoice_address: "fibt1proof",
        invoice: { data: { payment_hash: "0xhash" } },
      }),
      getInvoice: vi.fn().mockResolvedValue({
        invoice_address: "fibt1proof",
        invoice: { data: { payment_hash: "0xhash" } },
        status: "Paid",
      }),
      acceptChannel: vi.fn(),
      listPendingChannels: vi.fn().mockResolvedValue({ channels: [] }),
    },
  };
}

describe("runPaymentProof", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a dry-run proof plan without mutating live methods", async () => {
    mockEvaluateReadiness.mockResolvedValue(makeReadiness("not_ready"));
    mockPrepareInboundChannel.mockResolvedValue({
      mode: "dry-run",
      plan: makePlan(),
    });

    const clients = makeClients();
    const result = await runPaymentProof(
      clients as never,
      {
        serviceNode: "node4",
        receiverNode: "node7",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: false },
    );

    expect(result.mode).toBe("dry-run");
    expect(result.plan.channel_plan.readiness_satisfied).toBe(false);
    expect(clients.receiver.newInvoice).not.toHaveBeenCalled();
    expect(clients.service.sendPayment).not.toHaveBeenCalled();
    expect(mockPrepareInboundChannel).toHaveBeenCalledTimes(1);
  });

  it("runs the before/after proof and returns ready when the retry succeeds", async () => {
    mockEvaluateReadiness
      .mockResolvedValueOnce(makeReadiness("not_ready"))
      .mockResolvedValueOnce(makeReadiness("ready"));
    mockPrepareInboundChannel
      .mockResolvedValueOnce({
        mode: "dry-run",
        plan: makePlan(),
      })
      .mockResolvedValueOnce({
        mode: "execute",
        plan: makePlan(),
        execution: {
          status: "ready",
          reason: "ChannelReady reached",
          temporary_channel_id: "0xtemp",
          channel_id: "0xchannel",
          manual_accept_attempted: true,
        },
      });

    const clients = makeClients();
    const result = await runPaymentProof(
      clients as never,
      {
        serviceNode: "node4",
        receiverNode: "node7",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 1_000, pollIntervalMs: 1 },
    );

    expect(result.execution?.status).toBe("ready");
    expect(result.execution?.before_payment.status).toBe("Failed");
    expect(result.execution?.after_payment.status).toBe("Success");
    expect(clients.receiver.newInvoice).toHaveBeenCalledTimes(1);
    expect(clients.service.sendPayment).toHaveBeenCalledTimes(2);
    expect(clients.receiver.getInvoice).toHaveBeenCalledWith("0xhash");
    expect(clients.service.listPayments).toHaveBeenCalledWith({ status: "Success" });
  });

  it("retries after-payment route errors until payment succeeds", async () => {
    mockEvaluateReadiness
      .mockResolvedValueOnce(makeReadiness("not_ready"))
      .mockResolvedValueOnce(makeReadiness("ready"));
    mockPrepareInboundChannel
      .mockResolvedValueOnce({
        mode: "dry-run",
        plan: makePlan(),
      })
      .mockResolvedValueOnce({
        mode: "execute",
        plan: makePlan(),
        execution: {
          status: "ready",
          reason: "ChannelReady reached",
          temporary_channel_id: "0xtemp",
          channel_id: "0xchannel",
          manual_accept_attempted: true,
        },
      });

    const clients = makeClients();
    clients.service.sendPayment = vi
      .fn()
      .mockResolvedValueOnce({
        payment_hash: "0xhash",
        status: "Failed",
        created_at: 1,
        last_updated_at: 1,
        failed_error: "no path found",
        fee: "0",
        custom_records: null,
        routers: [],
      })
      .mockRejectedValueOnce(new Error("Send payment error: Failed to build route, PathFind error: no path found"))
      .mockResolvedValueOnce({
        payment_hash: "0xhash",
        status: "Success",
        created_at: 2,
        last_updated_at: 2,
        failed_error: null,
        fee: "0",
        custom_records: null,
        routers: [],
      });

    const result = await runPaymentProof(
      clients as never,
      {
        serviceNode: "node4",
        receiverNode: "node7",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 1_000, pollIntervalMs: 1 },
    );

    expect(result.execution?.status).toBe("ready");
    expect(result.execution?.after_payment.status).toBe("Success");
    expect(clients.service.sendPayment).toHaveBeenCalledTimes(3);
  });

  it("rejects a proof run when the before-payment attempt succeeds unexpectedly", async () => {
    mockEvaluateReadiness.mockResolvedValue(makeReadiness("not_ready"));
    mockPrepareInboundChannel.mockResolvedValue({
      mode: "dry-run",
      plan: makePlan(),
    });

    const clients = makeClients();
    clients.service.sendPayment = vi.fn().mockResolvedValue({
      payment_hash: "0xhash",
      status: "Success",
      created_at: 1,
      last_updated_at: 1,
      failed_error: null,
      fee: "0",
      custom_records: null,
      routers: [],
    });

    const result = await runPaymentProof(
      clients as never,
      {
        serviceNode: "node4",
        receiverNode: "node7",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 1_000, pollIntervalMs: 1 },
    );

    expect(result.execution?.status).toBe("rpc_error");
    expect(result.execution?.reason).toMatch(/unexpectedly succeeded/i);
    expect(mockPrepareInboundChannel).toHaveBeenCalledTimes(1);
  });
});
