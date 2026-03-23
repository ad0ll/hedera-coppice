import { describe, it, expect } from "vitest";
import { getMinimumCouponRate } from "@/lib/spt-enforcement";

describe("getMinimumCouponRate", () => {
  it("returns base rate when SPT is met", () => {
    const result = getMinimumCouponRate({
      couponRate: "4.25%",
      stepUpBps: 25,
      sptMet: true,
    });
    expect(result).toEqual({
      minimumRate: 4.25,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: true,
    });
  });

  it("returns penalty rate when SPT is not met", () => {
    const result = getMinimumCouponRate({
      couponRate: "4.25%",
      stepUpBps: 25,
      sptMet: false,
    });
    expect(result).toEqual({
      minimumRate: 4.5,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: false,
    });
  });

  it("parses rate without % suffix", () => {
    const result = getMinimumCouponRate({
      couponRate: "3.00",
      stepUpBps: 50,
      sptMet: false,
    });
    expect(result.baseRate).toBe(3);
    expect(result.penaltyRate).toBe(3.5);
    expect(result.minimumRate).toBe(3.5);
  });

  it("returns null when bond framework data is missing", () => {
    const result = getMinimumCouponRate(null);
    expect(result).toBeNull();
  });
});
