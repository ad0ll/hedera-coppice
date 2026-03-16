import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @hashgraph/sdk — build fresh mock chains each test via factory functions
const mockMintReceipt = vi.fn().mockResolvedValue({});
const mockMintExecute = vi.fn().mockResolvedValue({ getReceipt: mockMintReceipt });
const mockTransferReceipt = vi.fn().mockResolvedValue({});
const mockTransferExecute = vi.fn().mockResolvedValue({ getReceipt: mockTransferReceipt });

function makeMintInstance() {
  return {
    setTokenId: vi.fn().mockReturnThis(),
    setAmount: vi.fn().mockReturnThis(),
    execute: mockMintExecute,
  };
}

function makeTransferInstance() {
  return {
    addTokenTransfer: vi.fn().mockReturnThis(),
    execute: mockTransferExecute,
  };
}

const mockTokenMintTransaction = vi.fn().mockImplementation(function () {
  return makeMintInstance();
});
const mockTransferTransaction = vi.fn().mockImplementation(function () {
  return makeTransferInstance();
});

vi.mock("@hashgraph/sdk", () => ({
  TokenMintTransaction: mockTokenMintTransaction,
  TransferTransaction: mockTransferTransaction,
  TokenId: { fromString: vi.fn().mockReturnValue("0.0.8214937") },
  AccountId: { fromString: vi.fn().mockReturnValue("0.0.8213176") },
  Client: {
    forTestnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      close: vi.fn(),
    }),
  },
  PrivateKey: {
    fromStringECDSA: vi.fn().mockReturnValue("mockKey"),
  },
}));

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  getClient: vi.fn().mockReturnValue({
    setOperator: vi.fn(),
    close: vi.fn(),
  }),
  getOperatorKey: vi.fn().mockReturnValue("mockKey"),
  MIRROR_NODE_URL: "https://testnet.mirrornode.hedera.com",
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock mirror-node for account ID lookup
const mockGetHederaAccountId = vi.fn().mockResolvedValue("0.0.8213185");
vi.mock("@/lib/mirror-node", () => ({
  getHederaAccountId: (...args: unknown[]) => mockGetHederaAccountId(...args),
}));

// Env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.HEDERA_ACCOUNT_ID = "0.0.8213176";
process.env.EUSD_TOKEN_ID = "0.0.8214937";

const VALID_ADDRESS = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/faucet", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/faucet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mock implementations cleared by clearAllMocks
    mockGetHederaAccountId.mockResolvedValue("0.0.8213185");
    mockMintReceipt.mockResolvedValue({});
    mockMintExecute.mockResolvedValue({ getReceipt: mockMintReceipt });
    mockTransferReceipt.mockResolvedValue({});
    mockTransferExecute.mockResolvedValue({ getReceipt: mockTransferReceipt });
    mockTokenMintTransaction.mockImplementation(function () {
      return makeMintInstance();
    });
    mockTransferTransaction.mockImplementation(function () {
      return makeTransferInstance();
    });
  });

  it("returns 400 for missing walletAddress", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid walletAddress (not hex)", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: "not-an-address" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for numeric walletAddress", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: 12345 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and mints+transfers for valid address", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: VALID_ADDRESS }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.amount).toBe(1000);
  });

  it("calls TokenMintTransaction with correct amount (100000 = 1000.00 eUSD)", async () => {
    // Capture the instance created by the constructor
    let capturedInstance: ReturnType<typeof makeMintInstance> | undefined;
    mockTokenMintTransaction.mockImplementationOnce(function () {
      capturedInstance = makeMintInstance();
      return capturedInstance;
    });

    const { POST } = await import("@/app/api/faucet/route");
    await POST(makeRequest({ walletAddress: VALID_ADDRESS }));

    expect(capturedInstance).toBeDefined();
    expect(capturedInstance!.setAmount).toHaveBeenCalledWith(100000);
  });

  it("returns 500 when Hedera SDK mint fails", async () => {
    mockMintExecute.mockRejectedValueOnce(new Error("INSUFFICIENT_PAYER_BALANCE"));
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: VALID_ADDRESS }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 when mirror node cannot resolve wallet address", async () => {
    mockGetHederaAccountId.mockRejectedValueOnce(new Error("Mirror Node returned 404"));
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: VALID_ADDRESS }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/could not resolve/i);
  });
});
