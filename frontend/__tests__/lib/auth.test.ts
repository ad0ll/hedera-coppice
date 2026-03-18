import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ethers.verifyMessage
vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      verifyMessage: vi.fn(),
      BrowserProvider: actual.ethers.BrowserProvider,
    },
  };
});

import { ethers } from "ethers";
const mockVerifyMessage = vi.mocked(ethers.verifyMessage);

// Valid checksummed EVM address for tests
const TEST_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

describe("recoverAuthAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signatures are valid — return a checksummed address
    mockVerifyMessage.mockReturnValue(TEST_ADDR);
  });

  it("recovers address from a valid signature with recent timestamp", async () => {
    const { recoverAuthAddress } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${new Date().toISOString()}\nNonce: abc123`;
    const result = recoverAuthAddress(message, "0xsig");
    expect(result).toBe(TEST_ADDR);
    expect(mockVerifyMessage).toHaveBeenCalledWith(message, "0xsig");
  });

  it("rejects expired signatures (>60s)", async () => {
    const { recoverAuthAddress } = await import("@/lib/auth");
    const oldDate = new Date(Date.now() - 120_000).toISOString();
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${oldDate}\nNonce: abc123`;
    expect(() => recoverAuthAddress(message, "0xsig")).toThrow("expired");
  });

  it("rejects messages missing timestamp", async () => {
    const { recoverAuthAddress } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nNonce: abc123`;
    expect(() => recoverAuthAddress(message, "0xsig")).toThrow("missing timestamp");
  });

  it("rejects future timestamps (>5s ahead)", async () => {
    const { recoverAuthAddress } = await import("@/lib/auth");
    const futureDate = new Date(Date.now() + 30_000).toISOString();
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${futureDate}\nNonce: abc123`;
    expect(() => recoverAuthAddress(message, "0xsig")).toThrow("future");
  });
});
