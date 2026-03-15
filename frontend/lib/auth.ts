import { verifyMessage, getAddress } from "viem";
import { signMessage } from "@wagmi/core";
import type { Config } from "wagmi";
import type { Address } from "viem";

/**
 * Client-side: sign an auth message proving wallet ownership.
 * Uses EIP-191 personal_sign via wagmi.
 */
export async function signAuthMessage(
  config: Config,
  address: Address,
  purpose: string,
): Promise<{ message: string; signature: string }> {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const message = `Coppice - ${purpose}\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
  const signature = await signMessage(config, { account: address, message });
  return { message, signature };
}

function validateTimestamp(message: string): void {
  const timestampMatch = message.match(/Timestamp: (.+)/);
  if (!timestampMatch) {
    throw new Error("Invalid auth message: missing timestamp");
  }
  const messageTime = new Date(timestampMatch[1]).getTime();
  if (isNaN(messageTime)) {
    throw new Error("Invalid auth message: malformed timestamp");
  }
  const age = Date.now() - messageTime;
  if (age > 60_000) {
    throw new Error("Signature expired (>60s)");
  }
  if (age < -5_000) {
    throw new Error("Signature timestamp is in the future");
  }
}

/**
 * Server-side: verify an EIP-191 signature matches the expected address.
 * Pure cryptographic verification — no RPC call needed.
 * Rejects signatures older than 60 seconds.
 */
export async function verifyAuth(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<void> {
  validateTimestamp(message);

  const isValid = await verifyMessage({
    address: getAddress(expectedAddress),
    message,
    // Typecast required: signature is a hex string but not an address — getAddress doesn't apply
    signature: signature as `0x${string}`,
  });

  if (!isValid) {
    throw new Error("Invalid signature");
  }
}
