import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { CPC_SECURITY_ID, LCCF_CONTRACT_ADDRESS } from "@/lib/constants";
import { getContractLogsByTopic } from "@/lib/mirror-node";

// Verified against real testnet contract logs
const COUPON_SET_TOPIC =
  "0xbeb7fdc8c5c160b79de3e9c869bf2f6b287cbe29eb05d7623537a427231942ee";
const DISTRIBUTION_EXECUTED_TOPIC =
  "0x0ed69aaec5713babf4fa2e03360799844fbc06459205d980bc6691ed07464574";

export interface CouponTxInfo {
  creationTxHash: string | null;
  distributionTxHash: string | null;
}

/**
 * Fetches transaction hashes for coupon creation (CouponSet on bond contract)
 * and coupon distribution (DistributionExecuted on LCCF contract) from Mirror Node.
 * Returns a map of couponId -> { creationTxHash, distributionTxHash }.
 */
export function useCouponTxs() {
  return useQuery({
    queryKey: ["coupon-txs", CPC_SECURITY_ID, LCCF_CONTRACT_ADDRESS],
    queryFn: async (): Promise<Record<number, CouponTxInfo>> => {
      const [couponSetLogs, distributionLogs] = await Promise.all([
        getContractLogsByTopic(CPC_SECURITY_ID, COUPON_SET_TOPIC),
        getContractLogsByTopic(LCCF_CONTRACT_ADDRESS, DISTRIBUTION_EXECUTED_TOPIC),
      ]);

      const result: Record<number, CouponTxInfo> = {};

      // CouponSet events: topic0=sig, topic1=corporateActionId (indexed bytes32)
      // data contains: couponId (uint256) + operator (address) + coupon struct
      // But actually CouponSet(bytes32 corporateActionId, uint256 couponId, address indexed operator, ...)
      // topic0=sig, topic1=operator (indexed) — couponId is in the data
      // Let's decode from ABI: non-indexed params are in data
      for (const log of couponSetLogs) {
        if (!log.transaction_hash || !log.data) continue;
        try {
          // CouponSet has: bytes32 corporateActionId (non-indexed), uint256 couponId (non-indexed),
          // address operator (indexed), tuple coupon (non-indexed)
          // So data = abi.encode(bytes32, uint256, tuple(...))
          // couponId is the second word (bytes 32-63)
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["bytes32", "uint256"],
            ethers.dataSlice(log.data, 0, 64),
          );
          const couponId = Number(decoded[1]);
          if (!result[couponId]) {
            result[couponId] = { creationTxHash: null, distributionTxHash: null };
          }
          result[couponId].creationTxHash = log.transaction_hash;
        } catch {
          // Skip malformed logs
        }
      }

      // DistributionExecuted events: all params non-indexed
      // data = abi.encode(uint256 distributionID, uint256 pageIndex, uint256 pageLength, address[] failed, address[] succeeded, uint256[] paidAmount)
      // distributionID is the first word (bytes 0-31) and matches couponId
      for (const log of distributionLogs) {
        if (!log.transaction_hash || !log.data) continue;
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["uint256"],
            ethers.dataSlice(log.data, 0, 32),
          );
          const couponId = Number(decoded[0]);
          if (!result[couponId]) {
            result[couponId] = { creationTxHash: null, distributionTxHash: null };
          }
          result[couponId].distributionTxHash = log.transaction_hash;
        } catch {
          // Skip malformed logs
        }
      }

      return result;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
