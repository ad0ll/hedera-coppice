"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { identityRegistryAbi, claimIssuerAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, JSON_RPC_URL } from "@/lib/constants";

/** Claim topic IDs used in our T-REX deployment. */
export const CLAIM_TOPICS = { KYC: 1, AML: 2, ACCREDITED: 7 } as const;
export type ClaimTopic = (typeof CLAIM_TOPICS)[keyof typeof CLAIM_TOPICS];

export interface ClaimStatus {
  kyc: boolean;
  aml: boolean;
  accredited: boolean;
}

function getProvider() {
  return new ethers.JsonRpcProvider(JSON_RPC_URL);
}

function getRegistryContract() {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.identityRegistry,
    identityRegistryAbi,
    getProvider(),
  );
}

export function useIdentity() {
  const isVerified = useCallback(async (address: string): Promise<boolean> => {
    try {
      const contract = getRegistryContract();
      return await contract.isVerified(address);
    } catch {
      return false;
    }
  }, []);

  const getCountry = useCallback(async (address: string): Promise<number> => {
    try {
      const contract = getRegistryContract();
      return Number(await contract.investorCountry(address));
    } catch {
      return 0;
    }
  }, []);

  const getIdentity = useCallback(async (address: string): Promise<string> => {
    try {
      const contract = getRegistryContract();
      return await contract.identity(address);
    } catch {
      return ethers.ZeroAddress;
    }
  }, []);

  const isRegistered = useCallback(async (address: string): Promise<boolean> => {
    try {
      const contract = getRegistryContract();
      return await contract.contains(address);
    } catch {
      return false;
    }
  }, []);

  const getClaimStatus = useCallback(async (address: string): Promise<ClaimStatus> => {
    const none: ClaimStatus = { kyc: false, aml: false, accredited: false };
    try {
      const registryContract = getRegistryContract();
      const identityAddr: string = await registryContract.identity(address);
      if (identityAddr === ethers.ZeroAddress) return none;

      const provider = getProvider();
      const identityContract = new ethers.Contract(identityAddr, claimIssuerAbi, provider);

      const [kycClaims, amlClaims, accreditedClaims] = await Promise.all([
        identityContract.getClaimIdsByTopic(BigInt(CLAIM_TOPICS.KYC)),
        identityContract.getClaimIdsByTopic(BigInt(CLAIM_TOPICS.AML)),
        identityContract.getClaimIdsByTopic(BigInt(CLAIM_TOPICS.ACCREDITED)),
      ]);

      return {
        kyc: kycClaims.length > 0,
        aml: amlClaims.length > 0,
        accredited: accreditedClaims.length > 0,
      };
    } catch {
      return none;
    }
  }, []);

  return { isVerified, getCountry, getIdentity, isRegistered, getClaimStatus };
}
