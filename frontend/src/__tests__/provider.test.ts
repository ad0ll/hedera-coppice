import { describe, it, expect } from "vitest";

describe("provider singleton", () => {
  it("exports the same instance on multiple imports", async () => {
    const { readProvider: a } = await import("../lib/provider");
    const { readProvider: b } = await import("../lib/provider");
    expect(a).toBe(b);
  });

  it("is an ethers JsonRpcProvider", async () => {
    const { readProvider } = await import("../lib/provider");
    expect(readProvider).toBeDefined();
    expect(readProvider.constructor.name).toBe("JsonRpcProvider");
  });
});
