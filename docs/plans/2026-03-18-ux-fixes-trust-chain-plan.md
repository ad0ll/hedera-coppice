# UX Fixes + Trust Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical UX bugs (ENS errors, broken agent grant, silent coupon failures), add trust chain evidence to Impact page, gate destructive issuer operations, and add Guardian events to Compliance tab.

**Architecture:** Fix address checksumming at the ATS context level (propagates to all hooks). Migrate grant-agent-role API from T-REX to ATS AccessControl. Expand Guardian API to return VC metadata alongside credentialSubject. Build expandable evidence UI on project cards. Add Guardian events tab to Compliance monitor.

**Tech Stack:** Next.js 16, ethers v6, React Query, Hedera Guardian API, Playwright E2E

**Design doc:** `docs/plans/2026-03-18-ux-fixes-trust-chain-design.md`

---

## Phase 1: Critical Bug Fixes (Tasks 1-4)

These fix the broken demo path. Must be done first.

### Task 1: Fix ENS Error — Checksum Addresses in ATS Context

**Files:**
- Modify: `frontend/contexts/ats-context.tsx` (lines 49, 72, 94)

**Step 1: Fix address checksumming**

Replace three `toLowerCase()` calls with `ethers.getAddress()`:

```typescript
// Line 49: handleAccountsChanged
setAddress(ethers.getAddress(accounts[0]));

// Line 72: checkConnection
setAddress(await s.getAddress()); // already returns checksummed

// Line 94: connect
setAddress(ethers.getAddress(addr));
```

Note: `ethers.Signer.getAddress()` already returns checksummed, so line 72 just removes the `.toLowerCase()`.

**Step 2: Verify build**

Run: `npm run build` from repo root
Expected: Clean build, no errors

**Step 3: Test locally**

1. Run `cd frontend && npm run dev`
2. Connect MetaMask with any wallet
3. Navigate to Invest page — compliance checks should run without "ENS" errors
4. Check browser console — no "network does not support ENS" errors

**Step 4: Commit**

```
feat: fix ENS error by checksumming addresses in ATS context
```

---

### Task 2: Fix Grant Agent Role API — Migrate to ATS AccessControl

**Files:**
- Modify: `frontend/app/api/demo/grant-agent-role/route.ts` (lines 21-24, 56-67)
- Modify: `frontend/hooks/use-token.ts` (lines 12, 67-76, 91-100)
- Modify: `frontend/app/issue/page.tsx` (line 225)

**Step 1: Update grant-agent-role API route**

Replace the ABI and contract calls:

```typescript
// Replace lines 21-24
const AGENT_ROLE = "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6";

const accessControlAbi = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
];

// Replace lines 56-67 (the try block's contract calls)
const provider = getServerProvider();
const wallet = getDeployerWallet();
const tokenContract = new ethers.Contract(CPC_SECURITY_ID, accessControlAbi, wallet);
const readOnlyContract = new ethers.Contract(CPC_SECURITY_ID, accessControlAbi, provider);

// Check if already has agent role
const alreadyAgent = await readOnlyContract.hasRole(AGENT_ROLE, address);

if (alreadyAgent) {
  return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
}

// Grant agent role
const tx = await tokenContract.grantRole(AGENT_ROLE, address);
const receipt = await tx.wait();
```

**Step 2: Update use-token.ts — useIsAgent hook**

Replace `isAgent(address)` with `hasRole(bytes32, address)`:

```typescript
// Add to TOKEN_ABI (replace line 12):
"function hasRole(bytes32 role, address account) view returns (bool)",

// Remove line 12: "function isAgent(address) view returns (bool)",

// Add AGENT_ROLE constant at top of file:
const AGENT_ROLE = "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6";

// Replace useIsAgent (lines 67-77):
export function useIsAgent(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "hasRole", "agent", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.hasRole(AGENT_ROLE, address);
      return result;
    },
    enabled: !!address,
  });
}
```

**Step 3: Fix useTokenOwner — ATS has no owner()**

ATS uses role-based access, not OZ Ownable. Replace `useTokenOwner` to check DEFAULT_ADMIN_ROLE instead:

```typescript
// Replace useTokenOwner (lines 91-100):
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function useIsAdmin(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "hasRole", "admin", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.hasRole(DEFAULT_ADMIN_ROLE, address);
      return result;
    },
    enabled: !!address,
  });
}
```

Also remove `"function owner() view returns (address)"` from TOKEN_ABI.

**Step 4: Update issuer page to use useIsAdmin**

