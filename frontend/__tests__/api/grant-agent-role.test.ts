import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock deployer utilities
const mockWriteContract = vi.fn().mockResolvedValue("0xtxhash");
const mockReadContract = vi.fn().mockResolvedValue(false); // default: not an agent
const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
  transactionHash: "0xtxhash",
  status: "success",
});

vi.mock("@/lib/deployer", () => ({
  getDeployerWalletClient: vi.fn().mockReturnValue({
    account: { address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE" },
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  }),
  getServerPublicClient: vi.fn().mockReturnValue({
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
    readContract: (...args: unknown[]) => mockReadContract(...args),
  }),
}));

// Mock viem — need real getAddress
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return { ...actual };
});

// Mock auth — accept all signatures
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
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
  tokenAbi: [],
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  CONTRACT_ADDRESSES: {
    token: "0x17e19B53981370a904d0003Ba2D336837a43cbf0",
  },
}));

// Set env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);

const FAKE_ADDRESS = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/demo/grant-agent-role", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/demo/grant-agent-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockResolvedValue(false);
  });

  it("rejects missing investorAddress", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({ message: "test", signature: "0xsig" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid address", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: "not-an-address",
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid address");
  });

  it("rejects invalid signature", async () => {
    mockVerifyAuth.mockRejectedValueOnce(new Error("Invalid signature"));
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xbadsig",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when address is already an agent", async () => {
    mockReadContract.mockResolvedValueOnce(true);
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already/i);
  });

  it("succeeds and returns txHash", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBe("0xtxhash");
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
  });
});
