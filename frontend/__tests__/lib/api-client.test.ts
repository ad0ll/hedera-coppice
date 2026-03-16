import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { fetchAPI, ApiError } = await import("@/lib/api-client");

const testSchema = z.object({
  success: z.literal(true),
  value: z.number(),
});

describe("fetchAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed data on success", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, value: 42 }), { status: 200 }),
    );
    const data = await fetchAPI("/api/test", testSchema);
    expect(data).toEqual({ success: true, value: 42 });
  });

  it("passes RequestInit through to fetch", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, value: 1 }), { status: 200 }),
    );
    await fetchAPI("/api/test", testSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    }));
  });

  it("throws ApiError with server error message on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Bad request" }), { status: 400 }),
    );
    try {
      await fetchAPI("/api/test", testSchema);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(400);
      expect((err as InstanceType<typeof ApiError>).message).toBe("Bad request");
    }
  });

  it("throws ApiError with generic message when error body is unparseable", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("not json", { status: 500 }),
    );
    try {
      await fetchAPI("/api/test", testSchema);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as InstanceType<typeof ApiError>).status).toBe(500);
      expect((err as InstanceType<typeof ApiError>).message).toBe("Request failed (500)");
    }
  });

  it("throws ZodError when response doesn't match schema", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ wrong: "shape" }), { status: 200 }),
    );
    await expect(fetchAPI("/api/test", testSchema)).rejects.toThrow();
  });
});

describe("ApiError", () => {
  it("is an instance of Error", () => {
    const err = new ApiError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
  });
});
