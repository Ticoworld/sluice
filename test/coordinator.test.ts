import { describe, expect, it, vi } from "vitest";
import { FiberRpcError } from "../src/rpc/client.js";
import type { Channel, ListPeersResult, NodeInfo } from "../src/rpc/types.js";
import { prepareInboundChannel, type CoordinatorClient, type CoordinatorRuntime } from "../src/core/coordinator.js";

function makeNodeInfo(pubkey: string): NodeInfo {
  return {
    version: "0.8.1",
    commit_hash: "b560023 2026-04-16",
    pubkey,
    features: [],
    node_name: null,
    addresses: [],
    chain_hash: "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606",
    open_channel_auto_accept_min_ckb_funding_amount: "0x2540be400",
    auto_accept_channel_ckb_funding_amount: "0x24e160300",
    default_funding_lock_script: {},
    tlc_expiry_delta: "0xdbba00",
    tlc_min_value: "0x0",
    tlc_fee_proportional_millionths: "0x3e8",
    channel_count: "0x0",
    pending_channel_count: "0x0",
    peers_count: "0x0",
    udt_cfg_infos: [],
  } as NodeInfo;
}

function makePeer(pubkey: string): ListPeersResult {
  return { peers: [{ pubkey, address: "/ip4/127.0.0.1/tcp/9999" }] };
}

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    channel_id: "0xchannel",
    is_public: false,
    is_acceptor: false,
    is_one_way: false,
    channel_outpoint: null,
    pubkey: "02counterparty",
    funding_udt_type_script: null,
    state: { state_name: "ChannelReady" },
    local_balance: "12000000000",
    offered_tlc_balance: "0",
    remote_balance: "9900000000",
    received_tlc_balance: "0",
    pending_tlcs: [],
    latest_commitment_transaction_hash: null,
    created_at: "1",
    enabled: true,
    tlc_expiry_delta: "0xdbba00",
    tlc_fee_proportional_millionths: "0x3e8",
    shutdown_transaction_hash: null,
    failure_detail: null,
    ...overrides,
  } as Channel;
}

function sequence<T>(values: T[]): () => Promise<T> {
  let index = 0;
  return async () => values[Math.min(index++, values.length - 1)];
}

function createRuntime(): CoordinatorRuntime {
  let now = 0;

  return {
    now: () => now,
    sleep: async (ms: number) => {
      now += ms;
    },
  };
}

function createClients(options?: {
  serviceNodeInfo?: NodeInfo;
  receiverNodeInfo?: NodeInfo;
  servicePeers?: ListPeersResult;
  serviceChannels?: Array<{ channels: Channel[] }>;
  receiverChannels?: Array<{ channels: Channel[] }>;
  receiverPending?: Array<{ channels: Channel[] }>;
  openResult?: Record<string, unknown>;
  acceptResult?: Record<string, unknown>;
  openError?: Error;
  acceptError?: Error;
}): { service: CoordinatorClient; receiver: CoordinatorClient } {
  const service = {
    nodeInfo: vi.fn().mockResolvedValue(options?.serviceNodeInfo ?? makeNodeInfo("02service")),
    listPeers: vi.fn().mockResolvedValue(options?.servicePeers ?? { peers: [] }),
    listChannels: vi.fn().mockImplementation(sequence(options?.serviceChannels ?? [{ channels: [] }])),
    openChannel: options?.openError
      ? vi.fn().mockRejectedValue(options.openError)
      : vi.fn().mockResolvedValue(options?.openResult ?? { temporary_channel_id: "0xopener-temp" }),
  };

  const receiver = {
    nodeInfo: vi.fn().mockResolvedValue(options?.receiverNodeInfo ?? makeNodeInfo("02receiver")),
    listPeers: vi.fn().mockResolvedValue({ peers: [] }),
    listChannels: vi.fn().mockImplementation(sequence(options?.receiverChannels ?? [{ channels: [] }])),
    listPendingChannels: vi
      .fn()
      .mockImplementation(sequence(options?.receiverPending ?? [{ channels: [] }])),
    acceptChannel: options?.acceptError
      ? vi.fn().mockRejectedValue(options.acceptError)
      : vi.fn().mockResolvedValue(options?.acceptResult ?? { channel_id: "0xaccepted" }),
  };

  return {
    service: service as unknown as CoordinatorClient,
    receiver: receiver as unknown as CoordinatorClient,
  };
}

