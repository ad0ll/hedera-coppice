import type { Address } from "viem";
import {
  tokenAddress as deployedTokenAddress,
  identityRegistryAddress as deployedIrAddress,
  modularComplianceAddress as deployedMcAddress,
} from "@coppice/abi";

export const MIRROR_NODE_URL = import.meta.env.VITE_HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_KEY = import.meta.env.VITE_API_KEY || "";

// Contract addresses: env vars override, else fall back to @coppice/abi baked-in testnet addresses
export const CONTRACT_ADDRESSES: Record<"token" | "identityRegistry" | "compliance", Address> = {
  token: (import.meta.env.VITE_TOKEN_ADDRESS || deployedTokenAddress[296]) as Address,
  identityRegistry: (import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || deployedIrAddress[296]) as Address,
  compliance: (import.meta.env.VITE_COMPLIANCE_ADDRESS || deployedMcAddress[296]) as Address,
};

export const TOPIC_IDS = {
  audit: import.meta.env.VITE_AUDIT_TOPIC_ID || "",
  impact: import.meta.env.VITE_IMPACT_TOPIC_ID || "",
};

export const EUSD_TOKEN_ID = import.meta.env.VITE_EUSD_TOKEN_ID || "";

export const DEMO_WALLETS: Record<string, { label: string; country: string; role: string }> = {
  "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee": { label: "Deployer/Issuer", country: "DE", role: "issuer" },
  "0x4f9ad4fd6623b23bed45e47824b1f224da21d762": { label: "Alice", country: "DE", role: "verified" },
  "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7": { label: "Bob", country: "US", role: "unverified" },
  "0xff3a3d1fec979bb1c6b3b368752b61b249a76f90": { label: "Charlie", country: "CN", role: "restricted" },
  "0x35bccfff4fcafd35ff5b3c412d85fba6ee04bcdf": { label: "Diana", country: "FR", role: "freeze-demo" },
};

export const BOND_DETAILS = {
  name: "Coppice Green Bond",
  symbol: "CPC",
  couponRate: "4.25%",
  maturity: "2028-03-15",
  issuer: "Coppice Finance",
  currency: "eUSD",
};
