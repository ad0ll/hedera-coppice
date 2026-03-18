import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { BOND_ABI } from "@/lib/abis";
import { formatRate } from "@/lib/format";
import { getReadProvider } from "@/lib/provider";

export interface CouponInfo {
  id: number;
  recordDate: number;
  executionDate: number;
  startDate: number;
  endDate: number;
  rate: number;
  rateDecimals: number;
  rateDisplay: string;
  snapshotId: number;
  status: "upcoming" | "record" | "executable" | "paid";
  periodDays: number;
}

function getCouponStatus(coupon: {
  recordDate: number;
  executionDate: number;
}): CouponInfo["status"] {
  const now = Math.floor(Date.now() / 1000);
  if (now < coupon.recordDate) return "upcoming";
  if (now < coupon.executionDate) return "record";
  return "paid";
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons", CPC_SECURITY_ID],
    queryFn: async (): Promise<CouponInfo[]> => {
      try {
        const provider = getReadProvider();
        const bond = new ethers.Contract(CPC_SECURITY_ID, BOND_ABI, provider);

        const count = await bond.getCouponCount();
        const countNum = Number(count);
        if (countNum === 0) return [];

        const coupons: CouponInfo[] = [];
        // ATS coupon IDs are 1-indexed (getCoupon(0) reverts)
        for (let i = 1; i <= countNum; i++) {
          const registered = await bond.getCoupon(i);
          const c = registered.coupon;
          const rate = Number(c.rate);
          const rateDecimals = Number(c.rateDecimals);
          const startDate = Number(c.startDate);
          const endDate = Number(c.endDate);
          const periodDays = Math.round((endDate - startDate) / 86400);

          const info: CouponInfo = {
            id: i,
            recordDate: Number(c.recordDate),
            executionDate: Number(c.executionDate),
            startDate,
            endDate,
            rate,
            rateDecimals,
            rateDisplay: formatRate(rate, rateDecimals),
            snapshotId: Number(registered.snapshotId),
            status: getCouponStatus({
              recordDate: Number(c.recordDate),
              executionDate: Number(c.executionDate),
            }),
            periodDays,
          };
          coupons.push(info);
        }
        return coupons;
      } catch (err) {
        console.error("[useCoupons] Failed to fetch coupon data:", err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
