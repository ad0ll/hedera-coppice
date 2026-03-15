import { formatEther } from "viem";

/**
 * Format a token balance for display with locale-aware formatting.
 * Handles both bigint (on-chain 18-decimal) and number values.
 */
export function formatBalance(
  value: bigint | number,
  options?: { minimumFractionDigits?: number },
): string {
  const num = typeof value === "bigint" ? Number(formatEther(value)) : value;
  return num.toLocaleString("en-US", options);
}

/** Truncate an EVM address to a short display form: 0xAbCd...1234 */
export function abbreviateAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/** Extract a human-readable error message from an unknown catch value. */
export function getErrorMessage(err: unknown, maxLength = 80, fallback = "An error occurred"): string {
  if (err instanceof Error) {
    return maxLength > 0 ? err.message.slice(0, maxLength) : err.message;
  }
  return fallback;
}
