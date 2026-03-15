import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/retry";

describe("withRetry", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after all attempts exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent"));
    await expect(withRetry(fn, 3)).rejects.toThrow("persistent");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries the specified number of times", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await expect(withRetry(fn, 2)).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
