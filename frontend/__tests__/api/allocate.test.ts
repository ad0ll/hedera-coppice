import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth — return deployer address by default
vi.mock("@/lib/auth", () => ({
  recoverAuthAddress: vi.fn().mockReturnValue("0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE"),
}));

// Mock global fetch for Guardian API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const originalEnv = { ...process.env };

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/issuer/allocate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    project: "Solar Farm Alpha",
    category: "Renewable Energy",
    amount: 50000,
    currency: "USD",
    message: "auth",
    signature: "0xsig",
    ...overrides,
  };
}

/** Set up mock fetch to simulate successful Guardian login + allocation POST */
function setupGuardianMocks() {
  mockFetch.mockImplementation(async (url: string) => {
    const urlStr = typeof url === "string" ? url : "";
    if (urlStr.includes("/accounts/login")) {
      return new Response(JSON.stringify({ refreshToken: "mock-refresh" }), { status: 200 });
    }
    if (urlStr.includes("/accounts/access-token")) {
      return new Response(JSON.stringify({ accessToken: "mock-access" }), { status: 200 });
    }
    if (urlStr.includes("/tag/req_allocation_14/blocks")) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  });
}

describe("POST /api/issuer/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GUARDIAN_POLICY_ID = "test-policy-id";
  });

  afterEach(() => {
    process.env.GUARDIAN_POLICY_ID = originalEnv.GUARDIAN_POLICY_ID;
  });

  it("rejects missing project field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.project;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("rejects missing category field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.category;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects missing amount field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.amount;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects non-string project", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody({ project: 123 })));
    expect(res.status).toBe(400);
  });

  it("rejects non-number amount", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody({ amount: "1000" })));
    expect(res.status).toBe(400);
  });

  it("rejects missing auth fields", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.message;
    delete body.signature;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("returns 500 when GUARDIAN_POLICY_ID is not configured", async () => {
    delete process.env.GUARDIAN_POLICY_ID;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/GUARDIAN_POLICY_ID/);
  });

  it("succeeds with valid inputs and submits to Guardian", async () => {
    setupGuardianMocks();
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("GUARDIAN_SUBMITTED");

    // Verify Guardian API was called with correct tag
    const allocationCall = mockFetch.mock.calls.find(
      (call: unknown[]) => typeof call[0] === "string" && call[0].includes("req_allocation_14"),
    );
    expect(allocationCall).toBeTruthy();
  });

  it("returns 502 when Guardian allocation POST fails", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const urlStr = typeof url === "string" ? url : "";
      if (urlStr.includes("/accounts/login")) {
        return new Response(JSON.stringify({ refreshToken: "mock-refresh" }), { status: 200 });
      }
      if (urlStr.includes("/accounts/access-token")) {
        return new Response(JSON.stringify({ accessToken: "mock-access" }), { status: 200 });
      }
      if (urlStr.includes("/tag/req_allocation_14/blocks")) {
        return new Response("Internal server error", { status: 500 });
      }
      return new Response("Not found", { status: 404 });
    });
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/Guardian allocation failed/);
  });
});
