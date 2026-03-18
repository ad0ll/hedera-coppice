// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// Mock useGuardian hook
const mockUseGuardian = vi.fn();
vi.mock("@/hooks/use-guardian", () => ({
  useGuardian: () => mockUseGuardian(),
}));

import ImpactPage from "@/app/impact/page";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_DATA = {
  bondFramework: {
    BondName: "Coppice Green Bond",
    TotalIssuanceAmount: 100000,
    EligibleICMACategories: "Renewable Energy, Sustainable Water Management",
    ReportingStandard: "ICMA Green Bond Principles (June 2025)",
    RegulatoryFrameworks: "EU Taxonomy Regulation 2020/852",
    EUTaxonomyAlignmentPercent: 85,
    BondContractAddress: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
    LCCFContractAddress: "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350",
    ExternalReviewProvider: "Simulated VVB",
  },
  projects: [
    {
      registration: {
        ProjectName: "Solar Farm Alpha",
        ICMACategory: "Renewable Energy",
        SubCategory: "Solar PV",
        Location: "Berlin, Germany",
        Capacity: 50,
        CapacityUnit: "MW",
      },
      isVerified: true,
      verifiedCO2e: 4700,
      verification: { Opinion: "Approved", VerifiedGHGReduced: 4700 },
      allocation: { AllocatedAmountEUSD: 50000, ShareofFinancingPercent: 50 },
    },
  ],
  totalAllocatedEUSD: 50000,
  totalIssuanceEUSD: 100000,
  allocationPercent: 50,
  totalVerifiedCO2e: 4700,
  sptTarget: 10000,
  sptMet: false,
};

describe("Impact Page", () => {
  it("renders the page title", () => {
    mockUseGuardian.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
  });

  it("shows loading skeletons while data loads", () => {
    mockUseGuardian.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { container } = render(<ImpactPage />, { wrapper });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("displays metrics when data is loaded", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText("tCO\u2082e Verified")).toBeInTheDocument();
    expect(screen.getByText("Proceeds Allocated")).toBeInTheDocument();
    expect(screen.getByText("Projects Funded")).toBeInTheDocument();
    expect(screen.getByText("SPT Status")).toBeInTheDocument();
  });

  it("shows ICMA alignment section", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText("ICMA Compliance Evidence")).toBeInTheDocument();
    expect(screen.getAllByText("Guardian Verified").length).toBeGreaterThanOrEqual(1);
  });

  it("shows reporting frameworks from bond data", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText("ICMA Green Bond Principles (June 2025)")).toBeInTheDocument();
    expect(screen.getByText("EU Taxonomy Regulation 2020/852")).toBeInTheDocument();
  });

  it("shows project cards with Guardian data", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    // Project name appears in both the project card and the allocation breakdown
    expect(screen.getAllByText("Solar Farm Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Solar PV")).toBeInTheDocument();
  });

  it("shows error banner when Guardian is unavailable", () => {
    mockUseGuardian.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Guardian API returned 503"),
    });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText(/Guardian MRV data unavailable/)).toBeInTheDocument();
  });

  it("shows SPT progress", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByText("Sustainability Performance Target")).toBeInTheDocument();
    expect(screen.getByText("Below Target")).toBeInTheDocument();
  });

  it("shows allocation breakdown", () => {
    mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
    render(<ImpactPage />, { wrapper });
    expect(screen.getByRole("heading", { name: "Use of Proceeds" })).toBeInTheDocument();
    expect(screen.getByText("50% allocated")).toBeInTheDocument();
  });
});
