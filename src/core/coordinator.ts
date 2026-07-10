import { FiberRpcError } from "../rpc/client.js";
import type {
  AcceptChannelResult,
  Channel,
  ListChannelsResult,
  ListPeersResult,
  NodeInfo,
  OpenChannelResult,
} from "../rpc/types.js";
import { buildReserveAwareQuote, type PrintableQuoteAmount } from "./quote.js";
import { formatCkbAmount } from "./reserve.js";
import { evaluateReadiness, type ReadinessCheckResult } from "./readiness.js";

export type CoordinatorMode = "dry-run" | "execute";
export type CoordinatorStatus = "ready" | "timeout_not_ready" | "funding_aborted" | "rpc_error";
export type AcceptMode = "detect" | "manual" | "auto";

export interface CoordinatorInput {
  serviceNode: string;
  receiverNode?: string;
  receiverPubkey?: string;
  targetPaymentShannons: bigint;
}

export interface CoordinatorOptions {
  execute?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
  acceptMode?: AcceptMode;
}

export interface CoordinatorPlan {
  service_node: string;
  receiver_node?: string;
  receiver_pubkey: string;
  target_payment: PrintableQuoteAmount;
  opener_funding: PrintableQuoteAmount;
  receiver_accept_funding: PrintableQuoteAmount;
  readiness_satisfied: boolean;
  accept_mode: AcceptMode;
  planned_steps: string[];
  readiness: ReadinessCheckResult;
}

export interface CoordinatorExecutionResult {
  status: CoordinatorStatus;
  reason: string;
  temporary_channel_id?: string;
  channel_id?: string;
  manual_accept_attempted: boolean;
  manual_accept_error?: string;
}

export interface CoordinatorResult {
  mode: CoordinatorMode;
  plan: CoordinatorPlan;
  execution?: CoordinatorExecutionResult;
}

export interface CoordinatorClient {
  nodeInfo(): Promise<NodeInfo>;
  listPeers(): Promise<ListPeersResult>;
  listChannels(params?: Record<string, unknown>): Promise<ListChannelsResult>;
  listPendingChannels?(params?: Record<string, unknown>): Promise<ListChannelsResult>;
  openChannel?(params: Record<string, unknown>): Promise<OpenChannelResult>;
  acceptChannel?(params: Record<string, unknown>): Promise<AcceptChannelResult>;
}

export interface CoordinatorClients {
  service: CoordinatorClient;
  receiver?: CoordinatorClient;
}

