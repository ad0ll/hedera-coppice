import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contract method behavior
const mockHasRole = vi.fn().mockResolvedValue(false);
const mockGrantRole = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});

// ethers.Contract mock — returns an object with both read and write methods.
// The route creates two Contract instances (one with provider, one with wallet).
// Both get the same mock methods so we can control behavior via mockHasRole/mockGrantRole.
function MockContract() {
  return {
    hasRole: (...args: unknown[]) => mockHasRole(...args),
    grantRole: (...args: unknown[]) => mockGrantRole(...args),
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

// Mock deployer utilities
vi.mock("@/lib/deployer", () => ({
  getDeployerWallet: vi.fn().mockReturnValue({
    address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
  }),
  getServerProvider: vi.fn().mockReturnValue({}),
}));

const FAKE_ADDRESS = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

// Mock auth — return fake address by default
const mockRecoverAuthAddress = vi.fn().mockReturnValue(FAKE_ADDRESS);
vi.mock("@/lib/auth", () => ({
  recoverAuthAddress: (...args: unknown[]) => mockRecoverAuthAddress(...args),
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  CPC_SECURITY_ID: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
}));

// Set env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);

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
    mockHasRole.mockResolvedValue(false);
    mockGrantRole.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
    });
  });

  it("rejects invalid JSON body", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const req = new NextRequest("http://localhost:3000/api/demo/grant-agent-role", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("rejects missing message", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({ signature: "0xsig" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid signature", async () => {
    mockRecoverAuthAddress.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      message: "test",
      signature: "0xbadsig",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when address is already an agent", async () => {
    mockHasRole.mockResolvedValueOnce(true);
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already/i);
  });

  it("returns 409 when grantRole reverts with 'already has role' (TOCTOU race)", async () => {
    mockGrantRole.mockRejectedValueOnce(new Error("Roles: account already has role"));
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
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
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBe("0xtxhash");
    expect(mockGrantRole).toHaveBeenCalledTimes(1);
  });
});
