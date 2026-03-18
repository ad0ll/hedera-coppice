import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contract method behavior — eUSD ERC-20
const mockTransferFrom = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});
const mockTransfer = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xrefundhash" }),
});

// Mock contract method behavior — ATS CPC bond
const mockIssue = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});
const mockIsIssuer = vi.fn().mockResolvedValue(true);
const mockAddIssuer = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xissuer" }),
});
const mockGetKycStatusFor = vi.fn().mockResolvedValue(1n);
const mockGrantKyc = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xkyc" }),
});
const mockIsInControlList = vi.fn().mockResolvedValue(true);
const mockAddToControlList = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xwl" }),
});

function MockContract() {
  return {
    transferFrom: (...args: unknown[]) => mockTransferFrom(...args),
    transfer: (...args: unknown[]) => mockTransfer(...args),
    issue: (...args: unknown[]) => mockIssue(...args),
    isIssuer: (...args: unknown[]) => mockIsIssuer(...args),
    addIssuer: (...args: unknown[]) => mockAddIssuer(...args),
    getKycStatusFor: (...args: unknown[]) => mockGetKycStatusFor(...args),
    grantKyc: (...args: unknown[]) => mockGrantKyc(...args),
    isInControlList: (...args: unknown[]) => mockIsInControlList(...args),
    addToControlList: (...args: unknown[]) => mockAddToControlList(...args),
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

const FAKE_ALICE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

// Mock auth — default: return Alice's address. Individual tests can override.
const mockRecoverAuthAddress = vi.fn().mockReturnValue(FAKE_ALICE_ADDR);
vi.mock("@/lib/auth", () => ({
  recoverAuthAddress: (...args: unknown[]) => mockRecoverAuthAddress(...args),
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
  CPC_SECURITY_ID: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
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
    mockIssue.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
    });
    // ATS KYC/whitelist defaults: deployer already issuer, investor already KYC'd and whitelisted
    mockIsIssuer.mockResolvedValue(true);
    mockGetKycStatusFor.mockResolvedValue(BigInt(1));
    mockIsInControlList.mockResolvedValue(true);
  });

  it("rejects missing message and signature", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ amount: 10 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing signature", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ amount: 10, message: "test" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({ message: "test", signature: "0xsig" }));
    expect(res.status).toBe(400);
  });

  it("rejects zero amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      amount: 0,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects negative amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      amount: -5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects string amount", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      amount: "10",
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects insufficient eUSD balance", async () => {
    // Mock: account lookup succeeds, balance returns low (100 raw = 1.00 eUSD)
    mockGetHtsTokenBalance.mockResolvedValueOnce(100);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
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

  it("rejects when recoverAuthAddress throws (invalid signature)", async () => {
    mockRecoverAuthAddress.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
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
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/eUSD transfer failed/i);
  });

  it("grants KYC when investor is not yet KYC'd", async () => {
    mockGetKycStatusFor.mockResolvedValue(BigInt(0));

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(mockGrantKyc).toHaveBeenCalledTimes(1);
    // First arg should be the checksummed investor address
    expect(mockGrantKyc.mock.calls[0][0]).toBe(
      "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762",
    );
  });

  it("skips KYC grant when investor already has KYC status 1", async () => {
    mockGetKycStatusFor.mockResolvedValue(BigInt(1));

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(mockGrantKyc).not.toHaveBeenCalled();
  });

  it("adds investor to control list when not whitelisted", async () => {
    mockIsInControlList.mockResolvedValue(false);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(mockAddToControlList).toHaveBeenCalledTimes(1);
    expect(mockAddToControlList.mock.calls[0][0]).toBe(
      "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762",
    );
  });

  it("skips control list when investor is already whitelisted", async () => {
    mockIsInControlList.mockResolvedValue(true);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(mockAddToControlList).not.toHaveBeenCalled();
  });

  it("registers deployer as issuer when not yet registered", async () => {
    mockIsIssuer.mockResolvedValue(false);

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(mockAddIssuer).toHaveBeenCalledTimes(1);
  });
});
