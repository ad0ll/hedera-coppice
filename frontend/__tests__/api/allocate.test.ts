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

describe("POST /api/issuer/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMPACT_TOPIC_ID = "0.0.8214935";
    process.env.DEPLOYER_ADDRESS = "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE";
  });

  afterEach(() => {
    process.env.IMPACT_TOPIC_ID = originalEnv.IMPACT_TOPIC_ID;
    process.env.DEPLOYER_ADDRESS = originalEnv.DEPLOYER_ADDRESS;
  });

  it("rejects missing project field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      category: "Renewable Energy",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("rejects missing category field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing amount field", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects non-string project", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: 123,
      category: "Renewable Energy",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects non-number amount", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: "1000",
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing auth fields", async () => {
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("returns 500 when DEPLOYER_ADDRESS is not configured", async () => {
    delete process.env.DEPLOYER_ADDRESS;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/DEPLOYER_ADDRESS/);
  });

  it("returns 500 when IMPACT_TOPIC_ID is not configured", async () => {
    delete process.env.IMPACT_TOPIC_ID;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/IMPACT_TOPIC_ID/);
  });

  it("rejects payload exceeding 1KB", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "A".repeat(1500),
      category: "Renewable Energy",
      amount: 1000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/too large/i);
  });

  it("succeeds with valid inputs", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm Alpha",
      category: "Renewable Energy",
      amount: 50000,
      currency: "USD",
      message: "auth",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("SUCCESS");
  });

  it("defaults currency to USD when not provided", async () => {
    setMessageCalls.length = 0;
    vi.resetModules();
    const { POST } = await import("@/app/api/issuer/allocate/route");
    await POST(makeRequest({
      project: "Wind Farm",
      category: "Renewable Energy",
      amount: 25000,
      message: "auth",
      signature: "0xsig",
    }));
    expect(setMessageCalls.length).toBeGreaterThan(0);
    const payload = JSON.parse(setMessageCalls[0]);
    expect(payload.data.currency).toBe("USD");
  });
});
