import { afterEach, describe, expect, it, vi } from "vitest";
import { runDoctor, type DoctorClients } from "../src/core/doctor.js";
import type { CoordinatorClient } from "../src/core/coordinator.js";
import type { Channel, ListChannelsResult, ListPeersResult, NodeInfo } from "../src/rpc/types.js";

const { mockEvaluateReadiness } = vi.hoisted(() => ({
  mockEvaluateReadiness: vi.fn(),
}));

vi.mock("../src/core/readiness.js", () => ({
  evaluateReadiness: mockEvaluateReadiness,
}));

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
    channel_count: "0x1",
    pending_channel_count: "0x0",
    peers_count: "0x1",
    udt_cfg_infos: [],
  } as NodeInfo;
}

function makePeers(pubkey: string): ListPeersResult {
  return {
    peers: [{ pubkey, address: "/ip4/127.0.0.1/tcp/9999" }],
  };
}

function makeChannel(pubkey: string): Channel {
  return {
    channel_id: "0xchannel",
    is_public: false,
    is_acceptor: false,
    is_one_way: false,
    channel_outpoint: null,
    pubkey,
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
  } as Channel;
}

function createClients(options?: {
  serviceNodeInfo?: NodeInfo | Error;
  receiverNodeInfo?: NodeInfo | Error;
  servicePeers?: ListPeersResult | Error;
  serviceChannels?: ListChannelsResult | Error;
  receiverChannels?: ListChannelsResult | Error;
}): DoctorClients {
  const serviceNodeInfo = options?.serviceNodeInfo ?? makeNodeInfo("02service");
  const receiverNodeInfo = options?.receiverNodeInfo ?? makeNodeInfo("02receiver");
  const servicePeers = options?.servicePeers ?? makePeers("02receiver");
  const serviceChannels = options?.serviceChannels ?? { channels: [makeChannel("02receiver")] };
  const receiverChannels = options?.receiverChannels ?? { channels: [makeChannel("02service")] };

  return {
    service: {
      nodeInfo: vi.fn(async () => {
        if (serviceNodeInfo instanceof Error) {
          throw serviceNodeInfo;
        }

        return serviceNodeInfo;
      }),
      listPeers: vi.fn(async () => {
        if (servicePeers instanceof Error) {
          throw servicePeers;
        }

        return servicePeers;
      }),
      listChannels: vi.fn(async () => {
        if (serviceChannels instanceof Error) {
          throw serviceChannels;
        }

        return serviceChannels;
      }),
    } as CoordinatorClient,
    receiver: {
      nodeInfo: vi.fn(async () => {
        if (receiverNodeInfo instanceof Error) {
          throw receiverNodeInfo;
        }

        return receiverNodeInfo;
      }),
      listPeers: vi.fn(async () => ({ peers: [] })),
      listChannels: vi.fn(async () => {
        if (receiverChannels instanceof Error) {
          throw receiverChannels;
        }

        return receiverChannels;
      }),
    } as CoordinatorClient,
  };
}

describe("runDoctor", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs the read-only checks and reports the safety state", async () => {
    const clients = createClients();
    mockEvaluateReadiness.mockResolvedValue({
      service_node: "node4",
      receiver_pubkey: "02receiver",
      service_node_pubkey: "02service",
      receiver_reachable: true,
      peer_connected: true,
      channel_ready: true,
      outbound_liquidity_sufficient: true,
      readiness_status: "ready",
      reason: "ready",
      recommended_quote: {
        target_payment: { shannons: "100000000", ckb: "1 CKB" },
        receiver_reserve_required: { shannons: "9900000000", ckb: "99 CKB" },
        receiver_accept_funding: { shannons: "9900000000", ckb: "99 CKB" },
        fee_headroom: { shannons: "2000000000", ckb: "20 CKB" },
        minimum_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        recommended_opener_funding: { shannons: "12000000000", ckb: "120 CKB" },
        estimated_usable_liquidity: { shannons: "2100000000", ckb: "21 CKB" },
        explanation: "quoted",
      },
    });

    const result = await runDoctor(clients, {
      serviceNode: "node4",
      receiverNode: "node9",
      targetPaymentShannons: 100_000_000n,
    });

    expect(result.mode).toBe("read-only");
    expect(result.accept_mode).toBe("detect");
    expect(result.service.rpc_reachable).toBe(true);
    expect(result.receiver.rpc_reachable).toBe(true);
    expect(result.receiver.pubkey).toBe("02receiver");
    expect(result.quote.minimum_opener_funding.ckb).toBe("120 CKB");
    expect(result.safety.execute_allowed).toBe(false);
    expect(result.safety.execute_requires_yes).toBe(true);
    expect(result.rpc_methods.service.node_info).toBe(true);
    expect(result.rpc_methods.service.list_peers).toBe(true);
    expect(result.rpc_methods.service.list_channels).toBe(true);
    expect(result.rpc_methods.receiver.node_info).toBe(true);
    expect(result.rpc_methods.receiver.list_channels).toBe(true);
    expect(result.readiness?.readiness_status).toBe("ready");
    expect(mockEvaluateReadiness).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      }),
    );
  });

  it("reports a readable receiver RPC failure", async () => {
    const clients = createClients({
      receiverNodeInfo: new Error("receiver offline"),
      receiverChannels: new Error("receiver offline"),
    });

    const result = await runDoctor(clients, {
      serviceNode: "node4",
      receiverNode: "node9",
      targetPaymentShannons: 100_000_000n,
      acceptMode: "manual",
    });

    expect(result.accept_mode).toBe("manual");
    expect(result.receiver.rpc_reachable).toBe(false);
    expect(result.receiver.node_info_available).toBe(false);
    expect(result.receiver.node_info_error).toMatch(/receiver offline/i);
    expect(result.readiness).toBeUndefined();
    expect(result.readiness_error).toMatch(/receiver offline/i);
    expect(result.safety.read_only).toBe(true);
  });
});
