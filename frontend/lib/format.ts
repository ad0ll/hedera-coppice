import { ethers } from "ethers";
import { EUSD_DECIMALS } from "@/lib/abis";

/**
 * Format a number with locale-aware formatting.
 * Consistent "en-US" locale across all display code.
 */
export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return value.toLocaleString("en-US", opts);
}

/**
 * Format a token balance for display with locale-aware formatting.
 * Handles both bigint (on-chain 18-decimal) and number values.
 */
export function formatBalance(
  value: bigint | number,
  options?: { minimumFractionDigits?: number },
): string {
  const num = typeof value === "bigint" ? Number(ethers.formatEther(value)) : value;
  return formatNumber(num, options);
}

/** Convert raw eUSD balance (HTS integer) to human-readable number. */
export function eusdFromRaw(raw: number): number {
  return raw / 10 ** EUSD_DECIMALS;
}

/**
 * Format a coupon rate for display.
 *
 * ATS coupons use two on-chain conventions depending on when they were deployed:
 *   - rateDecimals=2: rate/10^rd is already a percentage  (425/100 = 4.25%)
 *   - rateDecimals=4: rate/10^rd is a fraction            (425/10000 = 0.0425 → 4.25%)
 *
 * We detect the convention by checking whether the raw division yields a value
 * >= 1 (percentage) or < 1 (fraction).  This is safe for typical bond coupon
 * rates (1–20%).
 */
export function formatRate(rate: number, rateDecimals: number): string {
  const raw = rate / 10 ** rateDecimals;
  const percentage = raw >= 1 ? raw : raw * 100;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Format a timestamp for display.
 * Accepts unix seconds (number), or Mirror Node consensus timestamp (string like "1234567890.123456789").
 */
export function formatTimestamp(
  ts: number | string,
  options?: { includeDate?: boolean },
): string {
  const date =
    typeof ts === "string"
      ? new Date(parseFloat(ts) * 1000)
      : new Date(ts > 1e12 ? ts : ts * 1000);

  if (options?.includeDate) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleTimeString("en-US");
}

/** Truncate an EVM address to a short display form: 0xAbCd...1234 */
export function abbreviateAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  if (suffixLen === 0) return `${address.slice(0, prefixLen)}...`;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/** Extract a human-readable error message from an unknown catch value. */
export function getErrorMessage(err: unknown, maxLength = 80, fallback = "An error occurred"): string {
  if (err instanceof Error) {
    return maxLength > 0 ? err.message.slice(0, maxLength) : err.message;
  }
  return fallback;
}
