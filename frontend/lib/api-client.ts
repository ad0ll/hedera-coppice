import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Typed fetch wrapper that validates the response against a Zod schema.
 * Throws ApiError on non-2xx responses, ZodError on schema mismatch.
 */
export async function fetchAPI<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Response body wasn't JSON — use generic message
    }
    throw new ApiError(res.status, message);
  }

  const json = await res.json();
  return schema.parse(json);
}
