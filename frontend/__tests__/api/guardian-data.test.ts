import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants
vi.mock("@/lib/constants", () => ({
  GUARDIAN_API_URL: "http://mock-guardian:3100",
  GUARDIAN_POLICY_ID: "test-policy-id",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Restore env vars
const originalEnv = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...originalEnv,
    GUARDIAN_SR_USERNAME: "TestSR",
    GUARDIAN_SR_PASSWORD: "TestSR!",
    GUARDIAN_ISSUER_USERNAME: "TestIssuer",
    GUARDIAN_ISSUER_PASSWORD: "TestIssuer!",
    GUARDIAN_VVB_USERNAME: "TestVerifier",
    GUARDIAN_VVB_PASSWORD: "TestVerifier!",
  };
});

function mockGuardianResponses(overrides?: {
  bondFrameworks?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
  allocations?: Record<string, unknown>[];
  mrvReports?: Record<string, unknown>[];
  verifications?: Record<string, unknown>[];
}) {
  const bf = overrides?.bondFrameworks ?? [
    {
      BondName: "Test Bond",
      TotalIssuanceAmount: 100000,
      SustainabilityPerformanceTarget: "Avoid 10,000 tCO2e per period",
    },
  ];
  const projects = overrides?.projects ?? [
    { ProjectName: "Solar Farm", AnnualTargetCO2e: 5000 },
  ];
  const allocations = overrides?.allocations ?? [
    { ProjectName: "Solar Farm", AllocatedAmountEUSD: 50000 },
  ];
  const mrvReports = overrides?.mrvReports ?? [
    { ProjectName: "Solar Farm", AnnualGHGReduced: 4800 },
  ];
  const verifications = overrides?.verifications ?? [
    { ProjectName: "Solar Farm", VerifiedGHGReduced: 4700, Opinion: "Approved" },
  ];

  function wrapVC(cs: Record<string, unknown>) {
    return {
      hash: "mockHash123",
      topicId: "0.0.1234",
      messageId: "1234567890.000000000",
      document: {
        credentialSubject: [cs],
        issuer: "did:hedera:testnet:mock_0.0.5678",
        issuanceDate: "2026-03-18T00:00:00Z",
        proof: {
          type: "Ed25519Signature2018",
          created: "2026-03-18T00:00:00Z",
          verificationMethod: "did:hedera:testnet:mock#key",
          proofPurpose: "assertionMethod",
          jws: "mock-jws",
        },
      },
    };
  }

  mockFetch.mockImplementation((url: string) => {
    const urlStr = typeof url === "string" ? url : "";

    // Login
    if (urlStr.includes("/accounts/login")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ refreshToken: "mock-refresh" }),
      });
    }

    // Token exchange
    if (urlStr.includes("/accounts/access-token")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ accessToken: "mock-token" }),
      });
    }

    // Viewer blocks
    if (urlStr.includes("view_bond_frameworks")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: bf.map(wrapVC) }),
      });
    }
    if (urlStr.includes("view_projects")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: projects.map(wrapVC) }),
      });
    }
    if (urlStr.includes("view_allocations")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: allocations.map(wrapVC) }),
      });
    }
    if (urlStr.includes("view_mrvs")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mrvReports.map(wrapVC) }),
      });
    }
    if (urlStr.includes("view_verifications")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: verifications.map(wrapVC) }),
      });
    }

    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe("GET /api/guardian/data", () => {
  it("returns aggregated Guardian data", async () => {
    mockGuardianResponses();
    const { GET } = await import("@/app/api/guardian/data/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.bondFramework).toBeTruthy();
    expect(data.bondFramework.BondName).toBe("Test Bond");
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].registration.ProjectName).toBe("Solar Farm");
    expect(data.projects[0].isVerified).toBe(true);
    expect(data.totalAllocatedEUSD).toBe(50000);
    expect(data.allocationPercent).toBe(50);
    expect(data.totalVerifiedCO2e).toBe(4700);
    expect(data.sptTarget).toBe(10000);
    expect(data.sptMet).toBe(false);

    // Evidence metadata from VC wrapper
    expect(data.projects[0].registrationEvidence).toBeTruthy();
    expect(data.projects[0].registrationEvidence.hash).toBe("mockHash123");
    expect(data.projects[0].registrationEvidence.topicId).toBe("0.0.1234");
    expect(data.projects[0].registrationEvidence.issuer).toBe("did:hedera:testnet:mock_0.0.5678");

    // Raw VC documents for download
    expect(data.projects[0].registrationDocument).toBeTruthy();
    expect(data.projects[0].registrationDocument.credentialSubject).toBeTruthy();
  });

  it("matches projects to allocations by ProjectName", async () => {
    mockGuardianResponses({
      projects: [
        { ProjectName: "Alpha" },
        { ProjectName: "Beta" },
      ],
      allocations: [
        { ProjectName: "Beta", AllocatedAmountEUSD: 30000 },
      ],
      mrvReports: [],
      verifications: [],
    });
    const { GET } = await import("@/app/api/guardian/data/route");
    const res = await GET();
    const data = await res.json();

    expect(data.projects[0].allocation).toBeUndefined();
    expect(data.projects[1].allocation?.ProjectName).toBe("Beta");
    expect(data.totalAllocatedEUSD).toBe(30000);
  });

  it("returns sptMet=true when verified CO2e meets target", async () => {
    mockGuardianResponses({
      bondFrameworks: [
        {
          BondName: "Test",
          TotalIssuanceAmount: 100000,
          SustainabilityPerformanceTarget: "Avoid 5,000 tCO2e per period",
        },
      ],
      verifications: [
        { ProjectName: "Solar", VerifiedGHGReduced: 6000, Opinion: "Approved" },
      ],
    });
    const { GET } = await import("@/app/api/guardian/data/route");
    const res = await GET();
    const data = await res.json();

    expect(data.sptTarget).toBe(5000);
    expect(data.totalVerifiedCO2e).toBe(6000);
    expect(data.sptMet).toBe(true);
  });

  it("returns 503 when Guardian login fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/accounts/login")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    const { GET } = await import("@/app/api/guardian/data/route");
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
