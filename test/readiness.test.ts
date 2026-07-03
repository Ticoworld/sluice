import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "../src/core/readiness.js";

function createClient({
  nodeInfo = { pubkey: "02service" },
  peers = [],
  channels = [],
}: {
  nodeInfo?: { pubkey: string };
  peers?: Array<{ pubkey: string; address: string }>;
  channels?: Array<Record<string, unknown>>;
}) {
  return {
    nodeInfo: async () =>
      ({
        version: "0.8.1",
        commit_hash: "b560023",
        pubkey: nodeInfo.pubkey,
        features: [],
        addresses: ["/ip4/127.0.0.1/tcp/8258"],
        chain_hash: "0xdead",
        open_channel_auto_accept_min_ckb_funding_amount: "9900000000",
        auto_accept_channel_ckb_funding_amount: "0",
        default_funding_lock_script: {},
        tlc_expiry_delta: "3600000",
        tlc_min_value: "0",
        tlc_fee_proportional_millionths: "1000",
        channel_count: channels.length,
        pending_channel_count: 0,
        peers_count: peers.length,
        udt_cfg_infos: [],
      }) as never,
    listPeers: async () => ({ peers }) as never,
    listChannels: async () => ({ channels }) as never,
  };
}

describe("readiness", () => {
  it("reports not ready when the receiver peer is not connected", async () => {
    const result = await evaluateReadiness(createClient({}), {
      serviceNode: "node4",
      receiverPubkey: "02receiver",
      targetPaymentShannons: 100_000_000n,
    });

    expect(result.receiver_reachable).toBe(false);
    expect(result.peer_connected).toBe(false);
    expect(result.channel_ready).toBe(false);
    expect(result.outbound_liquidity_sufficient).toBe(false);
    expect(result.readiness_status).toBe("not_ready");
    expect(result.reason).toMatch(/not connected/i);
  });

  it("reports not ready when the peer is connected but no channel is ready", async () => {
    const result = await evaluateReadiness(
      createClient({
        peers: [{ pubkey: "02receiver", address: "/ip4/127.0.0.1/tcp/8248" }],
      }),
      {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
    );

    expect(result.receiver_reachable).toBe(true);
    expect(result.peer_connected).toBe(true);
    expect(result.channel_ready).toBe(false);
    expect(result.readiness_status).toBe("not_ready");
    expect(result.reason).toMatch(/ChannelReady path does not exist|No ChannelReady path exists/i);
  });

  it("reports ready when a ChannelReady channel has enough liquidity", async () => {
    const result = await evaluateReadiness(
      createClient({
        peers: [{ pubkey: "02receiver", address: "/ip4/127.0.0.1/tcp/8248" }],
        channels: [
          {
            channel_id: "0xready",
            pubkey: "02receiver",
            state: { state_name: "ChannelReady" },
            local_balance: "12000000000",
          },
        ],
      }),
      {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
    );

    expect(result.receiver_reachable).toBe(true);
    expect(result.channel_ready).toBe(true);
    expect(result.outbound_liquidity_sufficient).toBe(true);
    expect(result.readiness_status).toBe("ready");
    expect(result.reason).toMatch(/Payment is ready/i);
  });

  it("returns unknown when a ChannelReady path exists but liquidity cannot be read confidently", async () => {
    const result = await evaluateReadiness(
      createClient({
        peers: [{ pubkey: "02receiver", address: "/ip4/127.0.0.1/tcp/8248" }],
        channels: [
          {
            channel_id: "0xready",
            pubkey: "02receiver",
            state: "ChannelReady",
            local_balance: "unknown",
          },
        ],
      }),
      {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 100_000_000n,
      },
    );

    expect(result.channel_ready).toBe(true);
    expect(result.outbound_liquidity_sufficient).toBe("unknown");
    expect(result.readiness_status).toBe("unknown");
    expect(result.reason).toMatch(/could not be read confidently/i);
  });

  it("rejects an invalid target amount", async () => {
    await expect(
      evaluateReadiness(createClient({}), {
        serviceNode: "node4",
        receiverPubkey: "02receiver",
        targetPaymentShannons: 0n,
      }),
    ).rejects.toThrow(/greater than zero/i);
  });
});
