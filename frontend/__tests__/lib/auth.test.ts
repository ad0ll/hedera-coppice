import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock viem's verifyMessage
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    verifyMessage: vi.fn(),
  };
});

import { verifyMessage } from "viem";
const mockVerifyMessage = vi.mocked(verifyMessage);

// Valid checksummed EVM address for tests (getAddress validates format)
const TEST_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signatures are valid
    mockVerifyMessage.mockResolvedValue(true);
  });

  it("accepts a valid signature with recent timestamp", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${new Date().toISOString()}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", TEST_ADDR)).resolves.toBeUndefined();
    expect(mockVerifyMessage).toHaveBeenCalledWith({
      address: TEST_ADDR,
      message,
      signature: "0xsig",
    });
  });

  it("rejects expired signatures (>60s)", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const oldDate = new Date(Date.now() - 120_000).toISOString();
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${oldDate}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", TEST_ADDR)).rejects.toThrow("expired");
  });

  it("rejects messages missing timestamp", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", TEST_ADDR)).rejects.toThrow("missing timestamp");
  });

  it("rejects invalid signatures", async () => {
    mockVerifyMessage.mockResolvedValue(false);
    const { verifyAuth } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${new Date().toISOString()}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xbadsig", TEST_ADDR)).rejects.toThrow("Invalid signature");
  });

  it("rejects future timestamps (>5s ahead)", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const futureDate = new Date(Date.now() + 30_000).toISOString();
    const message = `Coppice - Test\nAddress: ${TEST_ADDR}\nTimestamp: ${futureDate}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", TEST_ADDR)).rejects.toThrow("future");
  });
});
