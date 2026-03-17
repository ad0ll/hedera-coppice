import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { JSON_RPC_URL, CPC_SECURITY_ID } from "@/lib/constants";

const BOND_ABI = [
  "function getCouponCount() view returns (uint256)",
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
];

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

function formatRateDisplay(rate: number, rateDecimals: number): string {
  const rateValue = rate / 10 ** rateDecimals;
  const percentage = rateValue * 100;
  const displayDecimals = rateDecimals > 2 ? rateDecimals - 2 : 2;
  return `${percentage.toFixed(displayDecimals)}%`;
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons", CPC_SECURITY_ID],
    queryFn: async (): Promise<CouponInfo[]> => {
      const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
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
          rateDisplay: formatRateDisplay(rate, rateDecimals),
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
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
