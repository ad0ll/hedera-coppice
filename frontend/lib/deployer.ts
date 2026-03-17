// Server-only module — shared deployer account and provider setup for API routes.
// Uses ethers v6 (consistent with ATS SDK).
import { ethers } from "ethers";

const JSON_RPC_URL =
  process.env.NEXT_PUBLIC_HEDERA_JSON_RPC || "https://testnet.hashio.io/api";

let cachedProvider: ethers.JsonRpcProvider | null = null;

export function getServerProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  }
  return cachedProvider;
}

export function getDeployerWallet(): ethers.Wallet {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  }
  const keyHex = deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`;
  return new ethers.Wallet(keyHex, getServerProvider());
}

export function getDeployerAddress(): string {
  return getDeployerWallet().address;
}
