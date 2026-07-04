import { FiberRpcError } from "../rpc/client.js";
import type {
  GetInvoiceResult,
  ListPaymentsResult,
  NewInvoiceResult,
  PaymentResult,
} from "../rpc/types.js";
import { prepareInboundChannel, type CoordinatorClient, type CoordinatorExecutionResult, type CoordinatorPlan } from "./coordinator.js";
import {
  buildReserveAwareQuote,
  formatReserveAwareQuote,
  type PrintableQuoteAmount,
  type PrintableReserveAwareQuote,
} from "./quote.js";
import { evaluateReadiness, type ReadinessCheckResult } from "./readiness.js";
import { formatCkbAmount } from "./reserve.js";

export type ProofMode = "dry-run" | "execute";

export interface ProofInput {
  serviceNode: string;
  receiverNode: string;
  receiverPubkey?: string;
  targetPaymentShannons: bigint;
}

export interface ProofOptions {
  execute?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface ProofPaymentAttempt {
  attempted: boolean;
  payment_hash: string;
  invoice_address: string;
  status: string;
  failed_error?: string;
  created_at?: string;
  last_updated_at?: string;
  fee?: PrintableQuoteAmount;
}

export interface ProofPlan {
  service_node: string;
  receiver_node: string;
  receiver_pubkey: string;
  target_payment: PrintableQuoteAmount;
  quote: PrintableReserveAwareQuote;
  invoice_currency: "Fibt";
  invoice_description: string;
  readiness_before: ReadinessCheckResult;
  channel_plan: CoordinatorPlan;
  planned_steps: string[];
}

export interface ProofExecution {
  status: "ready" | "timeout_not_ready" | "funding_aborted" | "rpc_error";
  reason: string;
  invoice_address?: string;
  payment_hash?: string;
  before_payment: ProofPaymentAttempt;
  channel: CoordinatorExecutionResult;
  after_payment: ProofPaymentAttempt;
  receiver_invoice_status?: string;
  service_payment_status?: string;
  final_readiness?: ReadinessCheckResult;
}

export interface ProofResult {
  mode: ProofMode;
  plan: ProofPlan;
  execution?: ProofExecution;
}

export interface ProofClient extends CoordinatorClient {
  newInvoice(params: Record<string, unknown>): Promise<NewInvoiceResult>;
  getInvoice(paymentHash: string): Promise<GetInvoiceResult>;
  sendPayment(params: Record<string, unknown>): Promise<PaymentResult>;
  getPayment(paymentHash: string): Promise<PaymentResult>;
  listPayments(params?: Record<string, unknown>): Promise<ListPaymentsResult>;
}

export interface ProofClients {
  service: ProofClient;
  receiver: ProofClient;
}

export interface ProofRuntime {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const defaultRuntime: ProofRuntime = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function printableAmount(shannons: bigint): PrintableQuoteAmount {
  return {
    shannons: shannons.toString(),
    ckb: formatCkbAmount(shannons),
  };
}

function normalizeStatus(status: unknown): string {
  return typeof status === "string" ? status.toLowerCase() : "";
}

function summarizePayment(result: PaymentResult, paymentHash: string, invoiceAddress: string): ProofPaymentAttempt {
  return {
    attempted: true,
    payment_hash: paymentHash,
    invoice_address: invoiceAddress,
    status: result.status,
    failed_error: result.failed_error ?? undefined,
    created_at: result.created_at.toString(),
    last_updated_at: result.last_updated_at.toString(),
    fee: printableAmount(typeof result.fee === "bigint" ? result.fee : BigInt(result.fee.toString())),
  };
}

async function waitForPaymentStatus(
  client: ProofClient,
  paymentHash: string,
  invoiceAddress: string,
  timeoutMs: number,
  pollIntervalMs: number,
  runtime: ProofRuntime,
): Promise<ProofPaymentAttempt | null> {
  const deadline = runtime.now() + timeoutMs;
  let lastObserved: PaymentResult | undefined;

  while (runtime.now() <= deadline) {
    lastObserved = await client.getPayment(paymentHash);
    if (normalizeStatus(lastObserved.status) === "success") {
      return summarizePayment(lastObserved, paymentHash, invoiceAddress);
    }

    await runtime.sleep(pollIntervalMs);
  }

  if (!lastObserved) {
    return null;
  }

  return summarizePayment(lastObserved, paymentHash, invoiceAddress);
}

async function attemptPayment(
  client: ProofClient,
  paymentHash: string,
  invoiceAddress: string,
  timeoutMs: number,
  pollIntervalMs: number,
  runtime: ProofRuntime,
  requireSuccess: boolean,
): Promise<ProofPaymentAttempt> {
  try {
    const result = await client.sendPayment({ invoice: invoiceAddress });
    const attempt = summarizePayment(result, paymentHash, invoiceAddress);

    if (!requireSuccess || normalizeStatus(result.status) === "success") {
      return attempt;
    }

    const observed = await waitForPaymentStatus(client, paymentHash, invoiceAddress, timeoutMs, pollIntervalMs, runtime);
    return observed ?? attempt;
  } catch (error) {
    const message =
      error instanceof FiberRpcError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    return {
      attempted: true,
      payment_hash: paymentHash,
      invoice_address: invoiceAddress,
      status: "error",
      failed_error: message,
    };
  }
}

function plannedSteps(readiness: ReadinessCheckResult, channelPlan: CoordinatorPlan): string[] {
  if (readiness.readiness_status === "ready") {
    return [
      "receiver is already ready",
      "create the receiver invoice",
      "skip channel mutation because the path already exists",
      "retry the payment and verify success",
    ];
  }

  return [
    "create the receiver invoice",
    "attempt the payment before reserve-aware liquidity is opened",
    ...channelPlan.planned_steps,
    "retry the same invoice after ChannelReady",
    "verify payment get_payment Success and invoice get_invoice Paid",
  ];
}

export async function runPaymentProof(
  clients: ProofClients,
  input: ProofInput,
  options: ProofOptions = {},
  runtime: ProofRuntime = defaultRuntime,
): Promise<ProofResult> {
  const quote = buildReserveAwareQuote({ targetPaymentShannons: input.targetPaymentShannons });
  const readiness = await evaluateReadiness(clients.service, {
    serviceNode: input.serviceNode,
    receiverPubkey: input.receiverPubkey ?? (await clients.receiver.nodeInfo()).pubkey,
    targetPaymentShannons: input.targetPaymentShannons,
  });

  const channelPlanResult = await prepareInboundChannel(
    {
      service: clients.service,
      receiver: clients.receiver,
    },
    {
      serviceNode: input.serviceNode,
      receiverNode: input.receiverNode,
      receiverPubkey: input.receiverPubkey,
      targetPaymentShannons: input.targetPaymentShannons,
    },
    { execute: false },
    runtime,
  );

  const plan: ProofPlan = {
    service_node: input.serviceNode,
    receiver_node: input.receiverNode,
    receiver_pubkey: channelPlanResult.plan.receiver_pubkey,
    target_payment: printableAmount(input.targetPaymentShannons),
    quote: formatReserveAwareQuote(quote),
    invoice_currency: "Fibt",
    invoice_description: "phase 8 before/after payment proof",
    readiness_before: readiness,
    channel_plan: channelPlanResult.plan,
    planned_steps: plannedSteps(readiness, channelPlanResult.plan),
  };

  if (!options.execute) {
    return {
      mode: "dry-run",
      plan,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  if (plan.readiness_before.readiness_status === "ready") {
    return {
      mode: "execute",
      plan,
      execution: {
        status: "ready",
        reason: "Payment readiness was already satisfied before the proof run. No channel was opened.",
        before_payment: {
          attempted: false,
          payment_hash: "",
          invoice_address: "",
          status: "skipped",
        },
        channel: channelPlanResult.execution ?? {
          status: "ready",
          reason: "Payment readiness was already satisfied. No channel was opened.",
          manual_accept_attempted: false,
        },
        after_payment: {
          attempted: false,
          payment_hash: "",
          invoice_address: "",
          status: "skipped",
        },
        final_readiness: readiness,
      },
    };
  }

  if (!clients.service.sendPayment || !clients.receiver.newInvoice || !clients.receiver.getInvoice || !clients.service.getPayment || !clients.service.listPayments) {
    return {
      mode: "execute",
      plan,
      execution: {
        status: "rpc_error",
        reason: "Execution requires invoice and payment RPC methods on both clients.",
        before_payment: {
          attempted: false,
          payment_hash: "",
          invoice_address: "",
          status: "skipped",
        },
        channel: channelPlanResult.execution ?? {
          status: "rpc_error",
          reason: "Channel coordinator did not return an execution result.",
          manual_accept_attempted: false,
        },
        after_payment: {
          attempted: false,
          payment_hash: "",
          invoice_address: "",
          status: "skipped",
        },
      },
    };
  }

  const invoice = await clients.receiver.newInvoice({
    amount: input.targetPaymentShannons,
    currency: "Fibt",
    description: plan.invoice_description,
    allow_mpp: false,
    allow_trampoline_routing: false,
  });

  const paymentHash = invoice.invoice.data.payment_hash;
  const invoiceAddress = invoice.invoice_address;

  const beforePayment = await attemptPayment(
    clients.service,
    paymentHash,
    invoiceAddress,
    Math.min(timeoutMs, 30_000),
    pollIntervalMs,
    runtime,
    false,
  );

  if (normalizeStatus(beforePayment.status) === "success") {
    return {
      mode: "execute",
      plan,
      execution: {
        status: "rpc_error",
        reason: "Before-payment unexpectedly succeeded. The receiver was already payable, so this proof run is not valid.",
        invoice_address: invoiceAddress,
        payment_hash: paymentHash,
        before_payment: beforePayment,
        channel: channelPlanResult.execution ?? {
          status: "ready",
          reason: "Payment readiness was already satisfied. No channel was opened.",
          manual_accept_attempted: false,
        },
        after_payment: {
          attempted: false,
          payment_hash: paymentHash,
          invoice_address: invoiceAddress,
          status: "skipped",
        },
      },
    };
  }

  const channelResult = await prepareInboundChannel(
    {
      service: clients.service,
      receiver: clients.receiver,
    },
    {
      serviceNode: input.serviceNode,
      receiverNode: input.receiverNode,
      receiverPubkey: input.receiverPubkey,
      targetPaymentShannons: input.targetPaymentShannons,
    },
    {
      execute: true,
      timeoutMs,
      pollIntervalMs,
    },
    runtime,
  );

  if (!channelResult.execution || channelResult.execution.status !== "ready") {
    return {
      mode: "execute",
      plan,
      execution: {
        status: channelResult.execution?.status ?? "rpc_error",
        reason: channelResult.execution?.reason ?? "Channel coordination did not return an execution result.",
        invoice_address: invoiceAddress,
        payment_hash: paymentHash,
        before_payment: beforePayment,
        channel: channelResult.execution ?? {
          status: "rpc_error",
          reason: "Channel coordination did not return an execution result.",
          manual_accept_attempted: false,
        },
        after_payment: {
          attempted: false,
          payment_hash: paymentHash,
          invoice_address: invoiceAddress,
          status: "skipped",
        },
      },
    };
  }

  const afterPayment = await attemptPayment(
    clients.service,
    paymentHash,
    invoiceAddress,
    timeoutMs,
    pollIntervalMs,
    runtime,
    true,
  );

  const receiverInvoice = await clients.receiver.getInvoice(paymentHash);
  const servicePayment = await clients.service.getPayment(paymentHash);
  const paymentHistory = await clients.service.listPayments({ status: "Success", limit: 50 });

  const finalReadiness = await evaluateReadiness(clients.service, {
    serviceNode: input.serviceNode,
    receiverPubkey: plan.receiver_pubkey,
    targetPaymentShannons: input.targetPaymentShannons,
  });

  const servicePaymentIncluded = paymentHistory.payments.some((payment) => payment.payment_hash === paymentHash);
  const afterSuccess = normalizeStatus(afterPayment.status) === "success";
  const receiverPaid = receiverInvoice.status.toLowerCase() === "paid";
  const serviceSucceeded = normalizeStatus(servicePayment.status) === "success";

  if (!afterSuccess || !receiverPaid || !serviceSucceeded || !servicePaymentIncluded) {
    return {
      mode: "execute",
      plan,
      execution: {
        status: "rpc_error",
        reason: "The channel became ready, but the payment proof did not complete cleanly.",
        invoice_address: invoiceAddress,
        payment_hash: paymentHash,
        before_payment: beforePayment,
        channel: channelResult.execution,
        after_payment: afterPayment,
        receiver_invoice_status: receiverInvoice.status,
        service_payment_status: servicePayment.status,
        final_readiness: finalReadiness,
      },
    };
  }

  return {
    mode: "execute",
    plan,
    execution: {
      status: "ready",
      reason: "Before-payment failed, the reserve-aware channel reached ChannelReady, and the payment retry succeeded.",
      invoice_address: invoiceAddress,
      payment_hash: paymentHash,
      before_payment: beforePayment,
      channel: channelResult.execution,
      after_payment: afterPayment,
      receiver_invoice_status: receiverInvoice.status,
      service_payment_status: servicePayment.status,
      final_readiness: finalReadiness,
    },
  };
}
