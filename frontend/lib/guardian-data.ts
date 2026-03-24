import { GUARDIAN_API_URL, GUARDIAN_POLICY_ID } from "@/lib/constants";
import type {
  BondFrameworkCS,
  ProjectRegistrationCS,
  FundAllocationCS,
  MRVReportCS,
  VerificationStatementCS,
  ViewerBlockResponse,
  VCEvidence,
  GuardianData,
  GuardianProject,
} from "@/lib/guardian-types";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";
const VERIFIER_USERNAME = process.env.GUARDIAN_VVB_USERNAME || "CpcVerifier";
const VERIFIER_PASSWORD = process.env.GUARDIAN_VVB_PASSWORD || "CpcVerifier2026!";

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
    signal: AbortSignal.timeout(10_000),
  });
  if (!loginRes.ok) {
    throw new Error(`Guardian login failed: ${loginRes.status}`);
  }
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

interface FetchResult<T> {
  cs: T;
  evidence: VCEvidence;
  rawDocument: Record<string, unknown>;
}

async function fetchViewerBlock<T>(
  policyId: string,
  tag: string,
  token: string,
): Promise<FetchResult<T>[]> {
  const res = await fetch(
    `${GUARDIAN_API_URL}/api/v1/policies/${policyId}/tag/${tag}/blocks`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as ViewerBlockResponse<T>;
  return (body.data ?? []).map((doc) => ({
    cs: doc.document.credentialSubject[0],
    evidence: {
      hash: doc.hash,
      topicId: doc.topicId,
      messageId: doc.messageId,
      issuer: doc.document.issuer,
      issuanceDate: doc.document.issuanceDate,
      proofType: doc.document.proof.type,
    },
    rawDocument: doc.document as Record<string, unknown>,
  }));
}

/**
 * Fetch and aggregate all Guardian VC data. Used by both the /api/guardian/data
 * route and internal server-side consumers like SPT enforcement.
 */
export async function fetchGuardianData(): Promise<GuardianData | null> {
  const policyId = GUARDIAN_POLICY_ID;
  if (!policyId) return null;

  const [issuerToken, verifierToken] = await Promise.all([
    guardianLogin(ISSUER_USERNAME, ISSUER_PASSWORD),
    guardianLogin(VERIFIER_USERNAME, VERIFIER_PASSWORD),
  ]);

  const [bondFrameworkResults, projectResults, allocationResults, mrvResults, verificationResults] =
    await Promise.all([
      fetchViewerBlock<BondFrameworkCS>(policyId, TAGS.bondFrameworks, issuerToken),
      fetchViewerBlock<ProjectRegistrationCS>(policyId, TAGS.projects, issuerToken),
      fetchViewerBlock<FundAllocationCS>(policyId, TAGS.allocations, issuerToken),
      fetchViewerBlock<MRVReportCS>(policyId, TAGS.mrvReports, issuerToken),
      fetchViewerBlock<VerificationStatementCS>(policyId, TAGS.verifications, verifierToken),
    ]);

  const bondFramework = bondFrameworkResults[0]?.cs ?? null;
  const totalIssuance = bondFramework?.TotalIssuanceAmount ?? 0;

  const sptMatch = bondFramework?.SustainabilityPerformanceTarget?.match(
    /([\d,]+)\s*tCO2e/,
  );
  const sptTarget = sptMatch ? Number(sptMatch[1].replace(/,/g, "")) : 10_000;

  const guardianProjects: GuardianProject[] = projectResults.map((reg) => {
    const alloc = allocationResults.find((a) => a.cs.ProjectName === reg.cs.ProjectName);
    const mrv = mrvResults.find((m) => m.cs.ProjectName === reg.cs.ProjectName);
    const verif = verificationResults.find((v) => v.cs.ProjectName === reg.cs.ProjectName);

    return {
      registration: reg.cs,
      registrationEvidence: reg.evidence,
      registrationDocument: reg.rawDocument,
      allocation: alloc?.cs,
      allocationEvidence: alloc?.evidence,
      allocationDocument: alloc?.rawDocument,
      mrvReport: mrv?.cs,
      mrvEvidence: mrv?.evidence,
      mrvDocument: mrv?.rawDocument,
      verification: verif?.cs,
      verificationEvidence: verif?.evidence,
      verificationDocument: verif?.rawDocument,
      isVerified: verif?.cs.Opinion === "Approved" || verif?.cs.Opinion === "Conditional",
      verifiedCO2e: verif?.cs.VerifiedGHGReduced ?? 0,
      createDate: reg.evidence.issuanceDate,
    };
  });

  // Only sum allocations that match a registered project. Guardian VCs are
  // immutable on HCS so orphaned test allocations can't be deleted — filter
  // them out here to keep the total consistent with the per-project breakdown.
  const projectNames = new Set(projectResults.map((r) => r.cs.ProjectName));
  const totalAllocated = allocationResults
    .filter((a) => projectNames.has(a.cs.ProjectName))
    .reduce((sum, a) => sum + (a.cs.AllocatedAmountEUSD ?? 0), 0);
  const totalVerifiedCO2e = verificationResults.reduce(
    (sum, v) => sum + (v.cs.VerifiedGHGReduced ?? 0),
    0,
  );

  return {
    bondFramework,
    bondFrameworkEvidence: bondFrameworkResults[0]?.evidence,
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
}
