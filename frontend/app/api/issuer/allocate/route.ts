import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, recoverAddressOrError } from "@/lib/api-helpers";
import { GUARDIAN_API_URL, GUARDIAN_POLICY_ID } from "@/lib/constants";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";

const ALLOCATION_TAG = "req_allocation_14";

const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const allocateResponseSchema = z.object({
  success: z.literal(true),
  status: z.string(),
});
export type AllocateResponse = z.infer<typeof allocateResponseSchema>;

async function guardianLogin(): Promise<string> {
  const loginRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ISSUER_USERNAME, password: ISSUER_PASSWORD }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!loginRes.ok) throw new Error(`Guardian login failed: ${loginRes.status}`);
  const { refreshToken } = (await loginRes.json()) as { refreshToken: string };

  const tokenRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`Guardian token exchange failed: ${tokenRes.status}`);
  const { accessToken } = (await tokenRes.json()) as { accessToken: string };
  return accessToken;
}

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, allocateBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { project, category, amount, message: authMessage, signature } = bodyResult.data;

  const authResult = recoverAddressOrError(authMessage, signature);
  if ("error" in authResult) return authResult.error;

  if (!GUARDIAN_POLICY_ID) {
    return NextResponse.json(
      { error: "GUARDIAN_POLICY_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const token = await guardianLogin();

    // FundAllocationCS document — matches the schema from scripts/guardian/demo-data.ts
    const document = {
      ProjectName: project,
      SignedAmountEUSD: amount,
      AllocatedAmountEUSD: amount,
      ShareofFinancingPercent: 0,
      AllocationDate: new Date().toISOString().split("T")[0],
      Purpose: category,
      HederaTransactionID: `manual-${Date.now()}`,
    };

    const res = await fetch(
      `${GUARDIAN_API_URL}/api/v1/policies/${GUARDIAN_POLICY_ID}/tag/${ALLOCATION_TAG}/blocks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ document, ref: null }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Guardian allocation failed: ${res.status} ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, status: "GUARDIAN_SUBMITTED" });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Allocation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
