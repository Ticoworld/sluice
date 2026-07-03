export const SHANNONS_PER_CKB = 100_000_000n;

export const DEFAULT_ACCEPT_SIDE_RESERVE_SHANNONS = 9_900_000_000n;

const MINIMUM_FEE_HEADROOM_SHANNONS = 20n * SHANNONS_PER_CKB;

export function ckbToShannons(amount: string): bigint {
  const trimmed = amount.trim();

  if (trimmed.length === 0) {
    throw new Error("CKB amount is required");
  }

  if (trimmed.startsWith("-")) {
    throw new Error("CKB amount must be greater than zero");
  }

  const parts = trimmed.split(".");

  if (parts.length > 2) {
    throw new Error(`Invalid CKB amount: ${amount}`);
  }

  const [wholePart, fractionalPart = ""] = parts;

  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error(`Invalid CKB amount: ${amount}`);
  }

  if (fractionalPart.length > 8) {
    throw new Error("CKB amount cannot have more than 8 decimal places");
  }

  const whole = BigInt(wholePart);
  const fractional = BigInt(fractionalPart.padEnd(8, "0") || "0");

  return whole * SHANNONS_PER_CKB + fractional;
}

export function shannonsToCkbString(shannons: bigint): string {
  if (shannons < 0n) {
    throw new Error("Shannon amount must not be negative");
  }

  const whole = shannons / SHANNONS_PER_CKB;
  const fractional = shannons % SHANNONS_PER_CKB;

  if (fractional === 0n) {
    return whole.toString();
  }

  return `${whole.toString()}.${fractional.toString().padStart(8, "0").replace(/0+$/, "")}`;
}

export function formatCkbAmount(shannons: bigint): string {
  return `${shannonsToCkbString(shannons)} CKB`;
}

export function parseShannons(amount: string): bigint {
  const trimmed = amount.trim();

  if (trimmed.length === 0) {
    throw new Error("Shannon amount is required");
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid shannon amount: ${amount}`);
  }

  return BigInt(trimmed);
}

export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("Denominator must be positive");
  }

  if (numerator < 0n) {
    throw new Error("Numerator must not be negative");
  }

  return (numerator + denominator - 1n) / denominator;
}

export function calculateFeeHeadroom(targetPaymentShannons: bigint): bigint {
  const proportionalHeadroom = ceilDiv(targetPaymentShannons, 10n);
  return proportionalHeadroom > MINIMUM_FEE_HEADROOM_SHANNONS
    ? proportionalHeadroom
    : MINIMUM_FEE_HEADROOM_SHANNONS;
}
