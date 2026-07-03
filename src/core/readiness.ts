import type { FiberRpcClient } from "../rpc/client.js";
import type { Channel, ListChannelsResult, ListPeersResult, NodeInfo, PeerInfo } from "../rpc/types.js";
import { buildReserveAwareQuote, formatReserveAwareQuote, type PrintableReserveAwareQuote } from "./quote.js";

export type ReadinessStatus = "ready" | "not_ready" | "unknown";
export type OutboundLiquiditySufficient = boolean | "unknown";

export interface ReadinessCheckInput {
  serviceNode: string;
  receiverPubkey: string;
  targetPaymentShannons: bigint;
}

export interface ReadinessCheckResult {
  service_node: string;
  receiver_pubkey: string;
  service_node_pubkey?: string;
  receiver_reachable: boolean;
  peer_connected: boolean;
  channel_ready: boolean;
  outbound_liquidity_sufficient: OutboundLiquiditySufficient;
  readiness_status: ReadinessStatus;
  reason: string;
  recommended_quote: PrintableReserveAwareQuote;
}

interface ReadinessRpcClient {
  nodeInfo(): Promise<NodeInfo>;
  listPeers(): Promise<ListPeersResult>;
  listChannels(params?: Record<string, unknown>): Promise<ListChannelsResult>;
}

function normalizeStateName(state: unknown): string | undefined {
  if (typeof state === "string") {
    return state;
  }

  if (state && typeof state === "object") {
    const candidate = state as Record<string, unknown>;
    const raw =
      candidate.state_name ??
      candidate.stateName ??
      candidate.name ??
      candidate.status ??
      candidate.state;

    if (typeof raw === "string") {
      return raw;
    }
  }

  return undefined;
}

function isChannelReady(channel: Channel): boolean {
  const stateName = normalizeStateName(channel.state);

  if (!stateName) {
    return false;
  }

  return stateName.toLowerCase().includes("channelready");
}

function toBigIntOrUnknown(value: unknown): bigint | null {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      return null;
    }

    return BigInt(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) {
    return BigInt(value);
  }

  return null;
}

function totalReadyChannelLiquidity(channels: Channel[]): bigint | null {
  let total = 0n;
  let sawReadyChannel = false;

  for (const channel of channels) {
    if (!isChannelReady(channel)) {
      continue;
    }

    sawReadyChannel = true;

    const liquidity = toBigIntOrUnknown(channel.local_balance);
    if (liquidity === null) {
      return null;
    }

    total += liquidity;
  }

  return sawReadyChannel ? total : 0n;
}

function reasonForReadiness(
  readinessStatus: ReadinessStatus,
  peerConnected: boolean,
  channelReady: boolean,
  outboundLiquiditySufficient: OutboundLiquiditySufficient,
  targetPaymentShannons: bigint,
): string {
  if (readinessStatus === "unknown") {
    if (!peerConnected && !channelReady) {
      return "Readiness is unknown because the receiver peer is not connected and no ChannelReady path exists yet.";
    }

    if (channelReady && outboundLiquiditySufficient === "unknown") {
      return "Readiness is unknown because a ChannelReady path exists, but outbound liquidity could not be read confidently from the live Fiber channel fields.";
    }

    return "Readiness is unknown because one or more live Fiber state checks could not be interpreted confidently.";
  }

  if (readinessStatus === "ready") {
    return "Payment is ready: a ChannelReady path exists and outbound liquidity covers the target payment.";
  }

  if (!peerConnected) {
    if (channelReady) {
      return "Payment is not ready because the receiver is not connected as a peer, even though a ChannelReady path exists.";
    }

    return "Payment is not ready because the receiver is not connected as a peer to the service node.";
  }

  if (!channelReady) {
    return "Payment is not ready because no ChannelReady path exists yet. A reserve-aware inbound channel is needed before retrying the payment.";
  }

  if (outboundLiquiditySufficient === false) {
    return `Payment is not ready because the ChannelReady path does not show enough outbound liquidity for the target payment of ${targetPaymentShannons} shannons.`;
  }

  if (outboundLiquiditySufficient === "unknown") {
    return "Payment readiness is not fully known because the channel is ready, but outbound liquidity could not be read confidently.";
  }

  return "Payment is ready: a ChannelReady path exists and outbound liquidity covers the target payment.";
}

export async function evaluateReadiness(
  client: ReadinessRpcClient,
  input: ReadinessCheckInput,
): Promise<ReadinessCheckResult> {
  const recommendedQuote = formatReserveAwareQuote(
    buildReserveAwareQuote({ targetPaymentShannons: input.targetPaymentShannons }),
  );

  let nodeInfo: NodeInfo;
  let peers: ListPeersResult;
  let channels: ListChannelsResult;

  try {
    [nodeInfo, peers, channels] = await Promise.all([
      client.nodeInfo(),
      client.listPeers(),
      client.listChannels({ pubkey: input.receiverPubkey, include_closed: false }),
    ]);
  } catch (error) {
    return {
      service_node: input.serviceNode,
      receiver_pubkey: input.receiverPubkey,
      receiver_reachable: false,
      peer_connected: false,
      channel_ready: false,
      outbound_liquidity_sufficient: "unknown",
      readiness_status: "unknown",
      reason: error instanceof Error ? error.message : "Unable to read live Fiber readiness state.",
      recommended_quote: recommendedQuote,
    };
  }

  const peerConnected = peers.peers.some((peer: PeerInfo) => peer.pubkey === input.receiverPubkey);
  const channelReady = channels.channels.some((channel) => channel.pubkey === input.receiverPubkey && isChannelReady(channel));
  const receiverReachable = peerConnected || channelReady;

  let outboundLiquiditySufficient: OutboundLiquiditySufficient = "unknown";
  const totalReadyLiquidity = totalReadyChannelLiquidity(channels.channels);

  if (channelReady) {
    if (totalReadyLiquidity === null) {
      outboundLiquiditySufficient = "unknown";
    } else {
      outboundLiquiditySufficient = totalReadyLiquidity >= input.targetPaymentShannons;
    }
  } else {
    outboundLiquiditySufficient = false;
  }

  let readinessStatus: ReadinessStatus = "unknown";

  if (channelReady && outboundLiquiditySufficient === true) {
    readinessStatus = "ready";
  } else if (peerConnected || channelReady) {
    readinessStatus = outboundLiquiditySufficient === "unknown" ? "unknown" : "not_ready";
  } else {
    readinessStatus = "not_ready";
  }

  return {
    service_node: input.serviceNode,
    receiver_pubkey: input.receiverPubkey,
    service_node_pubkey: nodeInfo.pubkey,
    receiver_reachable: receiverReachable,
    peer_connected: peerConnected,
    channel_ready: channelReady,
    outbound_liquidity_sufficient: outboundLiquiditySufficient,
    readiness_status: readinessStatus,
    reason: reasonForReadiness(
      readinessStatus,
      peerConnected,
      channelReady,
      outboundLiquiditySufficient,
      input.targetPaymentShannons,
    ),
    recommended_quote: recommendedQuote,
  };
}
