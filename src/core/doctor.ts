import type { CoordinatorClient, AcceptMode } from "./coordinator.js";
import { buildReserveAwareQuote, formatReserveAwareQuote, type PrintableReserveAwareQuote } from "./quote.js";
import { evaluateReadiness, type ReadinessCheckResult } from "./readiness.js";
import type { ListChannelsResult, ListPeersResult, NodeInfo } from "../rpc/types.js";

export interface DoctorInput {
  serviceNode: string;
  receiverNode: string;
  targetPaymentShannons: bigint;
  acceptMode?: AcceptMode;
}

export interface DoctorClients {
  service: CoordinatorClient;
  receiver: CoordinatorClient;
}

interface RpcCallState<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export interface DoctorResult {
  mode: "read-only";
  service_node: string;
  receiver_node: string;
  accept_mode: AcceptMode;
  quote: PrintableReserveAwareQuote;
  safety: {
    read_only: true;
    dry_run_default: true;
    execute_allowed: false;
    execute_requires_yes: true;
  };
  service: {
    rpc_reachable: boolean;
    node_info_available: boolean;
    node_info_error?: string;
    pubkey?: string;
    list_peers_available: boolean;
    list_peers_error?: string;
    list_channels_available: boolean;
    list_channels_error?: string;
  };
  receiver: {
    rpc_reachable: boolean;
    node_info_available: boolean;
    node_info_error?: string;
    pubkey?: string;
    list_channels_available: boolean;
    list_channels_error?: string;
  };
  readiness?: ReadinessCheckResult;
  readiness_error?: string;
  rpc_methods: {
    service: {
      node_info: boolean;
      list_peers: boolean;
      list_channels: boolean;
    };
    receiver: {
      node_info: boolean;
      list_channels: boolean;
    };
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toCallState<T>(result: PromiseSettledResult<T>): RpcCallState<T> {
  if (result.status === "fulfilled") {
    return {
      ok: true,
      value: result.value,
    };
  }

  return {
    ok: false,
    error: errorMessage(result.reason),
  };
}

function anyRpcSuccess(values: Array<RpcCallState<unknown>>): boolean {
  return values.some((value) => value.ok);
}

function serviceNodeInfo(result: RpcCallState<NodeInfo>): NodeInfo | undefined {
  return result.value;
}

function receiverNodeInfo(result: RpcCallState<NodeInfo>): NodeInfo | undefined {
  return result.value;
}

export async function runDoctor(clients: DoctorClients, input: DoctorInput): Promise<DoctorResult> {
  const quote = formatReserveAwareQuote(buildReserveAwareQuote({ targetPaymentShannons: input.targetPaymentShannons }));
  const acceptMode = input.acceptMode ?? "detect";

  const [serviceNodeInfoResult, receiverNodeInfoResult, servicePeersResult, serviceChannelsResult, receiverChannelsResult] =
    await Promise.allSettled([
      clients.service.nodeInfo(),
      clients.receiver.nodeInfo(),
      clients.service.listPeers(),
      clients.service.listChannels({ include_closed: false }),
      clients.receiver.listChannels({ include_closed: false }),
    ]);

  const serviceInfo = toCallState(serviceNodeInfoResult);
  const receiverInfo = toCallState(receiverNodeInfoResult);
  const servicePeers = toCallState(servicePeersResult);
  const serviceChannels = toCallState(serviceChannelsResult);
  const receiverChannels = toCallState(receiverChannelsResult);

  let readiness: ReadinessCheckResult | undefined;
  let readinessError: string | undefined;

  if (receiverInfo.ok && receiverInfo.value) {
    try {
      readiness = await evaluateReadiness(clients.service, {
        serviceNode: input.serviceNode,
        receiverPubkey: receiverInfo.value.pubkey,
        targetPaymentShannons: input.targetPaymentShannons,
      });
    } catch (error) {
      readinessError = errorMessage(error);
    }
  } else {
    readinessError = receiverInfo.error ?? "Receiver pubkey could not be resolved from receiver RPC.";
  }

  const serviceRpcReachable = anyRpcSuccess([serviceInfo, servicePeers, serviceChannels]);
  const receiverRpcReachable = anyRpcSuccess([receiverInfo, receiverChannels]);

  return {
    mode: "read-only",
    service_node: input.serviceNode,
    receiver_node: input.receiverNode,
    accept_mode: acceptMode,
    quote,
    safety: {
      read_only: true,
      dry_run_default: true,
      execute_allowed: false,
      execute_requires_yes: true,
    },
    service: {
      rpc_reachable: serviceRpcReachable,
      node_info_available: serviceInfo.ok,
      node_info_error: serviceInfo.error,
      pubkey: serviceNodeInfo(serviceInfo)?.pubkey,
      list_peers_available: servicePeers.ok,
      list_peers_error: servicePeers.error,
      list_channels_available: serviceChannels.ok,
      list_channels_error: serviceChannels.error,
    },
    receiver: {
      rpc_reachable: receiverRpcReachable,
      node_info_available: receiverInfo.ok,
      node_info_error: receiverInfo.error,
      pubkey: receiverNodeInfo(receiverInfo)?.pubkey,
      list_channels_available: receiverChannels.ok,
      list_channels_error: receiverChannels.error,
    },
    readiness,
    readiness_error: readinessError,
    rpc_methods: {
      service: {
        node_info: serviceInfo.ok,
        list_peers: servicePeers.ok,
        list_channels: serviceChannels.ok,
      },
      receiver: {
        node_info: receiverInfo.ok,
        list_channels: receiverChannels.ok,
      },
    },
  };
}