export interface CoordinatorRuntime {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

const defaultRuntime: CoordinatorRuntime = {
  now: () => Date.now(),
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function printableAmount(shannons: bigint): PrintableQuoteAmount {
  return {
    shannons: shannons.toString(),
    ckb: formatCkbAmount(shannons),
  };
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

function channelCounterparty(channel: Channel): string | undefined {
  return typeof channel.pubkey === "string" ? channel.pubkey : undefined;
}

function isChannelReady(channel: Channel): boolean {
  const stateName = normalizeStateName(channel.state);
  return stateName !== undefined && stateName.toLowerCase().includes("channelready");
}

function isFundingAborted(channel: Channel): boolean {
  const stateName = normalizeStateName(channel.state)?.toLowerCase() ?? "";
  const failureDetail = channel.failure_detail?.toLowerCase() ?? "";

  return (
    stateName.includes("fundingaborted") ||
    stateName.includes("funding_aborted") ||
    stateName.includes("aborted") ||
    failureDetail.includes("aborted") ||
    failureDetail.includes("abort") ||
    failureDetail.includes("funding")
  );
}

function matchingChannels(channels: Channel[], counterpartyPubkey: string): Channel[] {
  return channels.filter((channel) => channelCounterparty(channel) === counterpartyPubkey);
}

function findPendingTempId(channels: Channel[], expectedTempId?: string): string | undefined {
  if (!expectedTempId) {
    return undefined;
  }

  return channels.find((channel) => channel.channel_id === expectedTempId)?.channel_id;
}

async function resolveReceiverPubkey(
  receiverClient: CoordinatorClient | undefined,
  receiverPubkey: string | undefined,
): Promise<string> {
  if (receiverPubkey) {
    return receiverPubkey;
  }

  if (!receiverClient) {
    throw new Error("Receiver pubkey is required when no receiver node is provided.");
  }

  const info = await receiverClient.nodeInfo();
  return info.pubkey;
}

function planSteps(readiness: ReadinessCheckResult, acceptMode: AcceptMode): string[] {
  if (readiness.readiness_status === "ready") {
    return [
      "receiver is already ready",
      "no new channel should be opened",
      "retry the payment with the existing ChannelReady path",
    ];
  }

  if (acceptMode === "auto") {
    return [
      "open reserve-aware channel from the service node to the receiver",
      "poll both nodes until ChannelReady or a clear failure state appears",
      "do not manually accept the channel; rely on the receiver's configured auto-accept path if it is enabled",
    ];
  }

  return [
    "open reserve-aware channel from the service node to the receiver",
    "watch the receiver pending channel list for the live temporary channel id",
    "accept the pending channel from the receiver side if it appears",
    "poll both nodes until ChannelReady or a clear failure state appears",
  ];
}

function emptyExecution(status: CoordinatorStatus, reason: string): CoordinatorExecutionResult {
  return {
    status,
    reason,
    manual_accept_attempted: false,
  };
}

interface ExecutionState {
  temporaryChannelId?: string;
  channelId?: string;
  manualAcceptAttempted: boolean;
  manualAcceptError?: string;
}

function buildExecutionResult(
  status: CoordinatorStatus,
  reason: string,
  state: ExecutionState,
): CoordinatorExecutionResult {
  return {
    status,
    reason,
    temporary_channel_id: state.temporaryChannelId,
    channel_id: state.channelId,
    manual_accept_attempted: state.manualAcceptAttempted,
    manual_accept_error: state.manualAcceptError,
  };
}

function inspectExecutionState(
  serviceChannels: ListChannelsResult,
  receiverChannels: ListChannelsResult,
  receiverPubkey: string,
  servicePubkey: string,
  acceptMode: AcceptMode,
  state: ExecutionState,
  readyReason: string,
): CoordinatorExecutionResult | null {
  const serviceMatchingChannels = matchingChannels(serviceChannels.channels, receiverPubkey);
  const receiverMatchingChannels = matchingChannels(receiverChannels.channels, servicePubkey);

  if (serviceMatchingChannels.some(isChannelReady) && receiverMatchingChannels.some(isChannelReady)) {
    if (acceptMode === "manual" && !state.manualAcceptAttempted) {
      return null;
    }

    return buildExecutionResult(
      "ready",
      readyReason,
      {
        ...state,
        channelId: state.channelId ?? serviceMatchingChannels.find(isChannelReady)?.channel_id,
      },
    );
  }

  const serviceLiveChannels = serviceMatchingChannels.filter((channel) => !isFundingAborted(channel));
  const receiverLiveChannels = receiverMatchingChannels.filter((channel) => !isFundingAborted(channel));

  if (serviceMatchingChannels.length > 0 && receiverMatchingChannels.length > 0) {
    if (serviceLiveChannels.length === 0 && receiverLiveChannels.length === 0) {
      return buildExecutionResult(
        "funding_aborted",
        "Both service-side and receiver-side channels entered a funding-aborted or closed state.",
        state,
      );
    }
  }

  return null;
}

export async function prepareInboundChannel(
  clients: CoordinatorClients,
  input: CoordinatorInput,
  options: CoordinatorOptions = {},
  runtime: CoordinatorRuntime = defaultRuntime,
): Promise<CoordinatorResult> {
  const acceptMode = options.acceptMode ?? "detect";
  const serviceNodeInfo = await clients.service.nodeInfo();
  const receiverPubkey = await resolveReceiverPubkey(clients.receiver, input.receiverPubkey);
  const quote = buildReserveAwareQuote({ targetPaymentShannons: input.targetPaymentShannons });
  const readiness = await evaluateReadiness(clients.service, {
    serviceNode: input.serviceNode,
    receiverPubkey,
    targetPaymentShannons: input.targetPaymentShannons,
  });

  const plan: CoordinatorPlan = {
    service_node: input.serviceNode,
    receiver_node: input.receiverNode,
    receiver_pubkey: receiverPubkey,
    target_payment: printableAmount(input.targetPaymentShannons),
    opener_funding: printableAmount(quote.recommendedOpenerFundingShannons),
    receiver_accept_funding: printableAmount(quote.receiverAcceptFundingShannons),
    readiness_satisfied: readiness.readiness_status === "ready",
    accept_mode: acceptMode,
    planned_steps: planSteps(readiness, acceptMode),
    readiness: {
      ...readiness,
      service_node_pubkey: readiness.service_node_pubkey ?? serviceNodeInfo.pubkey,
    },
  };

  if (!options.execute) {
    return {
      mode: "dry-run",
      plan,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = runtime.now() + timeoutMs;

  if (plan.readiness_satisfied) {
    return {
      mode: "execute",
      plan,
      execution: emptyExecution("ready", "Payment readiness was already satisfied. No channel was opened."),
    };
  }

  if (!clients.receiver || !input.receiverNode) {
    return {
      mode: "execute",
      plan,
      execution: emptyExecution(
        "rpc_error",
        "Execution requires a receiver node so the coordinator can watch receiver pending channels and perform a manual accept if needed.",
      ),
    };
  }

  const servicePubkey = plan.readiness.service_node_pubkey ?? serviceNodeInfo.pubkey;

  if (!clients.service.openChannel || !clients.receiver.acceptChannel) {
    return {
      mode: "execute",
      plan,
      execution: emptyExecution(
        "rpc_error",
        "Execution requires channel mutation methods on both the service and receiver clients.",
      ),
    };
  }

  const state: ExecutionState = {
    temporaryChannelId: undefined,
    channelId: undefined,
    manualAcceptAttempted: false,
    manualAcceptError: undefined,
  };

  try {
    const openResult = await clients.service.openChannel({
      pubkey: receiverPubkey,
      funding_amount: quote.recommendedOpenerFundingShannons,
      public: false,
      one_way: false,
    });

    state.temporaryChannelId = openResult.temporary_channel_id ?? openResult.channel_id;

    if (!state.temporaryChannelId) {
      return {
        mode: "execute",
        plan,
        execution: emptyExecution(
          "rpc_error",
          "open_channel did not return a temporary channel id that could be tracked.",
        ),
      };
    }

    while (runtime.now() < deadline) {
      if (acceptMode !== "auto") {
        const pendingList = await (clients.receiver.listPendingChannels
          ? clients.receiver.listPendingChannels({ pubkey: servicePubkey })
          : clients.receiver.listChannels({ pubkey: servicePubkey, only_pending: true }));

        const pendingTempId = findPendingTempId(pendingList.channels, state.temporaryChannelId);
        if (pendingList.channels.length > 0 && !pendingTempId) {
          // Another pending channel can appear briefly while Fiber is settling the
          // live channel state. Keep polling until the expected temp id shows up
          // or the service/receiver channel state becomes ready or aborted.
        }

        if (pendingTempId && !state.manualAcceptAttempted) {
          state.manualAcceptAttempted = true;
          try {
            const acceptResult = await clients.receiver.acceptChannel({
              temporary_channel_id: pendingTempId,
              funding_amount: quote.receiverAcceptFundingShannons,
            });
            state.channelId = acceptResult.channel_id ?? state.channelId;
          } catch (error) {
            state.manualAcceptError = error instanceof Error ? error.message : String(error);
          }
        }
      }

      const serviceChannels = await clients.service.listChannels({ pubkey: receiverPubkey, include_closed: true });
      const receiverChannels = await clients.receiver.listChannels({ pubkey: servicePubkey, include_closed: true });

      const observed = inspectExecutionState(
        serviceChannels,
        receiverChannels,
        receiverPubkey,
        servicePubkey,
        acceptMode,
        state,
        "ChannelReady was observed on both service and receiver nodes.",
      );

      if (observed) {
        return {
          mode: "execute",
          plan,
          execution: observed,
        };
      }

      await runtime.sleep(pollIntervalMs);
    }

    {
      const finalServiceChannels = await clients.service.listChannels({ pubkey: receiverPubkey, include_closed: true });
      const finalReceiverChannels = await clients.receiver.listChannels({ pubkey: servicePubkey, include_closed: true });
      const finalObserved = inspectExecutionState(
        finalServiceChannels,
        finalReceiverChannels,
        receiverPubkey,
        servicePubkey,
        acceptMode,
        state,
        "ChannelReady was observed on both service and receiver nodes during the final timeout check.",
      );

      if (finalObserved) {
        return {
          mode: "execute",
          plan,
          execution: finalObserved,
        };
      }
    }

    return {
      mode: "execute",
      plan,
      execution: {
        status: "timeout_not_ready",
        reason: "Timed out while waiting for ChannelReady or a clear failure state.",
        temporary_channel_id: state.temporaryChannelId,
        channel_id: state.channelId,
        manual_accept_attempted: state.manualAcceptAttempted,
        manual_accept_error: state.manualAcceptError,
      },
    };
  } catch (error) {
    const message =
      error instanceof FiberRpcError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    return {
      mode: "execute",
      plan,
      execution: buildExecutionResult("rpc_error", message, state),
    };
  }
}
