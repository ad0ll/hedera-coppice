import { ethers } from "ethers";

/**
 * Client-side: sign an auth message proving wallet ownership.
 * Uses EIP-191 personal_sign via ethers BrowserProvider (MetaMask).
 */
export async function signAuthMessage(
  address: string,
  purpose: string,
): Promise<{ message: string; signature: string }> {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const message = `Coppice - ${purpose}\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);

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

  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("Invalid signature");
  }
}

/**
 * Server-side: recover the signer's address from an EIP-191 signature.
 * Validates timestamp freshness (same rules as verifyAuth).
 * Returns the checksummed recovered address.
 */
export function recoverAuthAddress(
  message: string,
  signature: string,
): string {
  validateTimestamp(message);
  return ethers.verifyMessage(message, signature);
}
