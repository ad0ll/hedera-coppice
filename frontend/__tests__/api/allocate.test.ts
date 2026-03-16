import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Track setMessage calls for assertion
const setMessageCalls: string[] = [];

// Mock @hashgraph/sdk — use class pattern for new-able constructors (vitest v4 requirement)
vi.mock("@hashgraph/sdk", () => {
  class MockTopicMessageSubmitTransaction {
    setTopicId() { return this; }
    setMessage(msg: string) { setMessageCalls.push(msg); return this; }
    freezeWith() { return this; }
    sign() { return this; }
    async execute() {
      return { getReceipt: async () => ({ status: { toString: () => "SUCCESS" } }) };
    }
  }
  return {
    TopicMessageSubmitTransaction: MockTopicMessageSubmitTransaction,
    TopicId: { fromString: vi.fn().mockReturnValue({}) },
  };
});

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  getClient: vi.fn().mockReturnValue({
    close: vi.fn(),
  }),
  getOperatorKey: vi.fn().mockReturnValue({}),
}));

// Mock auth — accept all signatures in tests
vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn().mockResolvedValue(undefined),
}));

const originalEnv = { ...process.env };

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/issuer/allocate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/** Valid request body with all required fields. */
function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    project: "Solar Farm Alpha",
    category: "Renewable Energy",
    amount: 50000,
    currency: "USD",
    signerAddress: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE",
    message: "auth",
    signature: "0xsig",
    ...overrides,
  };
}

describe("POST /api/issuer/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMPACT_TOPIC_ID = "0.0.8214935";
  });

  afterEach(() => {
    process.env.IMPACT_TOPIC_ID = originalEnv.IMPACT_TOPIC_ID;
  });

  it("rejects missing project field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.project;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
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
    delete body.signerAddress;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("returns 500 when IMPACT_TOPIC_ID is not configured", async () => {
    delete process.env.IMPACT_TOPIC_ID;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/IMPACT_TOPIC_ID/);
  });

  it("rejects payload exceeding 1KB", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody({ project: "A".repeat(1500) })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/too large/i);
  });

  it("succeeds with valid inputs", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("SUCCESS");
  });

  it("defaults currency to USD when not provided", async () => {
    setMessageCalls.length = 0;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const body = validBody();
    delete body.currency;
    await POST(makeRequest(body));
    expect(setMessageCalls.length).toBeGreaterThan(0);
    const payload = JSON.parse(setMessageCalls[0]);
    expect(payload.data.currency).toBe("USD");
  });
});