In `frontend/app/issue/page.tsx`:
- Change import from `useTokenOwner` to `useIsAdmin`
- Replace `const { data: tokenOwner } = useTokenOwner();`
  with `const { data: isAdmin } = useIsAdmin(address);`
- Replace `const isOwner = address && tokenOwner ? address.toLowerCase() === tokenOwner.toLowerCase() : false;`
  with `const isOwner = isAdmin ?? false;`
- Update line 225 text: replace "ERC-3643" with "ATS (Asset Tokenization Studio)"

**Step 5: Update unit test — `frontend/__tests__/api/grant-agent-role.test.ts`**

The test mocks `isAgent`/`addAgent` which no longer exist. Update to `hasRole`/`grantRole`:

```typescript
// Replace mockIsAgent/mockAddAgent with:
const mockHasRole = vi.fn().mockResolvedValue(false);
const mockGrantRole = vi.fn().mockResolvedValue({
  wait: vi.fn().mockResolvedValue({ status: 1, hash: "0xtxhash" }),
});

// Replace MockContract:
function MockContract() {
  return {
    hasRole: (...args: unknown[]) => mockHasRole(...args),
    grantRole: (...args: unknown[]) => mockGrantRole(...args),
  };
}

// In beforeEach, reset mockHasRole/mockGrantRole instead of mockIsAgent/mockAddAgent
// In test assertions: mockGrantRole instead of mockAddAgent
// In "already agent" test: mockHasRole.mockResolvedValueOnce(true)
// In "TOCTOU race" test: mockGrantRole.mockRejectedValueOnce(...)
```

**Step 6: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

Test locally:
1. Connect non-deployer wallet to issuer page
2. Click "Grant Agent Role" — should succeed without "invalid BytesLike" error
3. After granting, should see full dashboard

**Step 7: Commit**

```
fix: migrate grant-agent-role from T-REX to ATS AccessControl
```

---

### Task 3: Fix Coupons Hook — Add Error Logging and Retry

**Files:**
- Modify: `frontend/hooks/use-coupons.ts` (lines 41-85)

**Step 1: Add error logging, retry, and static network**

```typescript
// Replace the useQuery call (lines 42-85):
export function useCoupons() {
  return useQuery({
    queryKey: ["coupons", CPC_SECURITY_ID],
    queryFn: async (): Promise<CouponInfo[]> => {
      try {
        const provider = new ethers.JsonRpcProvider(JSON_RPC_URL, undefined, {
          staticNetwork: true,
        });
        const bond = new ethers.Contract(CPC_SECURITY_ID, BOND_ABI, provider);

        const count = await bond.getCouponCount();
        const countNum = Number(count);
        if (countNum === 0) return [];

        const coupons: CouponInfo[] = [];
        // ATS coupon IDs are 1-indexed (getCoupon(0) reverts)
        for (let i = 1; i <= countNum; i++) {
          const registered = await bond.getCoupon(i);
          const c = registered.coupon;
          const rate = Number(c.rate);
          const rateDecimals = Number(c.rateDecimals);
          const startDate = Number(c.startDate);
          const endDate = Number(c.endDate);
          const periodDays = Math.round((endDate - startDate) / 86400);

          const info: CouponInfo = {
            id: i,
            recordDate: Number(c.recordDate),
            executionDate: Number(c.executionDate),
            startDate,
            endDate,
            rate,
            rateDecimals,
            rateDisplay: formatRateDisplay(rate, rateDecimals),
            snapshotId: Number(registered.snapshotId),
            status: getCouponStatus({
              recordDate: Number(c.recordDate),
              executionDate: Number(c.executionDate),
            }),
            periodDays,
          };
          coupons.push(info);
        }
        return coupons;
      } catch (err) {
        console.error("[useCoupons] Failed to fetch coupon data:", err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
```

**Step 2: Update unit test — `frontend/__tests__/hooks/use-coupons.test.ts`**

The `MockJsonRpcProvider` needs to accept the new `staticNetwork` option in its constructor:

```typescript
// Replace line 10:
class MockJsonRpcProvider { constructor(..._args: unknown[]) {} }
```

**Step 3: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`
Expected: Clean build, all coupons tests pass

**Step 4: Test locally**

1. Navigate to /coupons — should load coupon data (may take a few seconds with retry)
2. Check browser console for any `[useCoupons]` error messages — these now give diagnostic info

**Step 5: Commit**

```
fix: add error logging and retry to coupons hook
```

---

### Task 4: Gate Destructive Issuer Operations

**Files:**
- Modify: `frontend/app/issue/page.tsx` (freeze/pause sections)

**Step 1: Add deployer address constant and gate logic**

At the top of the component, after the existing state declarations, add:

```typescript
// The deployer address is the only wallet that can perform destructive operations
const DEPLOYER_ADDRESS = "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee";
const isDeployer = address?.toLowerCase() === DEPLOYER_ADDRESS;
```

**Step 2: Gate the Pause control**

Replace the pause button (around line 368):

```tsx
<button onClick={handlePauseToggle} disabled={loading || !isDeployer}
  className={`w-full ${isPaused ? "btn-outline-green" : "btn-outline-red"} disabled:opacity-50`}>
  {isPaused ? "Unpause Token" : "Pause Token"}
