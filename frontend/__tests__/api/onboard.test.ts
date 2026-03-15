import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock deployer utilities — the onboard route imports from @/lib/deployer
const mockWriteContract = vi.fn().mockResolvedValue("0xtxhash");
const mockDeployContract = vi.fn().mockResolvedValue("0xdeployhash");
const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
  transactionHash: "0xtxhash",
  status: "success",
  contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
});
const mockReadContract = vi.fn().mockResolvedValue(false); // default: not registered

vi.mock("@/lib/deployer", () => ({
  getDeployerAccount: vi.fn().mockReturnValue({
    address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
  }),
  getDeployerWalletClient: vi.fn().mockReturnValue({
    account: { address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE" },
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
    deployContract: (...args: unknown[]) => mockDeployContract(...args),
  }),
  getServerPublicClient: vi.fn().mockReturnValue({
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
    readContract: (...args: unknown[]) => mockReadContract(...args),
  }),
}));

// Mock viem — need real getAddress and encoding utils, mock signMessage
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return { ...actual };
});

// Mock viem/accounts — privateKeyToAccount for claim issuer signing
vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual<typeof import("viem/accounts")>("viem/accounts");
  return {
    ...actual,
    privateKeyToAccount: vi.fn().mockReturnValue({
      address: "0xClaimIssuerSigner",
      signMessage: vi.fn().mockResolvedValue("0xfakesignature"),
    }),
  };
});

// Mock auth — default: accept all signatures
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Mock retry — execute immediately without retries
vi.mock("@/lib/retry", () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
}));

// Mock wagmi config
vi.mock("@/lib/wagmi", () => ({
  hederaTestnet: { id: 296, name: "Hedera Testnet" },
}));

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock @coppice/common
vi.mock("@coppice/common", () => ({
  identityRegistryAbi: [],
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  CONTRACT_ADDRESSES: {
    identityRegistry: "0x03ecdB8673d65b81752AC14dAaCa797D846c1B31",
  },
}));

// Set env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.CLAIM_ISSUER_SIGNING_KEY = "0x" + "cc".repeat(32);
process.env.IDENTITY_IMPL_AUTHORITY_ADDRESS = "0x078090f14B9Ac2a4a57A65Da1b085281A50D8fd7";
process.env.CLAIM_ISSUER_ADDRESS = "0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A";

const FAKE_INVESTOR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/onboard", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/onboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: address not yet registered
    mockReadContract.mockResolvedValue(false);
    mockWriteContract.mockResolvedValue("0xtxhash");
    mockDeployContract.mockResolvedValue("0xdeployhash");
    mockWaitForTransactionReceipt.mockResolvedValue({
      transactionHash: "0xtxhash",
      status: "success",
      contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });
  });

  it("rejects invalid JSON body", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const req = new NextRequest("http://localhost:3000/api/onboard", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects missing investorAddress", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing country", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing message/signature", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
    }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid investor address", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: "not-an-address",
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid investor address");
  });

  it("rejects when verifyAuth throws (invalid signature)", async () => {
    mockVerifyAuth.mockRejectedValueOnce(new Error("Invalid signature"));
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xbadsig",
    }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid signature/i);
  });

  it("returns 409 when address is already registered", async () => {
    mockReadContract
      .mockResolvedValueOnce(true) // contains() → true
      .mockResolvedValueOnce("0xExistingIdentity"); // identity() → address
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already registered/i);
    expect(data.identityAddress).toBe("0xExistingIdentity");
  });

  it("succeeds with valid inputs — deploys identity, registers, issues claims", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.identityAddress).toBeDefined();
    expect(data.transactions).toBeDefined();
    expect(data.transactions.deployIdentity).toBe("0xtxhash");
    expect(data.transactions.registerIdentity).toBe("0xtxhash");
    expect(data.transactions.claimKYC).toBe("0xtxhash");
    expect(data.transactions.claimAML).toBe("0xtxhash");
    expect(data.transactions.claimAccredited).toBe("0xtxhash");

    // Verify deployContract was called (identity deployment)
    expect(mockDeployContract).toHaveBeenCalledTimes(1);
    // Verify writeContract was called 4 times (register + 3 claims)
    expect(mockWriteContract).toHaveBeenCalledTimes(4);
  });

  it("returns 500 when identity deployment fails (no contract address)", async () => {
    mockWaitForTransactionReceipt.mockResolvedValueOnce({
      transactionHash: "0xtxhash",
      status: "success",
      contractAddress: null, // no contract deployed
    });
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/deployment failed/i);
  });

  it("returns 500 when missing CLAIM_ISSUER_SIGNING_KEY", async () => {
    const savedKey = process.env.CLAIM_ISSUER_SIGNING_KEY;
    delete process.env.CLAIM_ISSUER_SIGNING_KEY;

    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/CLAIM_ISSUER_SIGNING_KEY/i);

    process.env.CLAIM_ISSUER_SIGNING_KEY = savedKey;
  });
});
