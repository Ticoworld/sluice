import type { z } from "zod";
import {
  acceptChannelParamsSchema,
  acceptChannelResultSchema,
  listChannelsParamsSchema,
  listChannelsResultSchema,
  listPeersResultSchema,
  nodeInfoSchema,
  openChannelParamsSchema,
  openChannelResultSchema,
  type AcceptChannelParams,
  type AcceptChannelResult,
  type ListChannelsParams,
  type ListChannelsResult,
  type ListPeersResult,
  type NodeInfo,
  type OpenChannelParams,
  type OpenChannelResult,
} from "./types.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcErrorShape {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: JsonRpcErrorShape;
}

export class FiberRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(`Fiber RPC error ${code}: ${message}`);
    this.name = "FiberRpcError";
    this.code = code;
    this.data = data;
  }
}

export interface FiberRpcClientOptions {
  url: string;
  fetchImpl?: typeof fetch;
}

export class FiberRpcClient {
  private readonly url: string;
  private readonly fetchImpl: typeof fetch;
  private nextId = 1;

  constructor(options: FiberRpcClientOptions) {
    this.url = options.url;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async call<T>(method: string, params: unknown, schema: z.ZodType<T>): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method,
      params,
    };

    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
    });

    if (!response.ok) {
      throw new Error(`Fiber RPC HTTP error ${response.status} calling ${method}`);
    }

    const body = (await response.json()) as JsonRpcResponse;

    if (body.error) {
      throw new FiberRpcError(body.error.code, body.error.message, body.error.data);
    }

    return schema.parse(body.result);
  }

  nodeInfo(): Promise<NodeInfo> {
    return this.call("node_info", null, nodeInfoSchema);
  }

  listPeers(): Promise<ListPeersResult> {
    return this.call("list_peers", null, listPeersResultSchema);
  }

  listChannels(params: ListChannelsParams = {}): Promise<ListChannelsResult> {
    const validParams = listChannelsParamsSchema.parse(params);
    return this.call("list_channels", { params: validParams }, listChannelsResultSchema);
  }

  listPendingChannels(params: Omit<ListChannelsParams, "only_pending"> = {}): Promise<ListChannelsResult> {
    return this.listChannels({ ...params, only_pending: true });
  }

  openChannel(params: OpenChannelParams): Promise<OpenChannelResult> {
    const validParams = openChannelParamsSchema.parse(params);
    return this.call("open_channel", validParams, openChannelResultSchema);
  }

  acceptChannel(params: AcceptChannelParams): Promise<AcceptChannelResult> {
    const validParams = acceptChannelParamsSchema.parse(params);
    return this.call("accept_channel", validParams, acceptChannelResultSchema);
  }
}
