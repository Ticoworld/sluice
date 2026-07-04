import type { AcceptMode as CoordinatorAcceptMode } from "../core/coordinator.js";
import type { CoordinatorResult } from "../core/coordinator.js";
import type { PrintableReserveAwareQuote } from "../core/quote.js";
import type { ProofResult } from "../core/proof.js";
import type { ReadinessCheckResult } from "../core/readiness.js";

export type AcceptMode = CoordinatorAcceptMode;

export interface SluiceOptions {
  serviceRpcUrl: string;
  fetchImpl?: typeof fetch;
}

export interface AmountInput {
  amountCkb?: string;
  amountShannons?: string;
}

export interface CheckReadinessInput extends AmountInput {
  receiverRpcUrl: string;
  receiverPubkey?: string;
}

export interface PrepareInboundInput extends AmountInput {
  receiverRpcUrl: string;
  receiverPubkey?: string;
  acceptMode?: AcceptMode;
  dryRun?: boolean;
  execute?: boolean;
  yes?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface ProvePaymentInput extends AmountInput {
  receiverRpcUrl: string;
  receiverPubkey?: string;
  acceptMode?: AcceptMode;
  dryRun?: boolean;
  execute?: boolean;
  yes?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export type SluiceQuote = PrintableReserveAwareQuote;
export type SluiceReadiness = ReadinessCheckResult;
export type SluicePrepareInboundResult = CoordinatorResult;
export type SluiceProvePaymentResult = ProofResult;
