import { describe, it, expect, vi } from "vitest";

// Spy on the contract factory functions to verify they receive the singleton provider
const mockGetTokenContract = vi.fn().mockReturnValue({});
const mockGetIdentityRegistryContract = vi.fn().mockReturnValue({});
const mockGetComplianceContract = vi.fn().mockReturnValue({});

vi.mock("../lib/contracts", () => ({
  getTokenContract: (...args: unknown[]) => mockGetTokenContract(...args),
  getIdentityRegistryContract: (...args: unknown[]) => mockGetIdentityRegistryContract(...args),
  getComplianceContract: (...args: unknown[]) => mockGetComplianceContract(...args),
}));

vi.mock("../providers/WalletProvider", () => ({
  useWallet: () => ({ signer: null, account: null, connect: vi.fn(), disconnect: vi.fn() }),
}));

describe("hooks use provider singleton", () => {
  it("useToken passes readProvider to getTokenContract", async () => {
    const { readProvider } = await import("../lib/provider");
    // Force re-import to trigger the hook module's top-level code
    vi.resetModules();
    // Re-mock after reset
    vi.doMock("../lib/contracts", () => ({
      getTokenContract: (...args: unknown[]) => mockGetTokenContract(...args),
      getIdentityRegistryContract: (...args: unknown[]) => mockGetIdentityRegistryContract(...args),
      getComplianceContract: (...args: unknown[]) => mockGetComplianceContract(...args),
    }));
    vi.doMock("../providers/WalletProvider", () => ({
      useWallet: () => ({ signer: null, account: null, connect: vi.fn(), disconnect: vi.fn() }),
    }));

    const { useToken } = await import("../hooks/useToken");
    const { renderHook } = await import("@testing-library/react");
    renderHook(() => useToken());

    expect(mockGetTokenContract).toHaveBeenCalledWith(readProvider);
  });

  it("useIdentity passes readProvider to getIdentityRegistryContract", async () => {
    const { readProvider } = await import("../lib/provider");
    vi.resetModules();
    vi.doMock("../lib/contracts", () => ({
      getTokenContract: (...args: unknown[]) => mockGetTokenContract(...args),
      getIdentityRegistryContract: (...args: unknown[]) => mockGetIdentityRegistryContract(...args),
      getComplianceContract: (...args: unknown[]) => mockGetComplianceContract(...args),
    }));

    const { useIdentity } = await import("../hooks/useIdentity");
    const { renderHook } = await import("@testing-library/react");
    renderHook(() => useIdentity());

    expect(mockGetIdentityRegistryContract).toHaveBeenCalledWith(readProvider);
  });

  it("useCompliance passes readProvider to getComplianceContract", async () => {
    const { readProvider } = await import("../lib/provider");
    vi.resetModules();
    vi.doMock("../lib/contracts", () => ({
      getTokenContract: (...args: unknown[]) => mockGetTokenContract(...args),
      getIdentityRegistryContract: (...args: unknown[]) => mockGetIdentityRegistryContract(...args),
      getComplianceContract: (...args: unknown[]) => mockGetComplianceContract(...args),
    }));

    const { useCompliance } = await import("../hooks/useCompliance");
    const { renderHook } = await import("@testing-library/react");
    renderHook(() => useCompliance());

    expect(mockGetComplianceContract).toHaveBeenCalledWith(readProvider);
  });
});