</button>
{!isDeployer && (
  <p className="text-xs text-text-muted mt-2">Only the bond issuer can pause/unpause trading.</p>
)}
```

**Step 3: Gate the Freeze button (but not Unfreeze)**

Replace the freeze/unfreeze buttons (around lines 341-350):

```tsx
<div className="flex gap-2">
  <button onClick={() => handleFreeze("freeze")}
    disabled={loading || !freezeAddr || !isDeployer}
    className="flex-1 btn-outline-red disabled:opacity-50">
    Freeze
  </button>
  <button onClick={() => handleFreeze("unfreeze")}
    disabled={loading || !freezeAddr}
    className="flex-1 btn-outline-green">
    Unfreeze
  </button>
</div>
{!isDeployer && (
  <p className="text-xs text-text-muted">Only the bond issuer can freeze wallets. Unfreeze is available to all agents.</p>
)}
```

**Step 4: Verify build + test**

Run: `npm run build`

Test locally:
1. Connect as Alice, grant agent role → Freeze button should be disabled
2. Connect as deployer → Freeze and Pause should be enabled

**Step 5: Run E2E tests**

Run: `cd e2e && npx playwright test issuer-dashboard.spec.ts --reporter=list`
Expected: All tests pass (deployer wallet mock tests should still work)

**Step 6: Commit**

```
feat: gate destructive issuer operations to deployer wallet only
```

---

## Phase 2: Guardian Trust Chain (Tasks 5-8)

### Task 5: Expose VC Metadata in Guardian API

**Files:**
- Modify: `frontend/lib/guardian-types.ts` (add VCEvidence type, update GuardianProject)
- Modify: `frontend/app/api/guardian/data/route.ts` (return evidence with credentialSubject)

**Step 1: Add VCEvidence type to guardian-types.ts**

Add after `ViewerBlockResponse`:

```typescript
// Provenance metadata extracted from VC document wrapper
export interface VCEvidence {
  hash: string;           // IPFS CID (base58)
  topicId: string;        // HCS topic ID
  messageId: string;      // HCS message timestamp
  issuer: string;         // DID of signer
  issuanceDate: string;   // ISO timestamp
  proofType: string;      // e.g. "Ed25519Signature2018"
}
```

**Step 2: Update GuardianProject to include evidence fields**

```typescript
export interface GuardianProject {
  registration: ProjectRegistrationCS;
  registrationEvidence?: VCEvidence;
  allocation?: FundAllocationCS;
  allocationEvidence?: VCEvidence;
  mrvReport?: MRVReportCS;
  mrvEvidence?: VCEvidence;
  verification?: VerificationStatementCS;
  verificationEvidence?: VCEvidence;
  isVerified: boolean;
  verifiedCO2e: number;
  createDate: string;
}

// Remove: messageId field (replaced by per-document evidence)
```

**Step 3: Update fetchViewerBlock to return evidence**

In `route.ts`, change `fetchViewerBlock` to return tuples of `[credentialSubject, evidence]`:

```typescript
interface FetchResult<T> {
  cs: T;
  evidence: VCEvidence;
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
  }));
}
```

**Step 4: Update the GET handler to thread evidence through**

Update the project-building logic:

```typescript
const guardianProjects: GuardianProject[] = projectResults.map((reg) => {
  const alloc = allocationResults.find((a) => a.cs.ProjectName === reg.cs.ProjectName);
  const mrv = mrvResults.find((m) => m.cs.ProjectName === reg.cs.ProjectName);
  const verif = verificationResults.find((v) => v.cs.ProjectName === reg.cs.ProjectName);

  return {
    registration: reg.cs,
    registrationEvidence: reg.evidence,
    allocation: alloc?.cs,
    allocationEvidence: alloc?.evidence,
    mrvReport: mrv?.cs,
    mrvEvidence: mrv?.evidence,
    verification: verif?.cs,
    verificationEvidence: verif?.evidence,
    isVerified: verif?.cs.Opinion === "Approved" || verif?.cs.Opinion === "Conditional",
    verifiedCO2e: verif?.cs.VerifiedGHGReduced ?? 0,
    createDate: reg.evidence.issuanceDate,
  };
});

