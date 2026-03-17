// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock the wallet button
vi.mock("@/components/wallet-button", () => ({
  WalletButton: () => <button>Mock Wallet</button>,
}));

// Mock the ATS context
vi.mock("@/contexts/ats-context", () => ({
  useConnection: () => ({ address: undefined, isConnected: false }),
  useAts: () => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import { Nav } from "@/components/nav";

describe("Nav", () => {
  it("renders all 5 navigation links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Invest" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coupons" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impact" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Issuer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compliance" })).toBeInTheDocument();
  });

  it("links to correct paths", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Invest" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Coupons" })).toHaveAttribute("href", "/coupons");
    expect(screen.getByRole("link", { name: "Impact" })).toHaveAttribute("href", "/impact");
    expect(screen.getByRole("link", { name: "Issuer" })).toHaveAttribute("href", "/issue");
    expect(screen.getByRole("link", { name: "Compliance" })).toHaveAttribute("href", "/monitor");
  });
});
