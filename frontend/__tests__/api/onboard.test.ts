import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { OnboardEvent } from "@/app/api/onboard/route";

// Mock contract method results
const mockContains = vi.fn().mockResolvedValue(false);
const mockIdentity = vi.fn().mockResolvedValue("0xExistingIdentity");
const mockRegisterIdentity = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xregisterhash" }),
});
const mockAddClaim = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xclaimhash" }),
});

// Mock factory deploy result
const mockDeploy = vi.fn().mockResolvedValue({
  deploymentTransaction: vi.fn().mockReturnValue({
    wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xdeployhash" }),
  }),
  getAddress: vi.fn().mockResolvedValue("0x1234567890abcdef1234567890abcdef12345678"),
});

// Track signMessage calls
const mockSignMessage = vi.fn().mockResolvedValue("0xfakesignature");

// ethers.Contract mock — returns object with all methods used by the route.
// Both read-only (provider) and write (wallet) Contract instances get the same mock.
function MockContract() {
  return {
    contains: (...args: unknown[]) => mockContains(...args),
    identity: (...args: unknown[]) => mockIdentity(...args),
    registerIdentity: (...args: unknown[]) => mockRegisterIdentity(...args),
    addClaim: (...args: unknown[]) => mockAddClaim(...args),
  };
}

// ethers.ContractFactory mock
function MockContractFactory() {
  return {
    deploy: (...args: unknown[]) => mockDeploy(...args),
  };
}

// ethers.Wallet mock (for claim issuer signing key)
function MockWallet() {
  return {
    address: "0xClaimIssuerSigner",
    signMessage: (...args: unknown[]) => mockSignMessage(...args),
  };
}

vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
      ContractFactory: MockContractFactory,
      Wallet: MockWallet,
    },
  };
});

// Mock deployer utilities
vi.mock("@/lib/deployer", () => ({
  getDeployerWallet: vi.fn().mockReturnValue({
    address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
  }),
  getServerProvider: vi.fn().mockReturnValue({}),
}));

// Mock auth — default: accept all signatures
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Mock retry — execute immediately without retries
vi.mock("@/lib/retry", () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
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

/** Parse SSE events from a Response body stream. */
async function parseSSEEvents(res: Response): Promise<OnboardEvent[]> {
  const text = await res.text();
  const events: OnboardEvent[] = [];
  for (const line of text.split("\n\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ")) {
      events.push(JSON.parse(trimmed.slice(6)));
    }
  }
  return events;
}

describe("POST /api/onboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContains.mockResolvedValue(false);
    mockIdentity.mockResolvedValue("0xExistingIdentity");
    mockRegisterIdentity.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xregisterhash" }),
    });
    mockAddClaim.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xclaimhash" }),
    });
    mockDeploy.mockResolvedValue({
      deploymentTransaction: vi.fn().mockReturnValue({
        wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xdeployhash" }),
      }),
      getAddress: vi.fn().mockResolvedValue("0x1234567890abcdef1234567890abcdef12345678"),
    });
    mockSignMessage.mockResolvedValue("0xfakesignature");
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
    expect(data.error).toBe("Invalid address");
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
    mockContains.mockResolvedValueOnce(true);
    mockIdentity.mockResolvedValueOnce("0xExistingIdentity");
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

  it("streams SSE events for successful onboarding", async () => {
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const events = await parseSSEEvents(res);

    // Should have step events for each transaction + complete event
    const stepEvents = events.filter((e) => e.type === "step");
    const completeEvents = events.filter((e) => e.type === "complete");

    // 5 steps, each emits 2 events (start + done with txHash) = 10 step events
    expect(stepEvents.length).toBe(10);
    expect(completeEvents.length).toBe(1);

    // Verify completed steps have tx hashes
    const completedSteps = stepEvents.filter((e) => e.txHash);
    expect(completedSteps.length).toBe(5);

    // Verify complete event has all data
    const complete = completeEvents[0];
    expect(complete.identityAddress).toBeDefined();
    expect(complete.transactions).toBeDefined();
    expect(complete.transactions?.deployIdentity).toBe("0xdeployhash");
    expect(complete.transactions?.registerIdentity).toBe("0xregisterhash");
    expect(complete.transactions?.claimKYC).toBe("0xclaimhash");
    expect(complete.transactions?.claimAML).toBe("0xclaimhash");
    expect(complete.transactions?.claimAccredited).toBe("0xclaimhash");

    // Verify deploy was called once
    expect(mockDeploy).toHaveBeenCalledTimes(1);
    // registerIdentity once + 3 addClaim calls
    expect(mockRegisterIdentity).toHaveBeenCalledTimes(1);
    expect(mockAddClaim).toHaveBeenCalledTimes(3);
  });

  it("streams error event when identity deployment fails", async () => {
    mockDeploy.mockResolvedValueOnce({
      deploymentTransaction: vi.fn().mockReturnValue({
        wait: vi.fn().mockResolvedValue({ status: 0, hash: "0xfailedhash" }),
      }),
      getAddress: vi.fn().mockResolvedValue("0x1234567890abcdef1234567890abcdef12345678"),
    });
    const { POST } = await import("@/app/api/onboard/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_INVESTOR,
      country: 840,
      message: "test",
      signature: "0xsig",
    }));
    // SSE always returns 200 — errors are in the stream
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const events = await parseSSEEvents(res);
    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].error).toMatch(/deployment failed/i);
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
