import { describe, expect, it, vi } from "vitest";
import { FiberRpcClient, FiberRpcError } from "../src/rpc/client.js";

function mockFetchOnce(body: unknown, ok = true, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const RPC_URL = "http://127.0.0.1:8247";

describe("FiberRpcClient", () => {
  it("parses a node_info result", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      result: {
        version: "0.8.1",
        commit_hash: "b560023",
        pubkey: "02abc",
        features: [],
        node_name: "node3",
        addresses: ["/ip4/127.0.0.1/tcp/8248"],
        chain_hash: "0xdead",
        open_channel_auto_accept_min_ckb_funding_amount: "9900000000",
        auto_accept_channel_ckb_funding_amount: "0",
        default_funding_lock_script: {},
        tlc_expiry_delta: "3600000",
        tlc_min_value: "0",
        tlc_fee_proportional_millionths: "1000",
        channel_count: 1,
        pending_channel_count: 0,
        peers_count: 1,
        udt_cfg_infos: [],
      },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });
    const info = await client.nodeInfo();

    expect(info.version).toBe("0.8.1");
    expect(info.node_name).toBe("node3");
    expect(fetchImpl).toHaveBeenCalledWith(
      RPC_URL,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"method":"node_info"'),
      }),
    );
  });

  it("parses a list_peers result", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      result: {
        peers: [{ pubkey: "02abc", address: "/ip4/127.0.0.1/tcp/8258" }],
      },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });
    const result = await client.listPeers();

    expect(result.peers).toHaveLength(1);
    expect(result.peers[0]?.pubkey).toBe("02abc");
  });

  it("parses a list_channels result and sends filter params", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      result: {
        channels: [
          {
            channel_id: "0xchannel",
            is_public: true,
            is_acceptor: false,
            pubkey: "02abc",
            state: { state_name: "ChannelReady" },
            local_balance: "12000000000",
            offered_tlc_balance: "0",
            remote_balance: "9900000000",
            received_tlc_balance: "0",
            created_at: 1_719_000_000_000,
            enabled: true,
            tlc_expiry_delta: "3600000",
            tlc_fee_proportional_millionths: "1000",
          },
        ],
      },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });
    const result = await client.listChannels({ only_pending: false, include_closed: true });

    expect(result.channels).toHaveLength(1);
    expect(result.channels[0]?.channel_id).toBe("0xchannel");
    expect(fetchImpl).toHaveBeenCalledWith(
      RPC_URL,
      expect.objectContaining({
        body: expect.stringContaining('"params":{"params":{"include_closed":true,"only_pending":false}}'),
      }),
    );
  });

  it("sends an open_channel request with serialized funding amount", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      result: { temporary_channel_id: "0xtemp" },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });
    const result = await client.openChannel({
      pubkey: "02abc",
      funding_amount: 12_000_000_000n,
      public: false,
      one_way: false,
    });

    expect(result.temporary_channel_id).toBe("0xtemp");
    expect(fetchImpl).toHaveBeenCalledWith(
      RPC_URL,
      expect.objectContaining({
        body: expect.stringContaining('"method":"open_channel"'),
      }),
    );
  });

  it("sends an accept_channel request with serialized funding amount", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      result: { channel_id: "0xchannel" },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });
    const result = await client.acceptChannel({
      temporary_channel_id: "0xtemp",
      funding_amount: 9_900_000_000n,
    });

    expect(result.channel_id).toBe("0xchannel");
    expect(fetchImpl).toHaveBeenCalledWith(
      RPC_URL,
      expect.objectContaining({
        body: expect.stringContaining('"method":"accept_channel"'),
      }),
    );
  });

  it("throws FiberRpcError on a JSON-RPC error response", async () => {
    const fetchImpl = mockFetchOnce({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32601, message: "Method not found" },
    });

    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });

    await expect(client.nodeInfo()).rejects.toThrow(FiberRpcError);
  });

  it("throws on a non-ok HTTP response", async () => {
    const fetchImpl = mockFetchOnce({}, false, 500);
    const client = new FiberRpcClient({ url: RPC_URL, fetchImpl });

    await expect(client.nodeInfo()).rejects.toThrow(/HTTP error 500/);
  });
});
