"use client";

import { useCallback } from "react";
import { usePublicClient } from "wagmi";
import { type Address, zeroAddress } from "viem";
import { identityRegistryAbi, claimIssuerAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

/** Claim topic IDs used in our T-REX deployment. */
export const CLAIM_TOPICS = { KYC: 1, AML: 2, ACCREDITED: 7 } as const;
export type ClaimTopic = (typeof CLAIM_TOPICS)[keyof typeof CLAIM_TOPICS];

export interface ClaimStatus {
  kyc: boolean;
  aml: boolean;
  accredited: boolean;
}

export function useIdentity() {
  const publicClient = usePublicClient();

  const isVerified = useCallback(async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "isVerified",
        args: [address],
      });
    } catch {
      return false;
    }
  }, [publicClient]);

  const getCountry = useCallback(async (address: Address): Promise<number> => {
    if (!publicClient) return 0;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "investorCountry",
        args: [address],
      });
    } catch {
      return 0;
    }
  }, [publicClient]);

  const getIdentity = useCallback(async (address: Address): Promise<Address> => {
    if (!publicClient) return zeroAddress;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "identity",
        args: [address],
      });
    } catch {
      return zeroAddress;
    }
  }, [publicClient]);

  const isRegistered = useCallback(async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "contains",
        args: [address],
      });
    } catch {
      return false;
    }
  }, [publicClient]);

  const getClaimStatus = useCallback(async (address: Address): Promise<ClaimStatus> => {
    const none: ClaimStatus = { kyc: false, aml: false, accredited: false };
    if (!publicClient) return none;
    try {
      const identityAddr = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "identity",
        args: [address],
      });
      if (identityAddr === zeroAddress) return none;

      const [kycClaims, amlClaims, accreditedClaims] = await Promise.all([
        publicClient.readContract({
          address: identityAddr,
          abi: claimIssuerAbi,
          functionName: "getClaimIdsByTopic",
          args: [BigInt(CLAIM_TOPICS.KYC)],
        }),
        publicClient.readContract({
          address: identityAddr,
          abi: claimIssuerAbi,
          functionName: "getClaimIdsByTopic",
          args: [BigInt(CLAIM_TOPICS.AML)],
        }),
        publicClient.readContract({
          address: identityAddr,
          abi: claimIssuerAbi,
          functionName: "getClaimIdsByTopic",
          args: [BigInt(CLAIM_TOPICS.ACCREDITED)],
        }),
      ]);

      return {
        kyc: kycClaims.length > 0,
        aml: amlClaims.length > 0,
        accredited: accreditedClaims.length > 0,
      };
    } catch {
      return none;
    }
  }, [publicClient]);

  return { isVerified, getCountry, getIdentity, isRegistered, getClaimStatus };
}
