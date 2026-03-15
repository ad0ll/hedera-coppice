// Server-only module — shared deployer account and client setup for API routes.
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaTestnet } from "@/lib/wagmi";
import { JSON_RPC_URL } from "@/lib/hedera";

export function getDeployerAccount() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  }
  // Typecast required: env var string needs to be narrowed to viem's branded hex type for privateKeyToAccount
  const keyHex = (deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`) as `0x${string}`;
  return privateKeyToAccount(keyHex);
}

export function getDeployerWalletClient() {
  return createWalletClient({
    account: getDeployerAccount(),
    chain: hederaTestnet,
    transport: http(JSON_RPC_URL),
  });
}

export function getServerPublicClient() {
  return createPublicClient({
    chain: hederaTestnet,
    transport: http(JSON_RPC_URL),
  });
}
