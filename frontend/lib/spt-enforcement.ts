import { GUARDIAN_POLICY_ID } from "@/lib/constants";

export interface SptRateInfo {
  minimumRate: number;
  baseRate: number;
  penaltyRate: number;
  sptMet: boolean;
}

/**
 * Compute the minimum allowed coupon rate based on bond framework and SPT status.
 * Returns null if bond framework data is unavailable.
 */
export function getMinimumCouponRate(
  input: { couponRate: string; stepUpBps: number; sptMet: boolean } | null,
): SptRateInfo | null {
  if (!input) return null;
  const baseRate = parseFloat(input.couponRate.replace("%", ""));
  const penaltyRate = baseRate + input.stepUpBps / 100;
  return {
    minimumRate: input.sptMet ? baseRate : penaltyRate,
    baseRate,
    penaltyRate,
    sptMet: input.sptMet,
  };
}

/**
 * Fetch SPT status from Guardian and compute the minimum coupon rate.
 * Returns null if Guardian is unavailable or bond framework is missing.
 */
export async function fetchSptStatus(): Promise<SptRateInfo | null> {
  const policyId = GUARDIAN_POLICY_ID;
  if (!policyId) return null;

  try {
    // Import Guardian data fetching inline to avoid circular dependencies
    const { fetchGuardianData } = await import("@/lib/guardian-data");
    const data = await fetchGuardianData();
    if (!data?.bondFramework) return null;

    return getMinimumCouponRate({
      couponRate: data.bondFramework.CouponRate,
      stepUpBps: data.bondFramework.CouponStepUpBps,
      sptMet: data.sptMet,
    });
  } catch {
    return null;
  }
}
