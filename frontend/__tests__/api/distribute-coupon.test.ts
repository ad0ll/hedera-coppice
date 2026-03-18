import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contract method behavior
const mockGetCoupon = vi.fn().mockResolvedValue({
  coupon: {
    recordDate: BigInt(1000000),
    executionDate: BigInt(1000000), // in the past
    startDate: BigInt(900000),
    endDate: BigInt(1100000),
    fixingDate: BigInt(950000),
    rate: BigInt(425),
    rateDecimals: 4,
    rateStatus: 0,
  },
  snapshotId: BigInt(1), // snapshot already taken
});

const mockTakeSnapshot = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xsnapshothash" }),
});

const mockExecuteDistribution = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xdistributehash" }),
});

function MockContract() {
  return {
    getCoupon: (...args: unknown[]) => mockGetCoupon(...args),
    takeSnapshot: (...args: unknown[]) => mockTakeSnapshot(...args),
    executeDistribution: (...args: unknown[]) => mockExecuteDistribution(...args),
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

const FAKE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

// Mock auth — default: return fake address. Individual tests can override.
const mockRecoverAuthAddress = vi.fn().mockReturnValue(FAKE_ADDR);
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
  CPC_SECURITY_ID: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
}));

// Set required env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.LIFECYCLE_CASH_FLOW_ADDRESS = "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/issuer/distribute-coupon", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    couponId: 1,
    message: "auth",
    signature: "0xsig",
    ...overrides,
  };
}

describe("POST /api/issuer/distribute-coupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIFECYCLE_CASH_FLOW_ADDRESS = "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350";

    // Reset mocks to default behavior
    mockGetCoupon.mockResolvedValue({
      coupon: {
        recordDate: BigInt(1000000),
        executionDate: BigInt(1000000),
        startDate: BigInt(900000),
        endDate: BigInt(1100000),
        fixingDate: BigInt(950000),
        rate: BigInt(425),
        rateDecimals: 4,
        rateStatus: 0,
      },
      snapshotId: BigInt(1),
    });
    mockTakeSnapshot.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xsnapshothash" }),
    });
    mockExecuteDistribution.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xdistributehash" }),
    });
    mockRecoverAuthAddress.mockReturnValue(FAKE_ADDR);
  });

  it("rejects missing couponId (400)", async () => {
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const body = validBody();
    delete body.couponId;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing message (400)", async () => {
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const body = validBody();
    delete body.message;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects missing signature (400)", async () => {
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const body = validBody();
    delete body.signature;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects invalid signature (401)", async () => {
    mockRecoverAuthAddress.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid signature/i);
  });

  it("returns 500 when LIFECYCLE_CASH_FLOW_ADDRESS is not configured", async () => {
    delete process.env.LIFECYCLE_CASH_FLOW_ADDRESS;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/LIFECYCLE_CASH_FLOW_ADDRESS/);
  });

  it("rejects when coupon execution date has not passed (400)", async () => {
    // Set execution date far in the future
    mockGetCoupon.mockResolvedValueOnce({
      coupon: {
        recordDate: BigInt(1000000),
        executionDate: BigInt(9999999999),
        startDate: BigInt(900000),
        endDate: BigInt(1100000),
        fixingDate: BigInt(950000),
        rate: BigInt(425),
        rateDecimals: 4,
        rateStatus: 0,
      },
      snapshotId: BigInt(1),
    });
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/execution date/i);
  });

  it("takes snapshot when snapshotId is 0", async () => {
    mockGetCoupon.mockResolvedValueOnce({
      coupon: {
        recordDate: BigInt(1000000),
        executionDate: BigInt(1000000),
        startDate: BigInt(900000),
        endDate: BigInt(1100000),
        fixingDate: BigInt(950000),
        rate: BigInt(425),
        rateDecimals: 4,
        rateStatus: 0,
      },
      snapshotId: BigInt(0), // no snapshot yet
    });
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    expect(mockTakeSnapshot).toHaveBeenCalledOnce();
    expect(mockExecuteDistribution).toHaveBeenCalledOnce();
  });

  it("returns 200 on successful distribution", async () => {
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBe("0xdistributehash");
    expect(data.status).toBe("DISTRIBUTED");
  });

  it("skips snapshot when snapshotId is nonzero", async () => {
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    expect(mockTakeSnapshot).not.toHaveBeenCalled();
    expect(mockExecuteDistribution).toHaveBeenCalledOnce();
  });

  it("returns 500 when executeDistribution throws", async () => {
    mockExecuteDistribution.mockRejectedValueOnce(new Error("Revert: insufficient funds"));
    const { POST } = await import("@/app/api/issuer/distribute-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/insufficient funds/i);
  });
});
