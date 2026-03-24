import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, recoverAddressOrError } from "@/lib/api-helpers";
import { GUARDIAN_API_URL, GUARDIAN_POLICY_ID } from "@/lib/constants";
import { ICMA_CATEGORIES } from "@/lib/icma-categories";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";

const PROJECT_TAG = "req_project_9";

const registerProjectSchema = z.object({
  projectName: z.string().min(1).max(100),
  icmaCategory: z.enum(ICMA_CATEGORIES),
  subCategory: z.string().min(1).max(100),
  country: z.string().length(2),
  location: z.string().min(1).max(200),
  capacity: z.number().positive(),
  capacityUnit: z.string().min(1).max(20),
  projectLifetimeYears: z.number().int().positive().max(100),
  annualTargetCO2e: z.number().positive(),
  message: z.string().min(1),
  signature: z.string().min(1),
});

export { registerProjectResponseSchema, type RegisterProjectResponse } from "@/lib/api-schemas";

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
  const bodyResult = await parseRequestBody(request, registerProjectSchema);
  if ("error" in bodyResult) return bodyResult.error;
  const {
    projectName, icmaCategory, subCategory, country, location,
    capacity, capacityUnit, projectLifetimeYears, annualTargetCO2e,
    message: authMessage, signature,
  } = bodyResult.data;

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

    const document = {
      ProjectName: projectName,
      ICMACategory: icmaCategory,
      SubCategory: subCategory,
      Country: country,
      Location: location,
      Capacity: capacity,
      CapacityUnit: capacityUnit,
      ProjectLifetimeYears: projectLifetimeYears,
      AnnualTargetCO2e: annualTargetCO2e,
      EUTaxonomyActivityID: "",
      NACECode: "",
      EnvironmentalObjective: "Climate Change Mitigation",
      TaxonomyAlignmentStatus: "pending",
    };

    const res = await fetch(
      `${GUARDIAN_API_URL}/api/v1/policies/${GUARDIAN_POLICY_ID}/tag/${PROJECT_TAG}/blocks`,
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
        { error: `Guardian project registration failed: ${res.status} ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, projectName });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Project registration failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
