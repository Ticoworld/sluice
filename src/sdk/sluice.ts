import { FiberRpcClient } from "../rpc/client.js";
import { buildReserveAwareQuote, formatReserveAwareQuote } from "../core/quote.js";
import { ckbToShannons, parseShannons } from "../core/reserve.js";
import { evaluateReadiness } from "../core/readiness.js";
import { prepareInboundChannel } from "../core/coordinator.js";
import { runPaymentProof } from "../core/proof.js";
import type {
  AmountInput,
  CheckReadinessInput,
  PrepareInboundInput,
  ProvePaymentInput,
  SluiceOptions,
  SluicePrepareInboundResult,
  SluiceProvePaymentResult,
  SluiceQuote,
  SluiceReadiness,
} from "./types.js";

function resolveTargetPaymentShannons(input: AmountInput): bigint {
  const hasCkb = input.amountCkb !== undefined;
  const hasShannons = input.amountShannons !== undefined;

  if (hasCkb === hasShannons) {
    throw new Error("Provide exactly one of amountCkb or amountShannons.");
  }

  return hasCkb ? ckbToShannons(input.amountCkb as string) : parseShannons(input.amountShannons as string);
}

function resolveAcceptMode(acceptMode: string | undefined): "detect" | "manual" | "auto" {
  if (acceptMode === undefined) {
    return "detect";
  }

  if (acceptMode === "detect" || acceptMode === "manual" || acceptMode === "auto") {
    return acceptMode;
  }

  throw new Error(`Invalid acceptMode "${acceptMode}". Expected detect, manual, or auto.`);
}

function createExecutionGuardError(): Error {
  return new Error("Live execution requires execute: true and yes: true.");
}

export class Sluice {
  readonly serviceRpcUrl: string;

  private readonly fetchImpl: typeof fetch;
  private readonly serviceClient: FiberRpcClient;

  constructor(options: SluiceOptions) {
    this.serviceRpcUrl = options.serviceRpcUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.serviceClient = new FiberRpcClient({ url: options.serviceRpcUrl, fetchImpl: this.fetchImpl });
  }

  private clientFor(rpcUrl: string): FiberRpcClient {
    return new FiberRpcClient({ url: rpcUrl, fetchImpl: this.fetchImpl });
  }

  private async resolveReceiverPubkey(input: { receiverRpcUrl: string; receiverPubkey?: string }): Promise<string> {
    if (input.receiverPubkey) {
      return input.receiverPubkey;
    }

    return (await this.clientFor(input.receiverRpcUrl).nodeInfo()).pubkey;
  }

  private requireLiveExecution(execute?: boolean, yes?: boolean): boolean {
    if (!execute) {
      return false;
    }

    if (yes !== true) {
      throw createExecutionGuardError();
    }

    return true;
  }

  quote(input: AmountInput): SluiceQuote {
    const targetPaymentShannons = resolveTargetPaymentShannons(input);
    return formatReserveAwareQuote(buildReserveAwareQuote({ targetPaymentShannons }));
  }

  async checkReadiness(input: CheckReadinessInput): Promise<SluiceReadiness> {
    const targetPaymentShannons = resolveTargetPaymentShannons(input);
    const receiverPubkey = await this.resolveReceiverPubkey(input);

    return evaluateReadiness(this.serviceClient, {
      serviceNode: this.serviceRpcUrl,
      receiverPubkey,
      targetPaymentShannons,
    });
  }

  async prepareInbound(input: PrepareInboundInput): Promise<SluicePrepareInboundResult> {
    const execute = this.requireLiveExecution(input.execute, input.yes);
    const dryRun = input.dryRun ?? !execute;

    if (execute && dryRun) {
      throw new Error("Choose either dryRun: true or execute: true, not both.");
    }

    const targetPaymentShannons = resolveTargetPaymentShannons(input);
    const receiverClient = this.clientFor(input.receiverRpcUrl);
    const receiverPubkey = await this.resolveReceiverPubkey(input);
    const result = await prepareInboundChannel(
      {
        service: this.serviceClient,
        receiver: receiverClient,
      },
      {
        serviceNode: this.serviceRpcUrl,
        receiverNode: input.receiverRpcUrl,
        receiverPubkey,
        targetPaymentShannons,
      },
      {
        execute,
        timeoutMs: input.timeoutMs,
        pollIntervalMs: input.pollIntervalMs,
        acceptMode: resolveAcceptMode(input.acceptMode),
      },
    );

    return result;
  }

  async provePayment(input: ProvePaymentInput): Promise<SluiceProvePaymentResult> {
    const execute = this.requireLiveExecution(input.execute, input.yes);
    const dryRun = input.dryRun ?? !execute;

    if (execute && dryRun) {
      throw new Error("Choose either dryRun: true or execute: true, not both.");
    }

    const targetPaymentShannons = resolveTargetPaymentShannons(input);
    const receiverClient = this.clientFor(input.receiverRpcUrl);
    const receiverPubkey = await this.resolveReceiverPubkey(input);

    return runPaymentProof(
      {
        service: this.serviceClient,
        receiver: receiverClient,
      },
      {
        serviceNode: this.serviceRpcUrl,
        receiverNode: input.receiverRpcUrl,
        receiverPubkey,
        targetPaymentShannons,
      },
      {
        execute,
        timeoutMs: input.timeoutMs,
        pollIntervalMs: input.pollIntervalMs,
        acceptMode: resolveAcceptMode(input.acceptMode),
      },
    );
  }
}
