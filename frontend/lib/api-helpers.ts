import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the parsed data on success, or a 400 NextResponse on failure.
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: "Invalid request" }, { status: 400 }) };
  }
  return { data: parsed.data };
}

/**
 * Verify an auth signature or return a 401 response.
 * Returns undefined on success.
 */
export async function verifyAuthOrError(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<NextResponse | undefined> {
  try {
    await verifyAuth(message, signature, expectedAddress);
    return undefined;
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

/**
 * Normalize an address with ethers.getAddress or return a 400 response.
 */
export function normalizeAddress(
  raw: string,
): { address: string } | { error: NextResponse } {
  try {
    return { address: ethers.getAddress(raw) };
  } catch {
    return { error: NextResponse.json({ error: "Invalid address" }, { status: 400 }) };
  }
}

/**
 * Read a required environment variable or return a 500 response.
 */
export function requireEnv(
  key: string,
): { value: string } | { error: NextResponse } {
  const value = process.env[key];
  if (!value) {
    return { error: NextResponse.json({ error: `${key} not configured` }, { status: 500 }) };
  }
  return { value };
}
