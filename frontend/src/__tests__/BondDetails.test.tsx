import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BondDetails } from "../components/BondDetails";

// Mock useToken hook
const mockTotalSupply = vi.fn();
const mockPaused = vi.fn();

vi.mock("../hooks/useToken", () => ({
  useToken: () => ({
    totalSupply: mockTotalSupply,
    paused: mockPaused,
  }),
}));

describe("BondDetails", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockTotalSupply.mockResolvedValue(BigInt("100000000000000000000"));
    mockPaused.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders bond name and symbol", async () => {
    await act(async () => {
      render(<BondDetails />);
    });
    expect(screen.getByText("Coppice Green Bond")).toBeInTheDocument();
    // CPC appears in both Symbol field and Total Supply suffix; use getAllByText
    expect(screen.getAllByText("CPC").length).toBeGreaterThanOrEqual(1);
  });

  it("fetches totalSupply and paused on mount", async () => {
    await act(async () => {
      render(<BondDetails />);
    });
    expect(mockTotalSupply).toHaveBeenCalledTimes(1);
    expect(mockPaused).toHaveBeenCalledTimes(1);
  });

  it("polls totalSupply and paused every 10 seconds", async () => {
    await act(async () => {
      render(<BondDetails />);
    });
    expect(mockTotalSupply).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockTotalSupply).toHaveBeenCalledTimes(2);
    expect(mockPaused).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockTotalSupply).toHaveBeenCalledTimes(3);
    expect(mockPaused).toHaveBeenCalledTimes(3);
  });

  it("displays Active when not paused", async () => {
    mockPaused.mockResolvedValue(false);
    await act(async () => {
      render(<BondDetails />);
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("displays Paused when paused", async () => {
    mockPaused.mockResolvedValue(true);
    await act(async () => {
      render(<BondDetails />);
    });
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });
});