describe("prepareInboundChannel", () => {
  it("returns a dry-run plan and does not call open_channel", async () => {
    const clients = createClients({
      servicePeers: makePeer("02receiver"),
      serviceChannels: [{ channels: [makeChannel({ pubkey: "02receiver" })] }],
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: false },
      createRuntime(),
    );

    expect(result.mode).toBe("dry-run");
    expect(result.plan.readiness_satisfied).toBe(true);
    expect(result.plan.planned_steps[0]).toMatch(/already ready/i);
    expect(clients.service.openChannel).not.toHaveBeenCalled();
  });

  it("does not open a new channel when readiness is already satisfied in execute mode", async () => {
    const clients = createClients({
      servicePeers: makePeer("02receiver"),
      serviceChannels: [{ channels: [makeChannel({ pubkey: "02receiver" })] }],
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true },
      createRuntime(),
    );

    expect(result.mode).toBe("execute");
    expect(result.execution?.status).toBe("ready");
    expect(clients.service.openChannel).not.toHaveBeenCalled();
    expect(clients.receiver.acceptChannel).not.toHaveBeenCalled();
  });

  it("delayed ChannelReady succeeds before timeout when the expected pending temp id appears", async () => {
    const clients = createClients({
      serviceNodeInfo: makeNodeInfo("02service"),
      servicePeers: makePeer("02receiver"),
      serviceChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02receiver", channel_id: "0xready-service" })] },
      ],
      receiverPending: [
        { channels: [makeChannel({ pubkey: "02service", channel_id: "0xopener-temp" })] },
        { channels: [] },
      ],
      receiverChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02service", channel_id: "0xready-receiver" })] },
      ],
      openResult: { temporary_channel_id: "0xopener-temp" },
      acceptResult: { channel_id: "0xaccepted" },
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("ready");
    expect(clients.service.openChannel).toHaveBeenCalledTimes(1);
    expect(clients.receiver.acceptChannel).toHaveBeenCalledWith({
      temporary_channel_id: "0xopener-temp",
      funding_amount: 9_900_000_000n,
    });
  });

  it("ignores unrelated pending channels and still returns ready when ChannelReady appears", async () => {
    const clients = createClients({
      serviceNodeInfo: makeNodeInfo("02service"),
      servicePeers: makePeer("02receiver"),
      serviceChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02receiver", channel_id: "0xready-service" })] },
      ],
      receiverPending: [{ channels: [makeChannel({ pubkey: "02service", channel_id: "0xother-temp" })] }],
      receiverChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02service", channel_id: "0xready-receiver" })] },
      ],
      openResult: { temporary_channel_id: "expected-temp" },
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("ready");
    expect(result.execution?.reason).toMatch(/ChannelReady/i);
    expect(clients.receiver.acceptChannel).not.toHaveBeenCalled();
    expect(clients.service.openChannel).toHaveBeenCalledTimes(1);
  });

  it("returns ready when ChannelReady appears during the final timeout check", async () => {
    const readyServiceChannel = makeChannel({ pubkey: "02receiver", channel_id: "0xready-service" });
    const readyReceiverChannel = makeChannel({
      pubkey: "02service",
      channel_id: "0xready-receiver",
      is_acceptor: true,
      local_balance: "0",
      remote_balance: "12000000000",
    });

    const clients = createClients({
      serviceNodeInfo: makeNodeInfo("02service"),
      servicePeers: makePeer("02receiver"),
      serviceChannels: [{ channels: [] }, { channels: [readyServiceChannel] }],
      receiverPending: [
        { channels: [makeChannel({ pubkey: "02service", channel_id: "0xopener-temp" })] },
        { channels: [] },
      ],
      receiverChannels: [{ channels: [] }, { channels: [readyReceiverChannel] }],
      openResult: { temporary_channel_id: "0xopener-temp" },
      acceptResult: { channel_id: "0xaccepted" },
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 1, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("ready");
    expect(result.execution?.reason).toMatch(/final timeout check/i);
    expect(clients.receiver.acceptChannel).toHaveBeenCalledTimes(1);
  });

  it("reaches ChannelReady without manual accept when auto-accept happens", async () => {
    const clients = createClients({
      serviceNodeInfo: makeNodeInfo("02service"),
      servicePeers: makePeer("02receiver"),
      serviceChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02receiver", channel_id: "0xready-service" })] },
      ],
      receiverPending: [{ channels: [] }],
      receiverChannels: [
        { channels: [] },
        { channels: [makeChannel({ pubkey: "02service", channel_id: "0xready-receiver" })] },
      ],
      openResult: { temporary_channel_id: "0xopener-temp" },
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("ready");
    expect(clients.receiver.acceptChannel).not.toHaveBeenCalled();
  });

  it("prefers live ready channels over stale aborted history", async () => {
    const staleServiceChannel = makeChannel({
      pubkey: "02receiver",
      state: { state_name: "Closed", state_flags: "FUNDING_ABORTED" },
      failure_detail: "Funding transaction aborted",
    });

    const staleReceiverChannel = makeChannel({
      pubkey: "02service",
      state: { state_name: "Closed", state_flags: "FUNDING_ABORTED" },
      failure_detail: "Funding transaction aborted",
    });

    const readyServiceChannel = makeChannel({ pubkey: "02receiver", channel_id: "0xready-service" });
    const readyReceiverChannel = makeChannel({
      pubkey: "02service",
      channel_id: "0xready-receiver",
      is_acceptor: true,
      local_balance: "0",
      remote_balance: "12000000000",
    });

    const clients = createClients({
      serviceNodeInfo: makeNodeInfo("02service"),
      servicePeers: makePeer("02receiver"),
      serviceChannels: [
        { channels: [staleServiceChannel] },
        { channels: [staleServiceChannel, readyServiceChannel] },
      ],
      receiverPending: [{ channels: [] }, { channels: [] }],
      receiverChannels: [
        { channels: [staleReceiverChannel] },
        { channels: [staleReceiverChannel, readyReceiverChannel] },
      ],
      openResult: { temporary_channel_id: "0xopener-temp" },
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("ready");
    expect(clients.receiver.acceptChannel).not.toHaveBeenCalled();
  });

  it("returns funding_aborted when the channel enters an aborted state", async () => {
    const abortedServiceChannel = makeChannel({
      pubkey: "02receiver",
      state: { state_name: "FundingAborted" },
      failure_detail: "funding aborted",
    });

    const abortedReceiverChannel = makeChannel({
      pubkey: "02service",
      state: { state_name: "FundingAborted" },
      failure_detail: "funding aborted",
    });

    const clients = createClients({
      serviceChannels: [{ channels: [] }, { channels: [abortedServiceChannel] }],
      receiverPending: [{ channels: [] }],
      receiverChannels: [{ channels: [] }, { channels: [abortedReceiverChannel] }],
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("funding_aborted");
    expect(result.execution?.reason).toMatch(/funding-aborted|closed/i);
  });

  it("returns timeout_not_ready when no ChannelReady or failure state appears", async () => {
    const clients = createClients({
      serviceChannels: [{ channels: [] }, { channels: [] }],
      receiverPending: [{ channels: [] }, { channels: [] }],
      receiverChannels: [{ channels: [] }, { channels: [] }],
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 1, pollIntervalMs: 1 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("timeout_not_ready");
  });

  it("surfaces RPC errors clearly", async () => {
    const clients = createClients({
      openError: new FiberRpcError(-1, "boom"),
    });

    const result = await prepareInboundChannel(
      clients,
      {
        serviceNode: "node4",
        receiverNode: "node3",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
      { execute: true, timeoutMs: 5_000, pollIntervalMs: 0 },
      createRuntime(),
    );

    expect(result.execution?.status).toBe("rpc_error");
    expect(result.execution?.reason).toMatch(/boom/);
  });
});
