import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

const mockPaused = vi.fn();

vi.mock("../hooks/useToken", () => ({
  useToken: () => ({
    mint: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    paused: mockPaused,
    setAddressFrozen: vi.fn(),
    isAgent: vi.fn(),
    loading: false,
  }),
}));

vi.mock("../providers/WalletProvider", () => ({
  useWallet: () => ({
    account: "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee",
    signer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../components/ProjectAllocation", () => ({
  ProjectAllocation: () => null,
}));

describe("IssuerDashboard polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPaused.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("polls paused status every 10 seconds", async () => {
    const { IssuerDashboard } = await import("../pages/IssuerDashboard");

    await act(async () => {
      render(<IssuerDashboard />);
    });
    expect(mockPaused).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockPaused).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(mockPaused).toHaveBeenCalledTimes(3);
  });

  it("cleans up interval on unmount", async () => {
    const { IssuerDashboard } = await import("../pages/IssuerDashboard");

    let unmount: () => void;
    await act(async () => {
      const result = render(<IssuerDashboard />);
      unmount = result.unmount;
    });
    expect(mockPaused).toHaveBeenCalledTimes(1);

    unmount!();

    // After unmount, advancing timers should NOT trigger more calls
    const callCount = mockPaused.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(mockPaused).toHaveBeenCalledTimes(callCount);
  });
});
