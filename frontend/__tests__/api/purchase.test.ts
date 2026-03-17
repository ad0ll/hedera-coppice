import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contract method behavior
const mockTransferFrom = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});
const mockTransfer = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xrefundhash" }),
});
const mockMint = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});

function MockContract() {
  return {
    transferFrom: (...args: unknown[]) => mockTransferFrom(...args),
    transfer: (...args: unknown[]) => mockTransfer(...args),
    mint: (...args: unknown[]) => mockMint(...args),
  };
}

vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
    },
  };
});

// Mock auth — default: accept all signatures. Individual tests can override.
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Mock deployer utilities
vi.mock("@/lib/deployer", () => ({
  getDeployerWallet: vi.fn().mockReturnValue({
    address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
  }),
  getServerProvider: vi.fn().mockReturnValue({}),
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  EUSD_EVM_ADDRESS: "0x00000000000000000000000000000000007D5999",
  CPC_SECURITY_ID: "0x17e19B53981370a904d0003Ba2D336837a43cbf0",
}));

// Mock mirror-node utilities used by the purchase route
const mockGetHederaAccountId = vi.fn().mockResolvedValue("0.0.8213185");
const mockGetHtsTokenBalance = vi.fn().mockResolvedValue(100000); // raw balance, 2 decimals -> 1000.00 eUSD
vi.mock("@/lib/mirror-node", () => ({
  getHederaAccountId: (...args: unknown[]) => mockGetHederaAccountId(...args),
  getHtsTokenBalance: (...args: unknown[]) => mockGetHtsTokenBalance(...args),
}));

// Fake deployer key -- NOT a real key
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.EUSD_TOKEN_ID = "0.0.8214937";

const FAKE_ALICE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/purchase", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/purchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mirror-node mocks to defaults
    mockGetHederaAccountId.mockResolvedValue("0.0.8213185");
    mockGetHtsTokenBalance.mockResolvedValue(100000); // raw balance, 2 decimals -> 1000.00 eUSD
    // Reset contract mocks to defaults
    mockTransferFrom.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
    });
    mockMint.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
    });
  });

  it("rejects missing investorAddress", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ amount: 10 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects non-string investorAddress", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ investorAddress: 123, amount: 10 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ investorAddress: FAKE_ALICE_ADDR }));
    expect(res.status).toBe(400);
  });

  it("rejects zero amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 0,
    }));
    expect(res.status).toBe(400);
  });

  it("rejects negative amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: -5,
    }));
    expect(res.status).toBe(400);
  });

  it("rejects string amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: "10",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing auth signature", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 10,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects insufficient eUSD balance", async () => {
    // Mock: account lookup succeeds, balance returns low (100 raw = 1.00 eUSD)
    mockGetHtsTokenBalance.mockResolvedValueOnce(100);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 10,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/insufficient eusd/i);
  });

  it("succeeds with valid inputs, auth, and sufficient balance", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mintTxHash).toBe("0xtxhash");
    expect(data.transferTxHash).toBe("0xtxhash");
  });

  it("rejects when verifyAuth throws (invalid signature)", async () => {
    mockVerifyAuth.mockRejectedValueOnce(new Error("Invalid signature"));
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xbadsig",
    }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid signature/i);
  });

  it("returns 500 when eUSD transferFrom receipt has failed status", async () => {
    // Mock transferFrom returning a receipt with failed status
    mockTransferFrom.mockResolvedValueOnce({
      wait: vi.fn().mockResolvedValue({ status: 0, hash: "0xfailedhash" }),
    });

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/eUSD transfer failed/i);
  });
});
