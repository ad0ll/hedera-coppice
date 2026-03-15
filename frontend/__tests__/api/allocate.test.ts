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

const originalEnv = process.env.IMPACT_TOPIC_ID;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/allocate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/allocate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMPACT_TOPIC_ID = "0.0.8214935";
  });

  afterEach(() => {
    process.env.IMPACT_TOPIC_ID = originalEnv;
  });

  it("rejects missing project field", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({ category: "Renewable Energy", amount: 1000 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing fields");
  });

  it("rejects missing category field", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({ project: "Solar Farm", amount: 1000 }));
    expect(res.status).toBe(400);
  });

  it("rejects missing amount field", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({ project: "Solar Farm", category: "Renewable Energy" }));
    expect(res.status).toBe(400);
  });

  it("rejects non-string project", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({ project: 123, category: "Renewable Energy", amount: 1000 }));
    expect(res.status).toBe(400);
  });

  it("rejects non-number amount", async () => {
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({ project: "Solar Farm", category: "Renewable Energy", amount: "1000" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when IMPACT_TOPIC_ID is not configured", async () => {
    delete process.env.IMPACT_TOPIC_ID;
    // Need to re-import to pick up env change
    vi.resetModules();
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm",
      category: "Renewable Energy",
      amount: 1000,
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/IMPACT_TOPIC_ID/);
  });

  it("succeeds with valid inputs", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/allocate/route");
    const res = await POST(makeRequest({
      project: "Solar Farm Alpha",
      category: "Renewable Energy",
      amount: 50000,
      currency: "USD",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("SUCCESS");
  });

  it("defaults currency to USD when not provided", async () => {
    setMessageCalls.length = 0;
    vi.resetModules();
    const { POST } = await import("@/app/api/allocate/route");
    await POST(makeRequest({
      project: "Wind Farm",
      category: "Renewable Energy",
      amount: 25000,
    }));
    expect(setMessageCalls.length).toBeGreaterThan(0);
    const payload = JSON.parse(setMessageCalls[0]);
    expect(payload.data.currency).toBe("USD");
  });
});
