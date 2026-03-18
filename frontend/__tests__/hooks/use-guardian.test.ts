// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useGuardian } from "@/hooks/use-guardian";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_DATA = {
  bondFramework: { BondName: "Test Bond", TotalIssuanceAmount: 100000 },
  projects: [
    {
      registration: { ProjectName: "Solar Farm" },
      isVerified: true,
      verifiedCO2e: 4700,
    },
  ],
  totalAllocatedEUSD: 50000,
  totalIssuanceEUSD: 100000,
  allocationPercent: 50,
  totalVerifiedCO2e: 4700,
  sptTarget: 10000,
  sptMet: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useGuardian", () => {
  it("fetches and returns Guardian data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_DATA),
    });

    const { result } = renderHook(() => useGuardian(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.bondFramework?.BondName).toBe("Test Bond");
    expect(result.current.data?.projects).toHaveLength(1);
    expect(result.current.data?.totalVerifiedCO2e).toBe(4700);
    expect(result.current.data?.sptMet).toBe(false);
  });

  it("returns error when API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { result } = renderHook(() => useGuardian(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/503/);
  });
});