// Update aggregate calculations to use .cs fields:
const totalAllocated = allocationResults.reduce(
  (sum, a) => sum + (a.cs.AllocatedAmountEUSD ?? 0), 0,
);
const totalVerifiedCO2e = verificationResults.reduce(
  (sum, v) => sum + (v.cs.VerifiedGHGReduced ?? 0), 0,
);
```

Variable renames needed:
- `projects` -> `projectResults`
- `allocations` -> `allocationResults`
- `mrvReports` -> `mrvResults`
- `verifications` -> `verificationResults`

**Step 5: Update unit test — `frontend/__tests__/api/guardian-data.test.ts`**

The `wrapVC` helper only creates `{ document: { credentialSubject: [cs] } }`. Now that the route reads `hash`, `topicId`, `messageId`, `document.issuer`, `document.issuanceDate`, and `document.proof.type` from the VC wrapper, the mock must include these:

```typescript
// Replace the wrapVC function:
function wrapVC(cs: Record<string, unknown>) {
  return {
    hash: "mockHash123",
    topicId: "0.0.1234",
    messageId: "1234567890.000000000",
    document: {
      credentialSubject: [cs],
      issuer: "did:hedera:testnet:mock_0.0.5678",
      issuanceDate: "2026-03-18T00:00:00Z",
      proof: {
        type: "Ed25519Signature2018",
        created: "2026-03-18T00:00:00Z",
        verificationMethod: "did:hedera:testnet:mock#key",
        proofPurpose: "assertionMethod",
        jws: "mock-jws",
      },
    },
  };
}
```

Add assertions for evidence fields in the "returns aggregated Guardian data" test:

```typescript
expect(data.projects[0].registrationEvidence).toBeTruthy();
expect(data.projects[0].registrationEvidence.hash).toBe("mockHash123");
expect(data.projects[0].registrationEvidence.topicId).toBe("0.0.1234");
expect(data.projects[0].registrationEvidence.issuer).toBe("did:hedera:testnet:mock_0.0.5678");
```

**Step 6: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

Test: `curl -s http://localhost:3000/api/guardian/data | python3 -m json.tool | head -50`
Expected: Each project now has `registrationEvidence`, `allocationEvidence`, etc.

**Step 7: Commit**

```
feat: expose VC metadata (IPFS, HCS, DIDs) in Guardian API response
```

---

### Task 6: Build Trust Chain Evidence Component

**Files:**
- Create: `frontend/components/guardian/vc-evidence.tsx`
- Modify: `frontend/components/guardian/project-card.tsx` (add expandable evidence)

**Step 1: Create vc-evidence.tsx component**

This component renders a single VC document's evidence (IPFS link, HashScan link, signer DID, timestamp):

```tsx
import type { VCEvidence } from "@/lib/guardian-types";

function abbreviateDid(did: string): string {
  // "did:hedera:testnet:GWXTMU...XP_0.0.8269360" -> "did:hedera:...8269360"
  const parts = did.split("_");
  const accountId = parts.length > 1 ? parts[parts.length - 1] : "";
  return accountId ? `did:hedera:...${accountId}` : did.slice(0, 20) + "...";
}

function hashScanUrl(topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/topic/${topicId}/message/${messageId}`;
}

function ipfsUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
}

interface VCEvidenceRowProps {
  label: string;
  evidence: VCEvidence;
  children?: React.ReactNode;
}

export function VCEvidenceRow({ label, evidence, children }: VCEvidenceRowProps) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-white uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-text-muted font-mono">{evidence.proofType}</p>
      </div>
      <div className="space-y-1 text-xs text-text-muted">
        <p>
          <span className="text-text-muted/60">Signed by </span>
          <span className="font-mono text-white/70">{abbreviateDid(evidence.issuer)}</span>
        </p>
        <p>
          <span className="text-text-muted/60">Date: </span>
          {new Date(evidence.issuanceDate).toLocaleDateString()}
        </p>
        {children}
      </div>
      <div className="flex gap-3 mt-2">
        <a href={ipfsUrl(evidence.hash)} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">
          View on IPFS
        </a>
        <a href={hashScanUrl(evidence.topicId, evidence.messageId)} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">
          View on HashScan
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Update project-card.tsx with expandable evidence section**

Add a "View Evidence" toggle to the existing ProjectCard:

