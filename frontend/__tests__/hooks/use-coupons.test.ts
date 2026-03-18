// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// Mock ethers — vitest 4.x requires class-style mocks for constructors
vi.mock("ethers", () => {
  const now = Math.floor(Date.now() / 1000);
  class MockJsonRpcProvider { constructor(..._args: unknown[]) {} }
  class MockContract {
    getCouponCount = vi.fn().mockResolvedValue(2n);
    getCoupon = vi.fn().mockImplementation((id: bigint) => {
      // ATS coupons are 1-indexed
      if (Number(id) === 1) {
        return Promise.resolve({
          coupon: {
            recordDate: BigInt(now - 86400),
            executionDate: BigInt(now - 43200),
            startDate: BigInt(now - 90 * 86400),
            endDate: BigInt(now - 86400),
            fixingDate: BigInt(now - 86400),
            rate: 425n,
            rateDecimals: 4,
            rateStatus: 1,
          },
          snapshotId: 1n,
        });
      }
      return Promise.resolve({
        coupon: {
          recordDate: BigInt(now + 86400 * 170),
          executionDate: BigInt(now + 86400 * 180),
          startDate: BigInt(now),
          endDate: BigInt(now + 86400 * 180),
          fixingDate: BigInt(now + 86400 * 170),
          rate: 425n,
          rateDecimals: 4,
          rateStatus: 1,
        },
        snapshotId: 0n,
      });
    });
  }
  return {
    ethers: {
      JsonRpcProvider: MockJsonRpcProvider,
      Contract: MockContract,
    },
  };
});

import { useCoupons } from "@/hooks/use-coupons";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCoupons", () => {
  it("returns coupon data from the bond contract", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
  });

  it("formats rate as percentage string", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // rate=425 / 10^4 = 0.0425 = 4.25%
    expect(result.current.data![0].rateDisplay).toBe("4.25%");
  });

  it("identifies past vs upcoming coupons", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data![0].status).toBe("paid");
    expect(result.current.data![1].status).toBe("upcoming");
  });

  it("calculates period days correctly", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // Second coupon: endDate - startDate = 180 * 86400 seconds = 180 days
    expect(result.current.data![1].periodDays).toBe(180);
  });
});
