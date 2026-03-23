import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock contract
const mockSetCoupon = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xcouponhash" }),
});
const mockGetCouponCount = vi.fn().mockResolvedValue(BigInt(1));

function MockContract() {
  return {
    setCoupon: (...args: unknown[]) => mockSetCoupon(...args),
    getCouponCount: (...args: unknown[]) => mockGetCouponCount(...args),
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

const mockRecoverAuthAddress = vi.fn().mockReturnValue(FAKE_ADDR);
vi.mock("@/lib/auth", () => ({
  recoverAuthAddress: (...args: unknown[]) => mockRecoverAuthAddress(...args),
}));

vi.mock("@/lib/deployer", () => ({
  getDeployerWallet: vi.fn().mockReturnValue({
    address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
    provider: {
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1000000 }),
    },
  }),
}));

vi.mock("@/lib/constants", () => ({
  CPC_SECURITY_ID: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
  GUARDIAN_API_URL: "https://guardian.coppice.cc",
  GUARDIAN_POLICY_ID: "test-policy-id",
}));

// Mock the SPT enforcement module — we test the pure function separately
const mockFetchSptStatus = vi.fn();
vi.mock("@/lib/spt-enforcement", () => ({
  getMinimumCouponRate: vi.fn(),
  fetchSptStatus: (...args: unknown[]) => mockFetchSptStatus(...args),
}));

process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/issuer/create-coupon", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// All dates well in the future (relative to mock block.timestamp = 1000000)
function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rate: 4.25,
    startDate: "2030-01-01T00:00:00Z",
    recordDate: "2030-03-01T00:00:00Z",
    executionDate: "2030-03-15T00:00:00Z",
    endDate: "2030-06-30T00:00:00Z",
    address: FAKE_ADDR,
    message: "auth",
    signature: "0xsig",
    ...overrides,
  };
}

describe("POST /api/issuer/create-coupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecoverAuthAddress.mockReturnValue(FAKE_ADDR);
    mockSetCoupon.mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xcouponhash" }),
    });
    mockGetCouponCount.mockResolvedValue(BigInt(1));
    // Default: SPT met, base rate is fine
    mockFetchSptStatus.mockResolvedValue({
      minimumRate: 4.25,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: true,
    });
  });

  it("allows base rate when SPT is met (200)", async () => {
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody({ rate: 4.25 })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("rejects rate below penalty minimum when SPT not met (400)", async () => {
    mockFetchSptStatus.mockResolvedValue({
      minimumRate: 4.5,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: false,
    });
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody({ rate: 4.25 })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/4\.5/);
    expect(data.error).toMatch(/SPT/i);
  });

  it("allows penalty rate when SPT not met (200)", async () => {
    mockFetchSptStatus.mockResolvedValue({
      minimumRate: 4.5,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: false,
    });
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody({ rate: 4.5 })));
    expect(res.status).toBe(200);
  });

  it("allows rate above penalty minimum when SPT not met (200)", async () => {
    mockFetchSptStatus.mockResolvedValue({
      minimumRate: 4.5,
      baseRate: 4.25,
      penaltyRate: 4.5,
      sptMet: false,
    });
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody({ rate: 5.0 })));
    expect(res.status).toBe(200);
  });

  it("blocks coupon creation when Guardian is unavailable (503)", async () => {
    mockFetchSptStatus.mockResolvedValue(null);
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/Guardian|SPT/i);
  });

  it("rejects missing rate (400)", async () => {
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const body = validBody();
    delete body.rate;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects invalid signature (401)", async () => {
    mockRecoverAuthAddress.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
  });

  it("returns coupon ID and tx hash on success (200)", async () => {
    const { POST } = await import("@/app/api/issuer/create-coupon/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBe("0xcouponhash");
    expect(data.couponId).toBe(1);
  });
});
