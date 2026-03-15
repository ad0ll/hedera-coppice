import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Shared sentinel so receipt.status === Status.Success passes
const STATUS_SUCCESS = Symbol("SUCCESS");

// Mock @hashgraph/sdk — use class pattern for new-able constructors (vitest v4 requirement)
vi.mock("@hashgraph/sdk", () => {
  class MockTransferTransaction {
    addTokenTransfer() { return this; }
    freezeWith() { return this; }
    sign() { return this; }
    async execute() {
      return {
        transactionId: { toString: () => "0.0.123@456" },
        getReceipt: async () => ({ status: STATUS_SUCCESS }),
      };
    }
  }
  return {
    TransferTransaction: MockTransferTransaction,
    TokenId: { fromString: vi.fn().mockReturnValue({}) },
    AccountId: { fromString: vi.fn().mockReturnValue({}) },
    PrivateKey: { fromStringECDSA: vi.fn().mockReturnValue({}) },
    Status: { Success: STATUS_SUCCESS },
  };
});

// Mock viem
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createWalletClient: vi.fn().mockReturnValue({
      writeContract: vi.fn().mockResolvedValue("0xminthash"),
    }),
    createPublicClient: vi.fn().mockReturnValue({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: "0xminthash",
      }),
    }),
  };
});

// Fake keys used only in this test — NOT real wallet keys
const FAKE_ALICE_KEY = "0x" + "aa".repeat(32);
const FAKE_DEPLOYER_KEY = "0x" + "dd".repeat(32);
const FAKE_ALICE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";
const FAKE_DEPLOYER_ADDR = "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE";

vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual<typeof import("viem/accounts")>("viem/accounts");
  return {
    ...actual,
    privateKeyToAccount: vi.fn().mockImplementation((key: string) => ({
      address: key === FAKE_ALICE_KEY ? FAKE_ALICE_ADDR : FAKE_DEPLOYER_ADDR,
    })),
  };
});

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  getClient: vi.fn().mockReturnValue({
    close: vi.fn(),
  }),
  getOperatorKey: vi.fn().mockReturnValue({}),
  MIRROR_NODE_URL: "https://testnet.mirrornode.hedera.com",
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock wagmi config
vi.mock("@/lib/wagmi", () => ({
  hederaTestnet: { id: 296, name: "Hedera Testnet" },
}));

// Mock @coppice/abi
vi.mock("@coppice/abi", () => ({
  tokenAbi: [],
}));

// Set env vars for buildWalletKeys — using fake keys, not real wallet keys
process.env.ALICE_PRIVATE_KEY = FAKE_ALICE_KEY;
process.env.ALICE_ACCOUNT_ID = "0.0.8213185";
process.env.DEPLOYER_PRIVATE_KEY = FAKE_DEPLOYER_KEY;
process.env.HEDERA_ACCOUNT_ID = "0.0.8213176";
process.env.EUSD_TOKEN_ID = "0.0.8214937";
process.env.TOKEN_ADDRESS = "0x17e19B53981370a904d0003Ba2D336837a43cbf0";

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
    // Mock fetch for eUSD balance check
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tokens: [{ token_id: "0.0.8214937", balance: 100000 }],
      }),
    }));
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

  it("rejects unknown wallet address", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: "0x0000000000000000000000000000000000000001",
      amount: 10,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/unknown wallet/i);
  });

  it("rejects insufficient eUSD balance", async () => {
    // Mock mirror node returning low balance
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tokens: [{ token_id: "0.0.8214937", balance: 100 }], // 1.00 eUSD
      }),
    }));

    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 10,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/insufficient eusd/i);
  });

  it("succeeds with valid inputs and sufficient balance", async () => {
    const { POST } = await import("@/app/api/purchase/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ALICE_ADDR,
      amount: 5,
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mintTxHash).toBe("0xminthash");
    expect(data.eusdTxId).toBeDefined();
  });
});
