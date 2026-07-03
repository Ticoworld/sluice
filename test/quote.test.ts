import { describe, expect, it } from "vitest";
import {
  buildReserveAwareQuote,
  formatReserveAwareQuote,
  oneCkbInShannons,
} from "../src/core/quote.js";
import {
  ckbToShannons,
  formatCkbAmount,
  shannonsToCkbString,
} from "../src/core/reserve.js";

describe("reserve-aware quote helpers", () => {
  it("converts CKB strings to shannons exactly", () => {
    expect(ckbToShannons("1")).toBe(100_000_000n);
    expect(ckbToShannons("1.5")).toBe(150_000_000n);
    expect(ckbToShannons("0.00000001")).toBe(1n);
  });

  it("formats shannons back to exact CKB strings", () => {
    expect(shannonsToCkbString(100_000_000n)).toBe("1");
    expect(shannonsToCkbString(123_456_789n)).toBe("1.23456789");
    expect(formatCkbAmount(99_000_000_000n)).toBe("990 CKB");
  });

  it("builds the proven 1 CKB quote", () => {
    const quote = buildReserveAwareQuote({ targetPaymentShannons: oneCkbInShannons() });

    expect(quote.targetPaymentShannons).toBe(100_000_000n);
    expect(quote.receiverReserveShannons).toBe(9_900_000_000n);
    expect(quote.receiverAcceptFundingShannons).toBe(9_900_000_000n);
    expect(quote.feeHeadroomShannons).toBe(2_000_000_000n);
    expect(quote.minimumOpenerFundingShannons).toBe(12_000_000_000n);
    expect(quote.recommendedOpenerFundingShannons).toBe(12_000_000_000n);
    expect(quote.estimatedUsableLiquidityShannons).toBe(2_100_000_000n);
    expect(quote.explanation).toMatch(/reserve-aware/i);

    const printable = formatReserveAwareQuote(quote);
    expect(printable.recommended_opener_funding.ckb).toBe("120 CKB");
  });

  it("scales to a larger payment target", () => {
    const quote = buildReserveAwareQuote({ targetPaymentShannons: 1_000_000_000n });

    expect(quote.feeHeadroomShannons).toBe(2_000_000_000n);
    expect(quote.minimumOpenerFundingShannons).toBe(12_900_000_000n);
    expect(quote.estimatedUsableLiquidityShannons).toBe(3_000_000_000n);
  });

  it("rejects zero or negative targets", () => {
    expect(() => buildReserveAwareQuote({ targetPaymentShannons: 0n })).toThrow(
      /greater than zero/i,
    );
    expect(() => buildReserveAwareQuote({ targetPaymentShannons: -1n })).toThrow(
      /greater than zero/i,
    );
  });

  it("preserves shannon precision without floating point rounding", () => {
    expect(ckbToShannons("0.00000001")).toBe(1n);
    expect(ckbToShannons("12345.67890123")).toBe(1_234_567_890_123n);
  });
});
