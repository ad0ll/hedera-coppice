import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });
});
