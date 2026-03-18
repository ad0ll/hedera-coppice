import { ethers } from "ethers";
import { JSON_RPC_URL } from "@/lib/constants";

let readProvider: ethers.JsonRpcProvider | null = null;

/**
 * Return a cached read-only JSON-RPC provider.
 * Safe for client-side hooks — reuses a single provider instance
 * to avoid unnecessary GC churn on refetch intervals.
 */
export function getReadProvider(): ethers.JsonRpcProvider {
  if (!readProvider) {
    readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  }
  return readProvider;
}
