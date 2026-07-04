import type { z } from "zod";
import {
  acceptChannelParamsSchema,
  acceptChannelResultSchema,
  getInvoiceResultSchema,
  getPaymentResultSchema,
  listChannelsParamsSchema,
  listChannelsResultSchema,
  listPaymentsParamsSchema,
  listPaymentsResultSchema,
  listPeersResultSchema,
  newInvoiceParamsSchema,
  newInvoiceResultSchema,
  nodeInfoSchema,
  sendPaymentParamsSchema,
  sendPaymentResultSchema,
  openChannelParamsSchema,
  openChannelResultSchema,
  type AcceptChannelParams,
  type AcceptChannelResult,
  type GetInvoiceResult,
  type GetPaymentResult,
  type ListChannelsParams,
  type ListChannelsResult,
  type ListPaymentsParams,
  type ListPaymentsResult,
  type ListPeersResult,
  type NewInvoiceParams,
  type NewInvoiceResult,
  type NodeInfo,
  type OpenChannelParams,
  type OpenChannelResult,
  type SendPaymentParams,
  type SendPaymentResult,
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

function encodeJsonRpcValue(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }

  return value;
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
      body: JSON.stringify(request, encodeJsonRpcValue),
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
    return this.call("node_info", {}, nodeInfoSchema);
  }

  listPeers(): Promise<ListPeersResult> {
    return this.call("list_peers", {}, listPeersResultSchema);
  }

  listChannels(params: ListChannelsParams = {}): Promise<ListChannelsResult> {
    const validParams = listChannelsParamsSchema.parse(params);
    return this.call("list_channels", [validParams], listChannelsResultSchema);
  }

  listPendingChannels(params: Omit<ListChannelsParams, "only_pending"> = {}): Promise<ListChannelsResult> {
    return this.listChannels({ ...params, only_pending: true });
  }

  openChannel(params: OpenChannelParams): Promise<OpenChannelResult> {
    const validParams = openChannelParamsSchema.parse(params);
    return this.call("open_channel", [validParams], openChannelResultSchema);
  }

  acceptChannel(params: AcceptChannelParams): Promise<AcceptChannelResult> {
    const validParams = acceptChannelParamsSchema.parse(params);
    return this.call("accept_channel", [validParams], acceptChannelResultSchema);
  }

  newInvoice(params: NewInvoiceParams): Promise<NewInvoiceResult> {
    const validParams = newInvoiceParamsSchema.parse(params);
    return this.call("new_invoice", [validParams], newInvoiceResultSchema);
  }

  getInvoice(paymentHash: string): Promise<GetInvoiceResult> {
    return this.call("get_invoice", [{ payment_hash: paymentHash }], getInvoiceResultSchema);
  }

  sendPayment(params: SendPaymentParams): Promise<SendPaymentResult> {
    const validParams = sendPaymentParamsSchema.parse(params);
    return this.call("send_payment", [validParams], sendPaymentResultSchema);
  }

  getPayment(paymentHash: string): Promise<GetPaymentResult> {
    return this.call("get_payment", [{ payment_hash: paymentHash }], getPaymentResultSchema);
  }

  listPayments(params: ListPaymentsParams = {}): Promise<ListPaymentsResult> {
    const validParams = listPaymentsParamsSchema.parse(params);
    return this.call("list_payments", [validParams], listPaymentsResultSchema);
  }
}
