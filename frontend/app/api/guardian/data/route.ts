import { NextResponse } from "next/server";
import { GUARDIAN_API_URL, GUARDIAN_POLICY_ID } from "@/lib/constants";
import type {
  BondFrameworkCS,
  ProjectRegistrationCS,
  FundAllocationCS,
  MRVReportCS,
  VerificationStatementCS,
  ViewerBlockResponse,
  GuardianData,
  GuardianProject,
} from "@/lib/guardian-types";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";
const VERIFIER_USERNAME = process.env.GUARDIAN_VVB_USERNAME || "CpcVerifier";
const VERIFIER_PASSWORD = process.env.GUARDIAN_VVB_PASSWORD || "CpcVerifier2026!";

// Tag names from buildPolicyConfig in guardian-setup.ts
const TAGS = {
  bondFrameworks: "view_bond_frameworks_6",
  projects: "view_projects_11",
  allocations: "view_allocations_16",
  mrvReports: "view_mrvs_21",
  verifications: "view_verifications_30",
};

async function guardianLogin(username: string, password: string): Promise<string> {
  const loginRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!loginRes.ok) {
    throw new Error(`Guardian login failed: ${loginRes.status}`);
  }
  const { refreshToken } = (await loginRes.json()) as { refreshToken: string };

  const tokenRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!tokenRes.ok) throw new Error(`Guardian token exchange failed: ${tokenRes.status}`);
  const { accessToken } = (await tokenRes.json()) as { accessToken: string };
  return accessToken;
}

async function fetchViewerBlock<T>(
  policyId: string,
  tag: string,
  token: string,
): Promise<T[]> {
  const res = await fetch(
    `${GUARDIAN_API_URL}/api/v1/policies/${policyId}/tag/${tag}/blocks`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as ViewerBlockResponse<T>;
  return (body.data ?? []).map((doc) => doc.document.credentialSubject[0]);
}

export async function GET() {
  const policyId = GUARDIAN_POLICY_ID;
  if (!policyId) {
    return NextResponse.json(
      { error: "GUARDIAN_POLICY_ID not configured" },
      { status: 503 },
    );
  }

  try {
    // Login as issuer (can see bond framework, projects, allocations, MRVs)
    // and verifier (can see verification statements)
    const [issuerToken, verifierToken] = await Promise.all([
      guardianLogin(ISSUER_USERNAME, ISSUER_PASSWORD),
      guardianLogin(VERIFIER_USERNAME, VERIFIER_PASSWORD),
    ]);

    // Fetch all document types in parallel
    const [bondFrameworks, projects, allocations, mrvReports, verifications] =
      await Promise.all([
        fetchViewerBlock<BondFrameworkCS>(policyId, TAGS.bondFrameworks, issuerToken),
        fetchViewerBlock<ProjectRegistrationCS>(policyId, TAGS.projects, issuerToken),
        fetchViewerBlock<FundAllocationCS>(policyId, TAGS.allocations, issuerToken),
        fetchViewerBlock<MRVReportCS>(policyId, TAGS.mrvReports, issuerToken),
        fetchViewerBlock<VerificationStatementCS>(policyId, TAGS.verifications, verifierToken),
      ]);

    const bondFramework = bondFrameworks[0] ?? null;
    const totalIssuance = bondFramework?.TotalIssuanceAmount ?? 0;

    // Parse SPT target from bond framework text
    const sptMatch = bondFramework?.SustainabilityPerformanceTarget?.match(
      /([\d,]+)\s*tCO2e/,
    );
    const sptTarget = sptMatch ? Number(sptMatch[1].replace(/,/g, "")) : 10_000;

    // Build per-project aggregation keyed by ProjectName
    const guardianProjects: GuardianProject[] = projects.map((reg) => {
      const allocation = allocations.find(
        (a) => a.ProjectName === reg.ProjectName,
      );
      const mrv = mrvReports.find((m) => m.ProjectName === reg.ProjectName);
      const verification = verifications.find(
        (v) => v.ProjectName === reg.ProjectName,
      );

      return {
        registration: reg,
        allocation,
        mrvReport: mrv,
        verification,
        isVerified: verification?.Opinion === "Approved" || verification?.Opinion === "Conditional",
        verifiedCO2e: verification?.VerifiedGHGReduced ?? 0,
        createDate: new Date().toISOString(),
      };
    });

    const totalAllocated = allocations.reduce(
      (sum, a) => sum + (a.AllocatedAmountEUSD ?? 0),
      0,
    );
    const totalVerifiedCO2e = verifications.reduce(
      (sum, v) => sum + (v.VerifiedGHGReduced ?? 0),
      0,
    );

    const data: GuardianData = {
      bondFramework,
      projects: guardianProjects,
      totalAllocatedEUSD: totalAllocated,
      totalIssuanceEUSD: totalIssuance,
      allocationPercent:
        totalIssuance > 0
          ? Math.round((totalAllocated / totalIssuance) * 100)
          : 0,
      totalVerifiedCO2e,
      sptTarget,
      sptMet: totalVerifiedCO2e >= sptTarget,
    };

    return NextResponse.json(data);
  } catch (err) {
    const message = (err as Error).message;
    console.error("Guardian API error:", message);
    return NextResponse.json(
      { error: "Guardian API unavailable", detail: message },
      { status: 503 },
    );
  }
}
