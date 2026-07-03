import {
  DEFAULT_ACCEPT_SIDE_RESERVE_SHANNONS,
  SHANNONS_PER_CKB,
  calculateFeeHeadroom,
  formatCkbAmount,
} from "./reserve.js";

export interface ReserveAwareQuoteInput {
  targetPaymentShannons: bigint;
}

export interface ReserveAwareQuote {
  targetPaymentShannons: bigint;
  receiverReserveShannons: bigint;
  receiverAcceptFundingShannons: bigint;
  feeHeadroomShannons: bigint;
  minimumOpenerFundingShannons: bigint;
  recommendedOpenerFundingShannons: bigint;
  estimatedUsableLiquidityShannons: bigint;
  explanation: string;
}

export interface PrintableQuoteAmount {
  shannons: string;
  ckb: string;
}

export interface PrintableReserveAwareQuote {
  target_payment: PrintableQuoteAmount;
  receiver_reserve_required: PrintableQuoteAmount;
  receiver_accept_funding: PrintableQuoteAmount;
  fee_headroom: PrintableQuoteAmount;
  minimum_opener_funding: PrintableQuoteAmount;
  recommended_opener_funding: PrintableQuoteAmount;
  estimated_usable_liquidity: PrintableQuoteAmount;
  explanation: string;
}

function amountToPrintable(shannons: bigint): PrintableQuoteAmount {
  return {
    shannons: shannons.toString(),
    ckb: formatCkbAmount(shannons),
  };
}

export function buildReserveAwareQuote(input: ReserveAwareQuoteInput): ReserveAwareQuote {
  if (input.targetPaymentShannons <= 0n) {
    throw new Error("Target payment amount must be greater than zero");
  }

  const receiverReserveShannons = DEFAULT_ACCEPT_SIDE_RESERVE_SHANNONS;
  const receiverAcceptFundingShannons = receiverReserveShannons;
  const feeHeadroomShannons = calculateFeeHeadroom(input.targetPaymentShannons);
  const minimumOpenerFundingShannons =
    receiverReserveShannons + input.targetPaymentShannons + feeHeadroomShannons;
  const recommendedOpenerFundingShannons = minimumOpenerFundingShannons;
  const estimatedUsableLiquidityShannons =
    recommendedOpenerFundingShannons - receiverReserveShannons;

  return {
    targetPaymentShannons: input.targetPaymentShannons,
    receiverReserveShannons,
    receiverAcceptFundingShannons,
    feeHeadroomShannons,
    minimumOpenerFundingShannons,
    recommendedOpenerFundingShannons,
    estimatedUsableLiquidityShannons,
    explanation:
      "Reserve-aware testnet quote based on the proved manual Phase 3B flow: the receiver reserves 99 CKB, the opener funds the target plus reserve plus fee headroom, and the channel should be watched through ChannelReady before payment retry.",
  };
}

export function formatReserveAwareQuote(quote: ReserveAwareQuote): PrintableReserveAwareQuote {
  return {
    target_payment: amountToPrintable(quote.targetPaymentShannons),
    receiver_reserve_required: amountToPrintable(quote.receiverReserveShannons),
    receiver_accept_funding: amountToPrintable(quote.receiverAcceptFundingShannons),
    fee_headroom: amountToPrintable(quote.feeHeadroomShannons),
    minimum_opener_funding: amountToPrintable(quote.minimumOpenerFundingShannons),
    recommended_opener_funding: amountToPrintable(quote.recommendedOpenerFundingShannons),
    estimated_usable_liquidity: amountToPrintable(quote.estimatedUsableLiquidityShannons),
    explanation: quote.explanation,
  };
}

export function oneCkbInShannons(): bigint {
  return 1n * SHANNONS_PER_CKB;
}
