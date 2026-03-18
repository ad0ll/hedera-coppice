/**
 * SPT Verification Script
 *
 * Queries Guardian for verified MRV data, sums tCO2e avoided,
 * compares against the Sustainability Performance Target, and
 * calls setCoupon() on the ATS bond contract to apply or remove
 * the coupon step-up penalty.
 *
 * Usage:
 *   cd scripts && npx tsx guardian/guardian-verify-spt.ts
 *
 * Environment (from scripts/guardian/.env):
 *   GUARDIAN_API_URL, GUARDIAN_POLICY_ID,
 *   GUARDIAN_ISSUER_USERNAME, GUARDIAN_ISSUER_PASSWORD,
 *   GUARDIAN_VVB_USERNAME, GUARDIAN_VVB_PASSWORD
 *
 * Environment (from scripts/.env):
 *   DEPLOYER_PRIVATE_KEY, HEDERA_JSON_RPC, CPC_SECURITY_ADDRESS
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { GuardianClient } from "./api-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load both .env files
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Guardian config
const GUARDIAN_API_URL = process.env.GUARDIAN_API_URL || "http://195.201.8.147:3100";
const POLICY_ID = process.env.GUARDIAN_POLICY_ID;
const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";
const VVB_USERNAME = process.env.GUARDIAN_VVB_USERNAME || "CpcVerifier";
const VVB_PASSWORD = process.env.GUARDIAN_VVB_PASSWORD || "CpcVerifier2026!";

// Bond contract config
const JSON_RPC_URL = process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const CPC_ADDRESS = process.env.CPC_SECURITY_ADDRESS || "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9";

// Rates: rate / 10^rateDecimals = annual fraction
// 4.25% = 425 / 10^4 = 0.0425
// 4.50% = 450 / 10^4 = 0.0450
const BASE_RATE = 425;
const PENALTY_RATE = 450;
const RATE_DECIMALS = 4;
const STEP_UP_BPS = 25;

// Viewer block tags from Guardian policy
const TAGS = {
  bondFrameworks: "view_bond_frameworks_6",
  verifications: "view_verifications_30",
};

const BOND_ABI = [
  "function setCoupon(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) _newCoupon) returns (uint256)",
  "function getCouponCount() view returns (uint256)",
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
];

interface VerificationCS {
  ProjectName: string;
  VerifiedGHGReduced: number;
  Opinion: string;
}

interface BondFrameworkCS {
  SustainabilityPerformanceTarget: string;
  TotalIssuanceAmount: number;
}

interface ViewerBlockResponse<T> {
  data: Array<{
    document: {
      credentialSubject: T[];
    };
  }>;
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
  if (!res.ok) {
    console.error(`Failed to fetch ${tag}: ${res.status}`);
    return [];
  }
  const body = (await res.json()) as ViewerBlockResponse<T>;
  return (body.data ?? []).map((doc) => doc.document.credentialSubject[0]);
}

async function guardianLogin(username: string, password: string): Promise<string> {
  const client = new GuardianClient();
  return client.login(username, password);
}

async function main() {
  if (!POLICY_ID) {
    console.error("GUARDIAN_POLICY_ID not set in scripts/guardian/.env");
    process.exit(1);
  }
  if (!DEPLOYER_KEY) {
    console.error("DEPLOYER_PRIVATE_KEY not set in scripts/.env");
    process.exit(1);
  }

  console.log("=== SPT Verification ===\n");

  // 1. Login to Guardian as issuer (bond framework) and verifier (verification statements)
  console.log("1. Authenticating with Guardian...");
  const [issuerToken, verifierToken] = await Promise.all([
    guardianLogin(ISSUER_USERNAME, ISSUER_PASSWORD),
    guardianLogin(VVB_USERNAME, VVB_PASSWORD),
  ]);
  console.log("   Authenticated as Issuer + Verifier\n");

  // 2. Fetch bond framework to get SPT target
  console.log("2. Fetching bond framework...");
  const bondFrameworks = await fetchViewerBlock<BondFrameworkCS>(
    POLICY_ID, TAGS.bondFrameworks, issuerToken,
  );
  const bf = bondFrameworks[0];
  if (!bf) {
    console.error("   No bond framework found in Guardian");
    process.exit(1);
  }

  // Parse SPT target from text like "Avoid 10,000 tCO2e per period"
  const sptMatch = bf.SustainabilityPerformanceTarget?.match(/([\\d,]+)\s*tCO2e/);
  const sptTarget = sptMatch ? Number(sptMatch[1].replace(/,/g, "")) : 10_000;
  console.log(`   SPT Target: ${sptTarget.toLocaleString()} tCO2e\n`);

  // 3. Fetch verification statements
  console.log("3. Fetching verification statements...");
  const verifications = await fetchViewerBlock<VerificationCS>(
    POLICY_ID, TAGS.verifications, verifierToken,
  );
  console.log(`   Found ${verifications.length} verification statement(s)\n`);

  // 4. Sum verified GHG reductions (only from "Approved" opinions)
  const approvedVerifications = verifications.filter((v) => v.Opinion === "Approved");
  const totalVerified = approvedVerifications.reduce(
    (sum, v) => sum + (v.VerifiedGHGReduced ?? 0), 0,
  );

  console.log("4. SPT Assessment:");
  console.log(`   Approved verifications: ${approvedVerifications.length}`);
  console.log(`   Total verified CO2e: ${totalVerified.toLocaleString()} tonnes`);
  console.log(`   SPT target:          ${sptTarget.toLocaleString()} tonnes`);

  const sptMet = totalVerified >= sptTarget;
  const appliedRate = sptMet ? BASE_RATE : PENALTY_RATE;
  const ratePercent = (appliedRate / Math.pow(10, RATE_DECIMALS) * 100).toFixed(2);

  if (sptMet) {
    console.log(`   Result: TARGET MET - coupon stays at ${ratePercent}%\n`);
  } else {
    console.log(`   Result: TARGET MISSED - coupon steps up +${STEP_UP_BPS}bps to ${ratePercent}%\n`);
  }

  // 5. Set coupon on ATS bond contract
  console.log("5. Setting next coupon on bond contract...");
  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const cpc = new ethers.Contract(CPC_ADDRESS, BOND_ABI, deployer);

  // Create coupon 6 months from now
  const now = Math.floor(Date.now() / 1000);
  const sixMonths = 180 * 24 * 60 * 60;
  const oneWeek = 7 * 24 * 60 * 60;

  const coupon = {
    recordDate: now + sixMonths - oneWeek, // 1 week before execution
    executionDate: now + sixMonths,
    startDate: now + 1, // must be > block.timestamp
    endDate: now + sixMonths,
    fixingDate: now,
    rate: appliedRate,
    rateDecimals: RATE_DECIMALS,
    rateStatus: 0, // Fixed
  };

  console.log(`   Record date:    ${new Date(coupon.recordDate * 1000).toISOString()}`);
  console.log(`   Execution date: ${new Date(coupon.executionDate * 1000).toISOString()}`);
  console.log(`   Rate:           ${appliedRate}/${Math.pow(10, RATE_DECIMALS)} = ${ratePercent}%`);

  try {
    const tx = await cpc.setCoupon(coupon, { gasLimit: 1_000_000 });
    const receipt = await tx.wait();
    console.log(`   Coupon set successfully. TX: ${receipt.hash}`);

    const couponCount = await cpc.getCouponCount();
    console.log(`   Total coupons: ${couponCount}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   Failed to set coupon: ${message}`);
    console.error("   (This may happen if deployer lacks CORPORATE_ACTION role)\n");
    process.exit(1);
  }

  console.log("=== SPT Verification Complete ===");
  console.log(`   SPT Met: ${sptMet}`);
  console.log(`   Applied Rate: ${ratePercent}%`);
  console.log(`   Verified: ${totalVerified.toLocaleString()} / ${sptTarget.toLocaleString()} tCO2e`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
