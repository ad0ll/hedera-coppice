import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock viem — keep real parseEther but mock wallet/public clients and verifyMessage
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createWalletClient: vi.fn().mockReturnValue({
      writeContract: vi.fn().mockResolvedValue("0xtxhash"),
    }),
    createPublicClient: vi.fn().mockReturnValue({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: "0xtxhash",
        status: "success",
      }),
    }),
  };
});

// Mock viem/accounts
vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual<typeof import("viem/accounts")>("viem/accounts");
  return {
    ...actual,
    privateKeyToAccount: vi.fn().mockReturnValue({
      address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
    }),
  };
});

// Mock auth — default: accept all signatures. Individual tests can override.
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: mockVerifyAuth,
}));

// Mock wagmi config
vi.mock("@/lib/wagmi", () => ({
  hederaTestnet: { id: 296, name: "Hedera Testnet" },
}));

// Mock @coppice/common
vi.mock("@coppice/common", () => ({
  tokenAbi: [],
}));

// Mock hedera server utils (still needed for MIRROR_NODE_URL, JSON_RPC_URL)
vi.mock("@/lib/hedera", () => ({
  MIRROR_NODE_URL: "https://testnet.mirrornode.hedera.com",
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  EUSD_EVM_ADDRESS: "0x00000000000000000000000000000000007D5999",
}));

// Mock retry — pass through immediately without delays
vi.mock("@/lib/retry", () => ({
  withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
}));

// Fake deployer key — NOT a real key
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.EUSD_TOKEN_ID = "0.0.8214937";
process.env.TOKEN_ADDRESS = "0x17e19B53981370a904d0003Ba2D336837a43cbf0";

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
    // Mock fetch: first call = account lookup, second call = balance check
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ account: "0.0.8213185" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tokens: [{ token_id: "0.0.8214937", balance: 100000 }],
        }),
      }),
    );
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
    // Mock: account lookup succeeds, balance returns low
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ account: "0.0.8213185" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tokens: [{ token_id: "0.0.8214937", balance: 100 }], // 1.00 eUSD
        }),
      }),
    );

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
    // Mock transferFrom receipt returning failed status
    const { createPublicClient } = await import("viem");
    vi.mocked(createPublicClient).mockReturnValue({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: "0xtxhash",
        status: "reverted",
      }),
    // Typecast required: partial mock object doesn't satisfy full PublicClient type
    } as never);

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
