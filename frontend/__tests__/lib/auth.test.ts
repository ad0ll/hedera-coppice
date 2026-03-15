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

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signatures are valid
    mockVerifyMessage.mockResolvedValue(true);
  });

  it("accepts a valid signature with recent timestamp", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: 0xabc\nTimestamp: ${new Date().toISOString()}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", "0xabc")).resolves.toBeUndefined();
    expect(mockVerifyMessage).toHaveBeenCalledWith({
      address: "0xabc",
      message,
      signature: "0xsig",
    });
  });

  it("rejects expired signatures (>60s)", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const oldDate = new Date(Date.now() - 120_000).toISOString();
    const message = `Coppice - Test\nAddress: 0xabc\nTimestamp: ${oldDate}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", "0xabc")).rejects.toThrow("expired");
  });

  it("rejects messages missing timestamp", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const message = "Coppice - Test\nAddress: 0xabc\nNonce: abc123";
    await expect(verifyAuth(message, "0xsig", "0xabc")).rejects.toThrow("missing timestamp");
  });

  it("rejects invalid signatures", async () => {
    mockVerifyMessage.mockResolvedValue(false);
    const { verifyAuth } = await import("@/lib/auth");
    const message = `Coppice - Test\nAddress: 0xabc\nTimestamp: ${new Date().toISOString()}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xbadsig", "0xabc")).rejects.toThrow("Invalid signature");
  });

  it("rejects future timestamps (>5s ahead)", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const futureDate = new Date(Date.now() + 30_000).toISOString();
    const message = `Coppice - Test\nAddress: 0xabc\nTimestamp: ${futureDate}\nNonce: abc123`;
    await expect(verifyAuth(message, "0xsig", "0xabc")).rejects.toThrow("future");
  });
});
