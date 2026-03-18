"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { identityRegistryAbi, claimIssuerAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, MIRROR_NODE_URL } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";

/** Claim topic IDs used in our T-REX deployment. */
export const CLAIM_TOPICS = { KYC: 1, AML: 2, ACCREDITED: 7 } as const;
export type ClaimTopic = (typeof CLAIM_TOPICS)[keyof typeof CLAIM_TOPICS];

export interface ClaimStatus {
  kyc: boolean;
  aml: boolean;
  accredited: boolean;
}

/** Map of claim topic number to the transaction hash that added the claim. */
export type ClaimTransactions = Map<number, string>;

/**
 * Keccak256 hash of the ClaimAdded event signature:
 * ClaimAdded(bytes32 indexed claimId, uint256 indexed topic, uint256 scheme, address indexed issuer, bytes signature, bytes data, string uri)
 */
const CLAIM_ADDED_TOPIC0 =
  "0x46149b18aa084502c3f12bc75e19eda8bda8d102b82cce8474677a6d0d5f43c5";

/** Mirror Node contract log entry (only the fields we need). */
interface MirrorContractLog {
  topics: string[];
  transaction_hash: string;
}

/** Mirror Node paginated logs response. */
interface MirrorContractLogsResponse {
  logs: MirrorContractLog[];
  links: { next: string | null };
}

/**
 * Query ClaimAdded events from a user's identity contract via the Hedera Mirror Node.
 * Returns a map of claim topic (1=KYC, 2=AML, 7=ACCREDITED) to the transaction hash
 * that added each claim. Uses the most recent ClaimAdded event per topic.
 */
export async function getClaimTransactions(
  identityAddress: string,
): Promise<ClaimTransactions> {
  const result: ClaimTransactions = new Map();

  try {
    // Paginate through all logs from the identity contract looking for ClaimAdded events.
    // Identity contracts are small — typically <10 log entries total.
    let url: string | null =
      `/api/v1/contracts/${identityAddress}/results/logs?limit=100&order=asc`;

    while (url) {
      const res = await fetch(`${MIRROR_NODE_URL}${url}`);
      if (!res.ok) break;

      const data: MirrorContractLogsResponse = await res.json();

      for (const log of data.logs) {
        // ClaimAdded has 4 topics: [eventSig, claimId, topic, issuer]
        if (
          log.topics.length >= 3 &&
          log.topics[0] === CLAIM_ADDED_TOPIC0
        ) {
          // topic2 is the claim topic number (uint256, abi-encoded as 32-byte hex)
          const claimTopic = Number(BigInt(log.topics[2]));
          // Use the latest tx for each topic (overwrite if seen again)
          result.set(claimTopic, log.transaction_hash);
        }
      }

      url = data.links.next;
    }
  } catch {
    // Silently return whatever we have — claim links are best-effort
  }

  return result;
}

function getRegistryContract() {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.identityRegistry,
    identityRegistryAbi,
    getReadProvider(),
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

      const provider = getReadProvider();
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