```tsx
// Add to imports:
import { useState } from "react";
import { VCEvidenceRow } from "@/components/guardian/vc-evidence";
import type { Indicator } from "@/lib/guardian-types";

// Inside ProjectCard component, add state:
const [expanded, setExpanded] = useState(false);

// After the existing card content (before closing </div>), add:
<button
  onClick={() => setExpanded(!expanded)}
  className="w-full text-left text-xs text-text-muted hover:text-white transition-colors pt-3 mt-3 border-t border-border/30 flex items-center gap-1"
>
  <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
  {expanded ? "Hide Evidence" : "View Evidence Chain"}
</button>

{expanded && (
  <div className="mt-3 pt-1">
    {project.registrationEvidence && (
      <VCEvidenceRow label="Registration" evidence={project.registrationEvidence}>
        <p><span className="text-text-muted/60">EU Taxonomy: </span>{project.registration.EUTaxonomyActivityID ?? "N/A"} ({project.registration.TaxonomyAlignmentStatus ?? "unknown"})</p>
      </VCEvidenceRow>
    )}
    {project.allocationEvidence && project.allocation && (
      <VCEvidenceRow label="Allocation" evidence={project.allocationEvidence}>
        <p><span className="text-text-muted/60">Amount: </span>{project.allocation.AllocatedAmountEUSD.toLocaleString()} eUSD</p>
        <p><span className="text-text-muted/60">Purpose: </span>{project.allocation.Purpose}</p>
        {project.allocation.HederaTransactionID && (
          <p><span className="text-text-muted/60">Hedera Tx: </span>
            <a href={`https://hashscan.io/testnet/transaction/${project.allocation.HederaTransactionID}`}
              target="_blank" rel="noopener noreferrer" className="font-mono text-bond-green hover:text-bond-green/80">
              {project.allocation.HederaTransactionID.slice(0, 30)}...
            </a>
          </p>
        )}
      </VCEvidenceRow>
    )}
    {project.mrvEvidence && project.mrvReport && (
      <VCEvidenceRow label="MRV Report" evidence={project.mrvEvidence}>
        <p><span className="text-text-muted/60">Period: </span>{project.mrvReport.ReportingPeriodStart} to {project.mrvReport.ReportingPeriodEnd}</p>
        <p><span className="text-text-muted/60">Methodology: </span>{project.mrvReport.Methodology}</p>
        <p><span className="text-text-muted/60">Standard: </span>{project.mrvReport.ReportingStandard}</p>
        {renderIndicators(project.mrvReport.CoreIndicatorsJSON, "Core")}
        {project.mrvReport.AdditionalIndicatorsJSON && renderIndicators(project.mrvReport.AdditionalIndicatorsJSON, "Additional")}
      </VCEvidenceRow>
    )}
    {project.verificationEvidence && project.verification && (
      <VCEvidenceRow label="Verification" evidence={project.verificationEvidence}>
        <p><span className="text-text-muted/60">Opinion: </span>
          <span className={project.verification.Opinion === "Approved" ? "text-bond-green" : "text-bond-amber"}>
            {project.verification.Opinion}
          </span>
        </p>
        <p><span className="text-text-muted/60">Verified: </span>{project.verification.VerifiedGHGReduced.toLocaleString()} tCO₂e</p>
        {project.verification.VerifierNotes && (
          <p className="italic text-text-muted/80 mt-1">&ldquo;{project.verification.VerifierNotes}&rdquo;</p>
        )}
      </VCEvidenceRow>
    )}
  </div>
)}
```

Add helper function in the same file:

```tsx
function renderIndicators(json: string, label: string) {
  try {
    const indicators: Indicator[] = JSON.parse(json);
    return (
      <div className="mt-1">
        <span className="text-text-muted/60">{label}: </span>
        {indicators.map((ind, i) => (
          <span key={i}>
            {i > 0 && " | "}
            <span className="font-mono text-white/70">{ind.value.toLocaleString()}</span> {ind.unit}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}
```

**Step 3: Add `"use client"` to project-card.tsx**

Since we're adding `useState`, the component must be a client component:

```tsx
"use client";
```

**Step 4: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

Test locally: Navigate to /impact, click "View Evidence Chain" on a project card.

**Step 5: Commit**

```
feat: add expandable trust chain evidence to project cards
```

---

### Task 7: Data-Driven ICMA Section on Impact Page

**Files:**
- Modify: `frontend/app/impact/page.tsx` (replace ICMA_PRINCIPLES, remove Guardian Integration section)

**Step 1: Replace hardcoded ICMA section with data-driven one**

Remove the `ICMA_PRINCIPLES` constant and the Guardian MRV Integration section. Replace with a single section that derives ICMA compliance from `data.bondFramework`:

```tsx
{/* ICMA Compliance Evidence */}
{data && data.bondFramework && (
  <section className="animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="card-title mb-0">ICMA Compliance Evidence</h2>
      <StatusBadge label="Guardian Verified" variant="green" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Use of Proceeds */}
      <div className="card-static">
        <p className="stat-label mb-2">Use of Proceeds</p>
        <p className="text-sm text-white mb-1">{data.bondFramework.EligibleICMACategories}</p>
        <p className="text-xs text-text-muted">
          {data.allocationPercent}% allocated ({data.totalAllocatedEUSD.toLocaleString()} / {data.totalIssuanceEUSD.toLocaleString()} eUSD) across {data.projects.length} projects
        </p>
      </div>

      {/* Project Evaluation & Selection */}
      <div className="card-static">
        <p className="stat-label mb-2">Project Evaluation</p>
        <p className="text-sm text-white mb-1">
          {data.projects.filter(p => p.isVerified).length} of {data.projects.length} projects independently verified
        </p>
        <p className="text-xs text-text-muted">
          External review: {data.bondFramework.ExternalReviewProvider ?? "Not specified"}
        </p>
      </div>

      {/* Management of Proceeds */}
      <div className="card-static">
        <p className="stat-label mb-2">Management of Proceeds</p>
        <p className="text-sm text-white mb-1">On-chain treasury with smart contract controls</p>
        <div className="flex gap-3 mt-1">
          <a href={`https://hashscan.io/testnet/contract/${data.bondFramework.BondContractAddress}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-bond-green hover:text-bond-green/80">Bond Contract</a>
          <a href={`https://hashscan.io/testnet/contract/${data.bondFramework.LCCFContractAddress}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-bond-green hover:text-bond-green/80">Payout Contract</a>
        </div>
      </div>

      {/* Reporting */}
      <div className="card-static">
        <p className="stat-label mb-2">Reporting & Frameworks</p>
        <p className="text-sm text-white mb-1">{data.bondFramework.ReportingStandard}</p>
        {data.bondFramework.RegulatoryFrameworks && (
          <p className="text-xs text-text-muted">{data.bondFramework.RegulatoryFrameworks}</p>
        )}
        {data.bondFramework.EUTaxonomyAlignmentPercent != null && (
          <p className="text-xs text-text-muted mt-1">EU Taxonomy alignment: {data.bondFramework.EUTaxonomyAlignmentPercent}%</p>
        )}
      </div>
    </div>
  </section>
)}
```

**Step 2: Remove the old Guardian MRV Integration section**

Delete lines 188-210 (the card-static with "Guardian MRV Integration" heading and description text). The data source is now evident from the "Guardian Verified" badge on the ICMA section.

**Step 3: Update impact page unit test — `frontend/__tests__/pages/impact.test.tsx`**

The MOCK_DATA `bondFramework` needs additional fields used by the new ICMA section:

```typescript
// Update MOCK_DATA.bondFramework:
bondFramework: {
  BondName: "Coppice Green Bond",
  TotalIssuanceAmount: 100000,
  EligibleICMACategories: "Renewable Energy, Sustainable Water Management",
  ReportingStandard: "ICMA Green Bond Principles (June 2025)",
  RegulatoryFrameworks: "EU Taxonomy Regulation 2020/852",
  EUTaxonomyAlignmentPercent: 85,
  BondContractAddress: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
  LCCFContractAddress: "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350",
  ExternalReviewProvider: "Simulated VVB",
},
```

Update the ICMA test (line 70-74):

```typescript
it("shows ICMA compliance evidence section", () => {
  mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
  render(<ImpactPage />, { wrapper });
  expect(screen.getByText("ICMA Compliance Evidence")).toBeInTheDocument();
  expect(screen.getByText("Guardian Verified")).toBeInTheDocument();
});
```

Replace the Guardian integration test (lines 76-81):

```typescript
it("shows reporting frameworks from bond data", () => {
  mockUseGuardian.mockReturnValue({ data: MOCK_DATA, isLoading: false, error: null });
  render(<ImpactPage />, { wrapper });
  expect(screen.getByText(/ICMA Green Bond Principles/)).toBeInTheDocument();
  expect(screen.getByText(/EU Taxonomy/)).toBeInTheDocument();
});
```

**Step 4: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

**Step 5: Commit**

```
feat: replace hardcoded ICMA section with Guardian data-driven evidence
```

---

### Task 8: Guardian Events Tab on Compliance Page

**Files:**
- Create: `frontend/components/guardian/guardian-events.tsx`
- Modify: `frontend/app/monitor/page.tsx` (add tab layout)

**Step 1: Create guardian-events.tsx component**

```tsx
"use client";

import { useGuardian } from "@/hooks/use-guardian";
import type { GuardianProject, VCEvidence } from "@/lib/guardian-types";

function hashScanUrl(topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/topic/${topicId}/message/${messageId}`;
}

function ipfsUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
}

function abbreviateDid(did: string): string {
  const parts = did.split("_");
  const accountId = parts.length > 1 ? parts[parts.length - 1] : "";
  return accountId ? `did:hedera:...${accountId}` : did.slice(0, 20) + "...";
}

interface TimelineEvent {
  type: "registration" | "allocation" | "mrv" | "verification";
  projectName: string;
  date: string;
  evidence: VCEvidence;
  detail: string;
}

function buildTimeline(projects: GuardianProject[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const p of projects) {
    if (p.registrationEvidence) {
      events.push({
        type: "registration",
        projectName: p.registration.ProjectName,
        date: p.registrationEvidence.issuanceDate,
        evidence: p.registrationEvidence,
        detail: `${p.registration.ICMACategory} - ${p.registration.Location}`,
      });
    }
    if (p.allocation && p.allocationEvidence) {
      events.push({
        type: "allocation",
        projectName: p.allocation.ProjectName,
        date: p.allocationEvidence.issuanceDate,
        evidence: p.allocationEvidence,
        detail: `${p.allocation.AllocatedAmountEUSD.toLocaleString()} eUSD - ${p.allocation.Purpose}`,
      });
    }
    if (p.mrvReport && p.mrvEvidence) {
      events.push({
        type: "mrv",
        projectName: p.mrvReport.ProjectName,
        date: p.mrvEvidence.issuanceDate,
        evidence: p.mrvEvidence,
        detail: `${p.mrvReport.AnnualGHGReduced.toLocaleString()} tCO₂e reported (${p.mrvReport.ReportingPeriodStart} to ${p.mrvReport.ReportingPeriodEnd})`,
      });
    }
    if (p.verification && p.verificationEvidence) {
      events.push({
        type: "verification",
        projectName: p.verification.ProjectName,
        date: p.verificationEvidence.issuanceDate,
        evidence: p.verificationEvidence,
        detail: `${p.verification.Opinion} - ${p.verification.VerifiedGHGReduced.toLocaleString()} tCO₂e verified`,
      });
    }
  }
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  registration: "Project Registered",
  allocation: "Funds Allocated",
  mrv: "MRV Report Submitted",
  verification: "Verification Complete",
};

const TYPE_COLORS: Record<TimelineEvent["type"], string> = {
  registration: "bg-bond-teal/15 text-bond-teal",
  allocation: "bg-bond-amber/15 text-bond-amber",
  mrv: "bg-blue-500/15 text-blue-400",
  verification: "bg-bond-green/15 text-bond-green",
};

export function GuardianEvents() {
  const { data, isLoading } = useGuardian();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-static animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <div className="card-static text-sm text-text-muted text-center py-8">
        No Guardian verification events yet.
      </div>
    );
  }

  const timeline = buildTimeline(data.projects);

  return (
    <div className="space-y-3">
      {timeline.map((event, i) => (
        <div key={i} className="card-static">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_COLORS[event.type]}`}>
                  {TYPE_LABELS[event.type]}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(event.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white font-medium">{event.projectName}</p>
              <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
              <p className="text-[10px] text-text-muted/60 mt-1 font-mono">
                Signed by {abbreviateDid(event.evidence.issuer)}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <a href={ipfsUrl(event.evidence.hash)} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">IPFS</a>
              <a href={hashScanUrl(event.evidence.topicId, event.evidence.messageId)} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">HashScan</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Add tab layout to compliance monitor page**

Update `frontend/app/monitor/page.tsx` to add a tab toggle:

```tsx
"use client";

import { useState } from "react";
import { AuditEventFeed } from "@/components/audit-event-feed";
import { GuardianEvents } from "@/components/guardian/guardian-events";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { APPROVAL_EVENTS, RESTRICTION_EVENTS } from "@/lib/event-types";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");
  const [tab, setTab] = useState<"onchain" | "guardian">("onchain");

  const approvals = events.filter((e) => APPROVAL_EVENTS.has(e.type)).length;
  const restrictions = events.filter((e) => RESTRICTION_EVENTS.has(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 }}>Compliance Monitor</h1>

      {/* Stats banner - same as before */}
      <div className="bg-surface-2 border-y border-border full-bleed animate-entrance" style={{ "--index": 1 }}>
        <div className="max-w-7xl mx-auto flex divide-x divide-border">
          <div className="flex-1 py-6 pr-6">
            <p className="stat-label mb-2">Total Events</p>
            <p className="font-display text-5xl text-white">{events.length}</p>
          </div>
          <div className="flex-1 py-6 px-6">
            <p className="stat-label mb-2">Approvals</p>
            <p className="font-display text-5xl text-bond-green">{approvals}</p>
          </div>
          <div className="flex-1 py-6 pl-6">
            <p className="stat-label mb-2">Restrictions</p>
            <p className="font-display text-5xl text-bond-red">{restrictions}</p>
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit animate-entrance" style={{ "--index": 2 }}>
        <button
          onClick={() => setTab("onchain")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "onchain" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
          }`}
        >
          On-Chain Events
        </button>
        <button
          onClick={() => setTab("guardian")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "guardian" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
          }`}
        >
          Guardian Verification
        </button>
      </div>

      <div className="animate-entrance" style={{ "--index": 3 }}>
        {tab === "onchain" ? (
          <AuditEventFeed topicType="audit" />
        ) : (
          <GuardianEvents />
        )}
      </div>
    </div>
  );
}
```

**Step 3: Update E2E tests**

In `e2e/tests/compliance-monitor.spec.ts`, add test for Guardian tab:

```typescript
test("should show Guardian verification tab", async ({ page }) => {
  await page.goto("/monitor");
  await expect(page.getByRole("button", { name: "Guardian Verification" })).toBeVisible();
  await page.getByRole("button", { name: "Guardian Verification" }).click();
  // Should show Guardian events or empty state
  await page.waitForTimeout(3000);
  const hasEvents = await page.getByText("Project Registered").isVisible().catch(() => false);
  const hasEmpty = await page.getByText("No Guardian verification events").isVisible().catch(() => false);
  expect(hasEvents || hasEmpty).toBeTruthy();
});
```

**Step 4: Verify build + full E2E**

Run: `npm run build`
Run: `npm run test:unit`
Run: `cd e2e && npx playwright test compliance-monitor.spec.ts --reporter=list`

**Step 5: Commit**

```
feat: add Guardian verification events tab to compliance monitor
```

---

## Phase 3: Polish & Verify (Tasks 9-10)

### Task 9: Full Test Suite Verification

All test updates are embedded in their respective tasks (2, 3, 5, 7, 8). This task runs the full suite to catch any cross-task breakage.

**Step 1: Run full unit test suite**

Run: `npm run test:unit`
Expected: All 104+ tests pass

**Step 2: Run lint**

Run: `npm run lint`
Expected: Clean

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build

**Step 4: Fix any failures**

If any tests fail due to cross-task interactions (e.g., mock data shape changed in one file but not another), fix them now.

**Step 5: Commit if any fixes were needed**

```
test: fix cross-task test breakage
```

---

### Task 10: Full E2E Verification (Local + Vercel)

**Step 1: Run full local E2E suite**

Run: `cd e2e && npx playwright test --reporter=list`
Expected: All tests pass (67+ tests)

Fix any failures from the changes.

**Step 2: Deploy to Vercel**

Run: `vercel --prod --yes`

**Step 3: Run remote E2E suite against Vercel**

Run: `E2E_BASE_URL=https://www.coppice.cc npx playwright test guardian-live impact-page coupons-page compliance-monitor --reporter=list`
Expected: 23+ tests pass

**Step 4: Manual smoke test on Vercel**

1. Impact page: click "View Evidence Chain" on a project card — verify IPFS/HashScan links work
2. Impact page: verify ICMA Compliance Evidence shows real data from Guardian
3. Invest page: connect wallet, verify no ENS errors
4. Issuer page: grant agent role with non-deployer wallet — verify it works
5. Issuer page: verify Freeze/Pause are disabled for non-deployer
6. Coupons page: verify coupon data loads (may be slow)
7. Compliance page: click "Guardian Verification" tab — verify events appear

**Step 5: Commit any final fixes**

```
fix: final adjustments from E2E verification
```

---

## Task Dependency Graph

```
Task 1 (ENS fix) ─────────────────────────────────────┐
Task 2 (Grant agent role) ─────────────────────────────┤
Task 3 (Coupons hook) ────────────────────────────────┤── Task 9 (Tests) ── Task 10 (Full E2E)
Task 4 (Gate destructive ops) ─────────────────────────┤
Task 5 (VC metadata API) ── Task 6 (Evidence component)┤
                            Task 7 (ICMA section) ──────┤
                            Task 8 (Compliance tab) ────┘
```

Tasks 1-4 are independent. Tasks 5-8 are semi-independent (5 must come before 6/7/8). Task 9 depends on all. Task 10 is final.
