# Polish Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ~25 bugs and UX improvements across all 5 pages of the Coppice frontend, plus event-logger backfill.

**Architecture:** React Query for shared state (eUSD balance, coupons), Mirror Node for holder discovery, Guardian IPFS proxy for evidence links, client-side validation for coupon dates, reusable InfoTooltip/ContractLink components.

**Tech Stack:** Next.js 16, React Query (tanstack), ethers v6, Hedera Mirror Node REST API, Guardian API

---

### Task 1: useEusdBalance React Query Hook

**Files:**
- Create: `frontend/hooks/use-eusd-balance.ts`
- Modify: `frontend/app/page.tsx` (remove lines 21, 24, 28-49, 51; use new hook)
- Modify: `frontend/components/transfer-flow.tsx` (remove lines 23, 27, 29-36; use new hook)
- Modify: `frontend/components/faucet-button.tsx` (line 86: invalidate query instead of callback)

**Context:** The invest page and purchase form each independently fetch eUSD balance. After minting via faucet, only the invest page updates. The purchase form shows stale "0.00 available".

**Step 1: Create the hook**

Create `frontend/hooks/use-eusd-balance.ts`:

```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { EUSD_TOKEN_ID } from "@/lib/constants";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";
import { eusdFromRaw } from "@/lib/format";

async function fetchEusdBalance(evmAddress: string): Promise<number> {
  if (!EUSD_TOKEN_ID || !evmAddress) return 0;
  try {
    const accountId = await getHederaAccountId(evmAddress);
    const rawBalance = await getHtsTokenBalance(accountId, EUSD_TOKEN_ID);
    return eusdFromRaw(rawBalance);
  } catch {
    return 0;
  }
}

export function useEusdBalance(address: string | undefined) {
  return useQuery({
    queryKey: ["eusd-balance", address],
    queryFn: () => fetchEusdBalance(address!),
    enabled: !!address,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useInvalidateEusdBalance() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["eusd-balance"] }),
    [queryClient],
  );
}
```

**Step 2: Update invest page (`frontend/app/page.tsx`)**

Remove the manual eUSD state management (lines 21, 24, 28-49, 51). Replace with:

```typescript
// Remove these imports: useEffect, useCallback, useHTS
// Add:
import { useEusdBalance, useInvalidateEusdBalance } from "@/hooks/use-eusd-balance";

// Inside component, replace eusdBalance state + refreshEusdBalance + useEffect with:
const { data: eusdBalanceRaw } = useEusdBalance(address);
const invalidateEusd = useInvalidateEusdBalance();

const displayEusdBalance = address && eusdBalanceRaw != null
  ? formatNumber(eusdBalanceRaw, { minimumFractionDigits: 2 })
  : "--";

// Change FaucetButton prop:
<FaucetButton onSuccess={invalidateEusd} />
```

**Step 3: Update TransferFlow (`frontend/components/transfer-flow.tsx`)**

Remove lines 8 (useHTS import), 23 (useHTS call), 27 (eusdBalance state), 29-36 (useEffect). Replace with:

```typescript
import { useEusdBalance } from "@/hooks/use-eusd-balance";

// Inside component:
const { data: eusdBalance } = useEusdBalance(address);
// eusdBalance is now a number | undefined — same as before (null -> undefined)
```

Update the validation at line 158: `eusdBalance !== null` becomes `eusdBalance != null` (works for both null and undefined).

Update the display at line 170-172: same change `eusdBalance !== null` -> `eusdBalance != null`.

**Step 4: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 5: Commit**

```
feat: shared useEusdBalance hook fixes stale balance in purchase form
```

---

### Task 2: Compliance Status Link Chips

**Files:**
- Modify: `frontend/components/ui/hashscan-link.tsx` (add ExternalLinkIcon to AddressLink)
- Modify: `frontend/components/compliance-status.tsx` (lines 101-105, 110-134, 414-419)

**Context:** Compliance checks show plain text "Tx", "Registry", "Compliance" as links. Should show truncated hash/address chips with external link icons.

**Step 1: Update AddressLink in hashscan-link.tsx**

The existing `AddressLink` component (line 31-43) is missing the `ExternalLinkIcon`. Add it:

```typescript
export function AddressLink({ address, type = "account", prefixLen = 6, suffixLen = 4 }: AddressLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/${type}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"
      title={address}
    >
      {abbreviateAddress(address, prefixLen, suffixLen)}
      <ExternalLinkIcon />
    </a>
  );
}
```

**Step 2: Update compliance-status.tsx link data**

Change `CheckResult.link` interface (line 19-24) to carry the raw hash/address and a link type:

```typescript
interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
  link?: { type: "tx"; hash: string } | { type: "contract"; address: string };
}
```

Update `claimTxLink` (line 101-105) to return the new shape:

```typescript
function claimTxLink(claimTxs: ClaimTransactions, topic: number): CheckResult["link"] {
  const txHash = claimTxs.get(topic);
  if (!txHash) return undefined;
  return { type: "tx", hash: txHash };
}
```

Update `buildResults` (lines 107-135):
- Line 114: `link: registered ? { type: "contract", address: CONTRACT_ADDRESSES.identityRegistry } : undefined`
- Lines 116-118: `link: claims.kyc ? claimTxLink(claimTxs, CLAIM_TOPICS.KYC) : undefined` (remove the `"Tx"` label argument)
- Line 132: `link: { type: "contract", address: CONTRACT_ADDRESSES.compliance }`

**Step 3: Update the link rendering (lines 414-419)**

Replace the plain `<a>` tag with the appropriate component:

```typescript
import { TxLink, AddressLink } from "@/components/ui/hashscan-link";

// In the render (lines 414-419):
{check.link && check.status === "pass" && (
  <span className="text-[10px]">
    {check.link.type === "tx" ? (
      <TxLink hash={check.link.hash} prefixLen={6} />
    ) : (
      <AddressLink address={check.link.address} type="contract" prefixLen={6} suffixLen={4} />
    )}
  </span>
)}
```

**Step 4: Adjust TxLink and AddressLink font size**

Both components currently don't accept a className prop for sizing. The parent `<span className="text-[10px]">` wrapper handles this. If the icons look too large, add a `className` prop to both components. But try without first — the `text-[10px]` wrapper may be sufficient to override the font size while the icon stays small.

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 6: Commit**

```
feat: compliance status shows truncated tx/contract chips with link icons
```

---

### Task 3: Coupons — Hide Paid Toggle + Remove SnapshotId

**Files:**
- Modify: `frontend/app/coupons/page.tsx` (add toggle, remove snapshotId display)
- Modify: `frontend/hooks/use-coupons.ts` (fix status logic)

**Context:** All coupons shown regardless of status. SnapshotId is ATS jargon — replace with friendly status. Status is date-based only — use snapshotId to distinguish "executable" from "distributed".

**Step 1: Fix coupon status logic in use-coupons.ts**

Update `getCouponStatus` (lines 22-30) to accept snapshotId and add "executable" vs "distributed" distinction:

```typescript
function getCouponStatus(coupon: {
  recordDate: number;
  executionDate: number;
  snapshotId: number;
}): CouponInfo["status"] {
  const now = Math.floor(Date.now() / 1000);
  if (now < coupon.recordDate) return "upcoming";
  if (now < coupon.executionDate) return "record";
  // Past execution date: check if distribution actually happened
  if (coupon.snapshotId > 0) return "paid";
  return "executable";
}
```

Update the call site (line 65-68) to pass snapshotId:

```typescript
status: getCouponStatus({
  recordDate: Number(c.recordDate),
  executionDate: Number(c.executionDate),
  snapshotId: Number(registered.snapshotId),
}),
```

**Step 2: Update coupons page — add toggle and filter**

Add `useState` import (already has `useMemo`). Add state and filter:

```typescript
import { useState, useMemo } from "react";

// Inside CouponsPage, after couponList:
const [showPaid, setShowPaid] = useState(false);
const visibleCoupons = useMemo(
  () => couponList.filter((c) => showPaid || c.status !== "paid"),
  [couponList, showPaid],
);
const paidCount = useMemo(
  () => couponList.filter((c) => c.status === "paid").length,
  [couponList],
);
```

Add toggle button after the "Coupon Periods" heading (line 184):

```tsx
<div className="flex items-center justify-between">
  <h2 className="card-title mb-0">Coupon Periods</h2>
  {paidCount > 0 && (
    <button
      onClick={() => setShowPaid(!showPaid)}
      className="text-xs text-text-muted hover:text-white transition-colors"
      aria-pressed={showPaid}
    >
      {showPaid ? "Hide" : "Show"} paid ({paidCount})
    </button>
  )}
</div>
```

Change the map on line 186 from `couponList.map` to `visibleCoupons.map`.

**Step 3: Replace Snapshot ID with Record Status**

In the coupon card grid (lines 212-225), replace the "Snapshot ID" cell:

```tsx
<div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/5">
  <div>
    <p className="stat-label mb-1">Rate</p>
    <p className="font-mono text-sm text-white">{coupon.rateDisplay}</p>
  </div>
  <div>
    <p className="stat-label mb-1">Record Status</p>
    <p className="font-mono text-sm text-white flex items-center gap-1.5">
      {coupon.snapshotId > 0 ? (
        <>
          <span className="w-2 h-2 rounded-full bg-bond-green" aria-hidden="true" />
          Captured
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-text-muted/30" aria-hidden="true" />
          Pending
        </>
      )}
    </p>
  </div>
</div>
```

**Step 4: Update STATUS_LABEL map**

The existing `STATUS_LABEL` (lines 27-32) needs the "executable" case already defined. Verify it renders correctly. Update "paid" label to "Distributed":

```typescript
const STATUS_LABEL: Record<CouponInfo["status"], string> = {
  paid: "Distributed",
  executable: "Ready",
  record: "Record Date Passed",
  upcoming: "Upcoming",
};
```

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

Existing coupon tests may need status name updates. Check `frontend/__tests__/hooks/use-coupons.test.ts` for assertions on "paid" status — update if needed.

**Step 6: Commit**

```
feat: hide paid coupons by default, fix status logic with snapshotId, remove raw snapshotId display
```

---

### Task 4: IPFS Proxy via Guardian

**Files:**
- Create: `frontend/app/api/guardian/ipfs/[cid]/route.ts`
- Modify: `frontend/components/guardian/vc-evidence.tsx` (line 13-14)
- Modify: `frontend/components/guardian/guardian-events.tsx` (line 12-13)

**Context:** Guardian uses internal base58 hashes that aren't valid IPFS CIDs. `dweb.link` returns 422. Guardian exposes `GET /ipfs/file/{cid}` with auth. We proxy through our API.

**Step 1: Create the IPFS proxy route**

Create `frontend/app/api/guardian/ipfs/[cid]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GUARDIAN_API_URL } from "@/lib/constants";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";

async function getAccessToken(): Promise<string> {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  const { cid } = await params;

  if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
    return NextResponse.json({ error: "Invalid CID" }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${GUARDIAN_API_URL}/ipfs/file/${cid}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Guardian IPFS returned ${res.status}` },
        { status: res.status },
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Update ipfsUrl in both components**

In `frontend/components/guardian/vc-evidence.tsx` (line 13-14), change:

```typescript
function ipfsUrl(hash: string): string {
  return `/api/guardian/ipfs/${hash}`;
}
```

In `frontend/components/guardian/guardian-events.tsx` (line 12-13), same change:

```typescript
function ipfsUrl(hash: string): string {
  return `/api/guardian/ipfs/${hash}`;
}
```

**Step 3: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 4: Commit**

```
feat: proxy Guardian IPFS through API route, fixing 422 errors on evidence links
```

---

### Task 5: Impact Page — EU Taxonomy Link, Evidence Links, Sort Projects

**Files:**
- Modify: `frontend/app/impact/page.tsx` (lines 130-135, 143-197)
- Modify: `frontend/app/api/guardian/data/route.ts` (pass bondFrameworkEvidence)
- Modify: `frontend/lib/guardian-types.ts` (add bondFrameworkEvidence to GuardianData)

**Context:** EU Taxonomy 85% has no link. ICMA "Guardian Verified" badge has no evidence. Projects unsorted.

**Step 1: Pass bondFrameworkEvidence through API**

In `frontend/lib/guardian-types.ts`, add to `GuardianData` interface (line 146-155):

```typescript
export interface GuardianData {
  bondFramework: BondFrameworkCS | null;
  bondFrameworkEvidence?: VCEvidence;
  projects: GuardianProject[];
  // ... rest unchanged
}
```

In `frontend/app/api/guardian/data/route.ts`, around line 117 where `data` is built, add:

```typescript
bondFrameworkEvidence: bondFrameworkResults[0]?.evidence,
```

**Step 2: Sort projects alphabetically**

In `frontend/app/impact/page.tsx`, around line 132, sort before mapping:

```tsx
{data && data.projects.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[...data.projects]
      .sort((a, b) => a.registration.ProjectName.localeCompare(b.registration.ProjectName))
      .map((p) => (
        <ProjectCard key={p.registration.ProjectName} project={p} />
      ))}
  </div>
```

**Step 3: Add EU Taxonomy link**

In `frontend/app/impact/page.tsx`, line 193, change the plain text to a link:

```tsx
{data.bondFramework.EUTaxonomyAlignmentPercent != null && (
  <p className="text-xs text-text-muted mt-1">
    EU Taxonomy alignment: {data.bondFramework.EUTaxonomyAlignmentPercent}%
    {" "}
    <a
      href="https://www.icmagroup.org/green-social-and-sustainability-bonds/green-bond-principles-gbp/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-bond-green hover:text-bond-green/80 transition-colors"
    >
      (ICMA GBP)
    </a>
  </p>
)}
```

**Step 4: Add evidence link to ICMA Compliance Evidence header**

Replace the badge-only header (lines 147-150) with badge + evidence link:

```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="card-title mb-0">ICMA Compliance Evidence</h2>
  <div className="flex items-center gap-2">
    {data.bondFrameworkEvidence && (
      <a
        href={`/api/guardian/ipfs/${data.bondFrameworkEvidence.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors"
      >
        View VC
      </a>
    )}
    <StatusBadge label="Guardian Verified" variant="green" />
  </div>
</div>
```

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

Check `frontend/__tests__/pages/impact.test.tsx` for any assertions about project order or ICMA section.

**Step 6: Commit**

```
feat: impact page — sort projects, EU Taxonomy link, ICMA evidence link
```

---

### Task 6: InfoTooltip Reusable Component

**Files:**
- Create: `frontend/components/ui/info-tooltip.tsx`

**Context:** Needed for coupon date fields and other form fields. Shows a small (i) icon that reveals tooltip on hover/focus.

**Step 1: Create the component**

Create `frontend/components/ui/info-tooltip.tsx`:

```typescript
interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center ml-1 group">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-surface-3 text-text-muted hover:text-white text-[10px] font-semibold leading-none inline-flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bond-green"
        aria-label={text}
        tabIndex={0}
      >
        i
      </button>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded bg-surface-3 border border-border text-[11px] text-text-muted whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
      >
        {text}
      </span>
    </span>
  );
}
```

**Step 2: Commit**

```
feat: add reusable InfoTooltip component
```

---

### Task 7: Issuer Page — Reorder, Agent Access, Date Validation

**Files:**
- Modify: `frontend/app/issue/page.tsx` (multiple sections)

**Context:** Use of Proceeds mispositioned; agents can't create coupons; date validation is server-side only; distribute dropdown stale after creation.

**Step 1: Move Use of Proceeds before Operations**

Move the ProjectAllocation section (lines 570-573) to after the Holders Table section (after line 331). Cut these lines:

```tsx
{/* Use of Proceeds */}
<div className="animate-entrance" style={{ "--index": idx++ } as React.CSSProperties}>
  <ProjectAllocation />
</div>
```

Paste them after line 331 (after `</SectionErrorBoundary>` for holders).

**Step 2: Allow agents to create coupons**

Remove the `!isDeployer` guard on the Create Coupon card. At line 549-551, change:

```tsx
{!isDeployer && (
  <p className="text-xs text-text-muted">Only the bond issuer can create coupons (requires CORPORATE_ACTION role).</p>
)}
```

To:

```tsx
<p className="text-xs text-text-muted">Creates a new coupon period on the bond contract. Requires CORPORATE_ACTION role (executed by deployer).</p>
```

The button itself (line 542-548) has no `isDeployer` check — it's just disabled when fields are empty. So no button change needed.

**Step 3: Add React Query invalidation after coupon creation**

Add import at top of file:

```typescript
import { useQueryClient } from "@tanstack/react-query";
```

Inside component, add:

```typescript
const queryClient = useQueryClient();
```

After successful coupon creation (line 205-206), add invalidation:

```typescript
setLastCreateCouponTx(result.txHash);
createCouponOp.setStatus({ type: "success", msg: `Coupon #${result.couponId} created at ${couponRate}%` });
queryClient.invalidateQueries({ queryKey: ["coupons"] });
```

**Step 4: Add client-side date validation with tooltips**

Add import:

```typescript
import { InfoTooltip } from "@/components/ui/info-tooltip";
```

Add a validation function and state inside the component:

```typescript
function validateCouponDates(): string | null {
  const now = Date.now();
  if (couponStartDate && new Date(couponStartDate).getTime() <= now) {
    return "Start date must be in the future";
  }
  if (couponStartDate && couponRecordDate && new Date(couponRecordDate) <= new Date(couponStartDate)) {
    return "Record date must be after start date";
  }
  if (couponRecordDate && couponExecutionDate && new Date(couponExecutionDate) <= new Date(couponRecordDate)) {
    return "Execution date must be after record date";
  }
  if (couponStartDate && couponEndDate && new Date(couponEndDate) <= new Date(couponStartDate)) {
    return "End date must be after start date";
  }
  return null;
}
const couponDateError = validateCouponDates();
```

Add tooltips to each date label. For example, change the Start Date label (line 503):

```tsx
<label htmlFor="coupon-start" className="text-xs text-text-muted mb-1 flex items-center">
  Start Date
  <InfoTooltip text="When the coupon period begins. Must be in the future." />
</label>
```

Record Date (line 513):
```tsx
<label htmlFor="coupon-record" className="text-xs text-text-muted mb-1 flex items-center">
  Record Date
  <InfoTooltip text="Cutoff for determining holders. Must be after start date." />
</label>
```

Execution Date (line 523):
```tsx
<label htmlFor="coupon-execution" className="text-xs text-text-muted mb-1 flex items-center">
  Execution Date
  <InfoTooltip text="When distribution can be executed. Must be after record date." />
</label>
```

End Date (line 533):
```tsx
<label htmlFor="coupon-end" className="text-xs text-text-muted mb-1 flex items-center">
  End Date
  <InfoTooltip text="End of the coupon period. Must be after start date." />
</label>
```

Show validation error above the submit button:

```tsx
{couponDateError && (
  <p className="text-xs text-bond-red">{couponDateError}</p>
)}
<button
  onClick={handleCreateCoupon}
  disabled={!couponRate || !couponStartDate || !couponRecordDate || !couponExecutionDate || !couponEndDate || creatingCoupon || !!couponDateError}
  className="w-full btn-primary"
>
```

Note: add `|| !!couponDateError` to the disabled condition.

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 6: Commit**

```
feat: issuer — reorder proceeds, agent coupon access, date validation with tooltips, dropdown refresh
```

---

### Task 8: Issuer Page — Freeze Autosuggest, Proceeds Info, Distribute Filter

**Files:**
- Modify: `frontend/app/issue/page.tsx` (freeze input, allocate card, distribute dropdown)

**Context:** Freeze input has no autosuggest. Allocate card doesn't show available budget. Distribute dropdown shows all coupons including distributed ones.

**Step 1: Freeze/Unfreeze autosuggest using datalist**

Replace the freeze input (line 390) with a datalist-backed input:

```tsx
<input
  id="freeze-addr"
  type="text"
  value={freezeAddr}
  onChange={(e) => setFreezeAddr(e.target.value)}
  placeholder="Wallet address (0x...)"
  className="input"
  list="holder-addresses"
/>
<datalist id="holder-addresses">
  {holders.map((h) => (
    <option key={h.address} value={h.address}>
      {abbreviateAddress(h.address, 10, 6)}
    </option>
  ))}
</datalist>
```

`abbreviateAddress` is already imported at line 20.

**Step 2: Show available proceeds in Allocate card**

Add available/total display after the card title (inside the Allocate Proceeds card, after line 360):

```tsx
<h3 className="card-title">Allocate Proceeds</h3>
{guardianData && (
  <p className="text-xs text-text-muted -mt-1 mb-2">
    {formatNumber(totalAllocated)} / {formatNumber(guardianData.totalIssuanceEUSD)} eUSD allocated
    ({guardianData.allocationPercent}%)
  </p>
)}
```

**Step 3: Add mint clarification text**

After the Mint button (line 352), add:

```tsx
<StatusMessage status={mintOp.status} />
<p className="text-xs text-text-muted">Creates new CPC tokens (issuer operation). Investors purchase CPC with eUSD on the Invest page.</p>
```

**Step 4: Filter distributed coupons from distribute dropdown**

Change the dropdown options (lines 447-451) to filter out distributed coupons:

```tsx
{coupons
  .filter((c) => c.snapshotId === 0)
  .map((c) => (
    <option key={c.id} value={c.id}>
      Coupon #{c.id} — {c.rateDisplay} ({c.status})
    </option>
  ))}
```

Also update the disable logic (line 455). Since we now only show undistributed coupons, simplify:

```tsx
disabled={selectedCouponId === null || selectedCoupon?.status === "upcoming" || distributing}
```

Remove the `selectedCoupon?.status === "paid"` check since those are filtered out.

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 6: Commit**

```
feat: issuer — freeze autosuggest, proceeds budget display, filter distributed coupons, mint help text
```

---

### Task 9: Mirror Node Holder Discovery

**Files:**
- Modify: `frontend/hooks/use-holders.ts` (replace HCS-based discovery with Mirror Node)
- Modify: `frontend/lib/mirror-node.ts` (add token balances query)
- Modify: `frontend/lib/constants.ts` (may need CPC account ID)

**Context:** `useHolders` only discovers addresses from HCS audit events. If event-logger was down, addresses are invisible. Mirror Node `/api/v1/tokens/{tokenId}/balances` shows ALL holders.

**Step 1: Add Mirror Node token balances query to mirror-node.ts**

Add to `frontend/lib/mirror-node.ts`:

```typescript
const mirrorTokenBalanceEntrySchema = z.object({
  account: z.string(),
  balance: z.number(),
});

const mirrorTokenBalancesSchema = z.object({
  balances: z.array(mirrorTokenBalanceEntrySchema).optional(),
  links: z.object({ next: z.string().nullish() }).optional(),
});

/** Get all accounts holding a specific token with non-zero balances. */
export async function getTokenHolders(tokenId: string): Promise<string[]> {
  const accounts: string[] = [];
  let path: string | null = `/api/v1/tokens/${tokenId}/balances?account.balance=gt:0&limit=100`;

  while (path) {
    const data = await fetchMirrorNode(path, mirrorTokenBalancesSchema);
    for (const entry of data.balances ?? []) {
      accounts.push(entry.account);
    }
    path = data.links?.next ?? null;
  }
  return accounts;
}
```

**Step 2: Add Hedera account ID → EVM address resolution**

We need to convert Hedera account IDs (0.0.XXXX) to EVM addresses for `balanceOf` calls. Add to `mirror-node.ts`:

```typescript
const mirrorAccountDetailSchema = z.object({
  account: z.string(),
  evm_address: z.string(),
});

/** Resolve a Hedera account ID to an EVM address via Mirror Node. */
export async function getEvmAddress(accountId: string): Promise<string> {
  const data = await fetchMirrorNode(
    `/api/v1/accounts/${accountId}`,
    mirrorAccountDetailSchema,
  );
  return data.evm_address;
}
```

**Step 3: Rewrite useHolders to use Mirror Node**

Rewrite `frontend/hooks/use-holders.ts`. Keep the interface the same but change the address discovery:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, EUSD_TOKEN_ID } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
import { getTokenHolders, getEvmAddress } from "@/lib/mirror-node";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

export interface HolderInfo {
  address: string;
  balance: bigint;
  frozen: boolean;
  verified: boolean;
}

/** Extract unique holder addresses from HCS audit MINT/TRANSFER events. */
export function extractHolderAddresses(events: AuditEvent[]): string[] {
  const ZERO = ethers.ZeroAddress.toLowerCase();
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type !== "MINT" && e.type !== "TRANSFER") continue;
    const to = e.data.to?.toLowerCase();
    const from = e.data.from?.toLowerCase();
    if (to && to !== ZERO) seen.add(to);
    if (from && from !== ZERO) seen.add(from);
  }
  return [...seen];
}

/**
 * Hook that discovers token holders from Mirror Node (primary)
 * and HCS audit events (supplementary), then reads on-chain data.
 */
export function useHolders(events: AuditEvent[]) {
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [fetched, setFetched] = useState(false);
  const prevKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function fetchHolderData() {
      const provider = getReadProvider();
      const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, tokenAbi, provider);
      const registryContract = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, identityRegistryAbi, provider);

      // Primary: Mirror Node token balances (discovers ALL holders)
      const mirrorAddresses = new Set<string>();
      try {
        if (EUSD_TOKEN_ID) {
          // CPC token ID — derive from CPC_SECURITY_ID or use env var
          // The CPC account ID format is 0.0.XXXXXXX
          // We need the Hedera token ID. CPC_SECURITY_ID is the EVM address.
          // Use Mirror Node to look up the account and find associated tokens.
          const holderAccountIds = await getTokenHolders(
            process.env.NEXT_PUBLIC_CPC_TOKEN_ID || "0.0.8254921",
          );
          const evmPromises = holderAccountIds.map(async (accountId) => {
            try {
              return await getEvmAddress(accountId);
            } catch {
              return null;
            }
          });
          const evmAddresses = await Promise.all(evmPromises);
          for (const addr of evmAddresses) {
            if (addr) mirrorAddresses.add(addr.toLowerCase());
          }
        }
      } catch {
        // Fall through to HCS-based discovery
      }

      // Supplementary: HCS audit events (catches addresses even if Mirror is slow)
      const hcsAddresses = extractHolderAddresses(events);
      for (const addr of hcsAddresses) {
        mirrorAddresses.add(addr.toLowerCase());
      }

      const allAddresses = [...mirrorAddresses].filter((a) => ethers.isAddress(a));
      const addressKey = [...allAddresses].sort().join(",");

      // Skip if nothing changed
      if (addressKey === prevKeyRef.current && fetched) return;
      prevKeyRef.current = addressKey;

      const promises = allAddresses.map(async (address) => {
        try {
          const [balance, frozen, verified] = await Promise.all([
            tokenContract.balanceOf(address),
            tokenContract.isFrozen(address).catch(() => false),
            registryContract.isVerified(address).catch(() => false),
          ]);
          return { address, balance, frozen, verified };
        } catch {
          return { address, balance: BigInt(0), frozen: false, verified: false };
        }
      });

      const results = await Promise.all(promises);

      if (!cancelled) {
        results.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
        setHolders(results);
        setFetched(true);
      }
    }

    fetchHolderData();
    const interval = setInterval(fetchHolderData, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [events, fetched]);

  const loading = !fetched;

  return { holders, loading };
}
```

**Step 4: Add CPC_TOKEN_ID to constants and .env.example**

In `frontend/lib/constants.ts`, add:

```typescript
export const CPC_TOKEN_ID = process.env.NEXT_PUBLIC_CPC_TOKEN_ID || "0.0.8254921";
```

Update the hook to import `CPC_TOKEN_ID` instead of using `process.env` directly.

Add to `frontend/.env.example`:
```
NEXT_PUBLIC_CPC_TOKEN_ID=0.0.8254921
```

Add to `frontend/.env` (if accessible):
```
NEXT_PUBLIC_CPC_TOKEN_ID=0.0.8254921
```

**Step 5: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

Check `frontend/__tests__/hooks/use-holders.test.ts` — may need to mock the new Mirror Node calls.

**Step 6: Commit**

```
feat: discover token holders via Mirror Node, fixing missing holders when event-logger is down
```

---

### Task 10: Monitor Page — Coupon Activity Section + Event Types

**Files:**
- Modify: `frontend/app/monitor/page.tsx` (add coupon activity section)
- Modify: `frontend/lib/event-types.ts` (add coupon event types)

**Context:** No coupon events visible in Compliance Monitor. Add coupon lifecycle section using on-chain coupon data.

**Step 1: Add coupon event types to event-types.ts**

Add to `EVENT_TYPES` (line 2-10):

```typescript
export const EVENT_TYPES = {
  TRANSFER: "TRANSFER",
  MINT: "MINT",
  TOKEN_PAUSED: "TOKEN_PAUSED",
  TOKEN_UNPAUSED: "TOKEN_UNPAUSED",
  WALLET_FROZEN: "WALLET_FROZEN",
  WALLET_UNFROZEN: "WALLET_UNFROZEN",
  PROCEEDS_ALLOCATED: "PROCEEDS_ALLOCATED",
  COUPON_CREATED: "COUPON_CREATED",
  COUPON_DISTRIBUTED: "COUPON_DISTRIBUTED",
} as const;
```

Add to `APPROVAL_EVENTS` (line 15-20):

```typescript
export const APPROVAL_EVENTS: ReadonlySet<string> = new Set([
  EVENT_TYPES.TRANSFER,
  EVENT_TYPES.MINT,
  EVENT_TYPES.TOKEN_UNPAUSED,
  EVENT_TYPES.WALLET_UNFROZEN,
  EVENT_TYPES.COUPON_CREATED,
  EVENT_TYPES.COUPON_DISTRIBUTED,
]);
```

Add to `EVENT_BADGE_CLASSES` (line 29-37):

```typescript
[EVENT_TYPES.COUPON_CREATED]: "bg-bond-teal/15 text-bond-teal",
[EVENT_TYPES.COUPON_DISTRIBUTED]: "bg-bond-green/15 text-bond-green",
```

**Step 2: Add Coupon Activity section to Monitor page**

Import useCoupons and add a section between the tab toggle and the event panel:

```typescript
import { useCoupons } from "@/hooks/use-coupons";
import type { CouponInfo } from "@/hooks/use-coupons";
import { formatNumber } from "@/lib/format";

// Inside component:
const { data: coupons } = useCoupons();
```

Add a coupon summary section after the stats banner (after line 36), before the tab toggle:

```tsx
{/* Coupon Activity */}
{coupons && coupons.length > 0 && (
  <section className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
    <h2 className="card-title">Coupon Activity</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {coupons.map((c) => (
        <div key={c.id} className="card-static text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white text-sm">Coupon #{c.id}</span>
            <span className={`px-2 py-0.5 rounded font-medium ${
              c.status === "paid" ? "bg-bond-green/15 text-bond-green" :
              c.status === "executable" ? "bg-bond-green/15 text-bond-green" :
              "bg-bond-amber/15 text-bond-amber"
            }`}>
              {c.status === "paid" ? "Distributed" : c.status === "executable" ? "Ready" : c.status === "record" ? "Record" : "Upcoming"}
            </span>
          </div>
          <div className="space-y-1 text-text-muted">
            <div className="flex justify-between">
              <span>Rate</span>
              <span className="font-mono text-white">{c.rateDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span>Period</span>
              <span className="font-mono text-white">{c.periodDays}d</span>
            </div>
            <div className="flex justify-between">
              <span>Record</span>
              <span className="font-mono text-white">
                {new Date(c.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Record Status</span>
              <span className={`font-mono ${c.snapshotId > 0 ? "text-bond-green" : "text-text-muted"}`}>
                {c.snapshotId > 0 ? "Captured" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

Update the `--index` values for the tab toggle and event panel that follow (bump by 1).

**Step 3: Run tests and verify**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

Check `e2e/tests/compliance-monitor.spec.ts` for any strict assertions that might break.

**Step 4: Commit**

```
feat: monitor page shows coupon activity, adds coupon event types
```

---

### Task 11: Event Logger — Backfill + CouponSet Event

**Files:**
- Modify: `services/src/event-logger.ts`

**Context:** Event logger starts from current block, missing all historical events. Add backfill on startup by querying Mirror Node for events since the last HCS message. Also add CouponSet event to watched events.

**Step 1: Add CouponSet to TOKEN_ABI**

In `services/src/event-logger.ts`, update TOKEN_ABI (line 31-36):

```typescript
const TOKEN_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
  "event CouponSet(bytes32 corporateActionId, uint256 couponId, address indexed operator, (uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint256 rateDecimals, uint8 rateStatus) coupon)",
]);
```

Add the CouponSet case to the switch (after line 195):

```typescript
case "CouponSet": {
  const { couponId } = decoded.args;
  payload = {
    type: "COUPON_CREATED",
    ts: Date.now(),
    tx: log.transactionHash,
    data: {
      couponId: String(couponId),
    },
  };
  break;
}
```

**Step 2: Add backfill on startup**

Add a `backfill()` function before `main()`. This queries Mirror Node for the last HCS message timestamp, then queries contract logs from the beginning up to that gap:

```typescript
import { formatEther, zeroAddress, keccak256, toBytes } from "viem";

const MIRROR_NODE_URL = process.env.MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com";

async function getLastHcsTimestamp(topicId: string): Promise<number> {
  // Get the most recent HCS message to determine where we left off
  const res = await fetch(
    `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=desc&limit=1`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  const messages = data.messages ?? [];
  if (messages.length === 0) return 0;

  // Parse the message to get the ts field
  try {
    const decoded = JSON.parse(Buffer.from(messages[0].message, "base64").toString());
    return decoded.ts || 0;
  } catch {
    return 0;
  }
}

async function getContractLogs(
  tokenAddress: string,
  fromTimestamp?: string,
): Promise<Array<{ topics: string[]; data: string; transaction_hash: string; block_number: number }>> {
  const logs: Array<{ topics: string[]; data: string; transaction_hash: string; block_number: number }> = [];
  let url = `${MIRROR_NODE_URL}/api/v1/contracts/${tokenAddress}/results/logs?order=asc&limit=100`;
  if (fromTimestamp) {
    url += `&timestamp=gt:${fromTimestamp}`;
  }

  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    for (const log of data.logs ?? []) {
      logs.push(log);
    }
    url = data.links?.next ? `${MIRROR_NODE_URL}${data.links.next}` : "";
  }
  return logs;
}

async function backfill(
  client: Client,
  auditTopicId: TopicId,
  submitKey: PrivateKey,
  tokenAddress: string,
  topicIdStr: string,
): Promise<bigint> {
  console.log("  Checking for missed events to backfill...");

  const lastTs = await getLastHcsTimestamp(topicIdStr);
  if (lastTs === 0) {
    console.log("  No existing HCS messages — backfilling all contract events");
  } else {
    console.log(`  Last HCS event at ${new Date(lastTs).toISOString()}`);
  }

  // Query Mirror Node for all contract logs (optionally after last timestamp)
  const fromTimestamp = lastTs > 0 ? String(lastTs / 1000) : undefined;
  const logs = await getContractLogs(tokenAddress, fromTimestamp);

  if (logs.length === 0) {
    console.log("  No events to backfill");
    return 0n;
  }

  console.log(`  Found ${logs.length} events to backfill`);
  let maxBlock = 0n;
  let submitted = 0;

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: TOKEN_ABI,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      let payload: AuditEvent | null = null;

      switch (decoded.eventName) {
        case "Transfer": {
          const { from, to, value } = decoded.args;
          payload = {
            type: from === zeroAddress ? "MINT" : "TRANSFER",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { from, to, amount: formatEther(value) },
          };
          break;
        }
        case "Paused": {
          payload = { type: "TOKEN_PAUSED", ts: Date.now(), tx: log.transaction_hash, data: { by: decoded.args.account } };
          break;
        }
        case "Unpaused": {
          payload = { type: "TOKEN_UNPAUSED", ts: Date.now(), tx: log.transaction_hash, data: { by: decoded.args.account } };
          break;
        }
        case "AddressFrozen": {
          const { addr, isFrozen, owner } = decoded.args;
          payload = { type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN", ts: Date.now(), tx: log.transaction_hash, data: { wallet: addr, by: owner } };
          break;
        }
        case "CouponSet": {
          payload = { type: "COUPON_CREATED", ts: Date.now(), tx: log.transaction_hash, data: { couponId: String(decoded.args.couponId) } };
          break;
        }
      }

      if (payload) {
        await submitToHCS(client, auditTopicId, submitKey, payload);
        submitted++;
        console.log(`    Backfilled: ${payload.type} (tx: ${log.transaction_hash.slice(0, 10)}...)`);
      }
    } catch {
      // Skip undecodable logs
    }

    if (BigInt(log.block_number) > maxBlock) {
      maxBlock = BigInt(log.block_number);
    }
  }

  console.log(`  Backfill complete: ${submitted} events submitted to HCS`);
  return maxBlock;
}
```

**Step 3: Call backfill in main() before starting poll loop**

In `main()`, after setting up the client and before the poll loop (around line 106-108):

```typescript
// Backfill missed events before starting live polling
const backfilledBlock = await backfill(client, auditTopicId, operatorKey, tokenAddress, auditTopicIdStr);
let lastBlock = backfilledBlock > 0n
  ? backfilledBlock
  : await publicClient.getBlockNumber();

console.log(`  Starting live polling from block: ${lastBlock}`);
```

**Step 4: Test manually**

```bash
cd /Users/adoll/projects/hedera-green-bonds/services && npx tsx src/event-logger.ts
```

Expected: Should see "Checking for missed events to backfill..." and submit any missed events.

**Step 5: Commit**

```
feat: event-logger backfills missed events on startup via Mirror Node, adds CouponSet tracking
```

---

### Task 12: Final Verification

**Step 1: Run full test suite**

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run lint && npm run build && npm run test:unit
```

**Step 2: Run E2E tests locally**

```bash
cd /Users/adoll/projects/hedera-green-bonds/e2e && npx playwright test
```

**Step 3: Manual smoke test**

Start dev server and verify each fix:

```bash
cd /Users/adoll/projects/hedera-green-bonds && npm run dev
```

Checklist:
- [ ] Invest: Mint eUSD, purchase form shows updated balance immediately
- [ ] Invest: Compliance status shows truncated tx hash chips with external link icons
- [ ] Coupons: Paid coupons hidden by default, toggle shows them
- [ ] Coupons: "Snapshot ID" replaced with "Record Status" (Captured/Pending)
- [ ] Coupons: Status shows "Distributed" not "Paid" when snapshotId > 0
- [ ] Impact: "View on IPFS" links work (proxy through Guardian)
- [ ] Impact: EU Taxonomy has ICMA GBP link
- [ ] Impact: ICMA section has "View VC" evidence link
- [ ] Impact: Projects sorted alphabetically
- [ ] Issuer: Use of Proceeds appears before Operations
- [ ] Issuer: Non-deployer agents can create coupons
- [ ] Issuer: Date validation shows errors before submit
- [ ] Issuer: Date fields have info tooltips
- [ ] Issuer: After creating coupon, distribute dropdown updates
- [ ] Issuer: Freeze input autosuggest from holders
- [ ] Issuer: Allocate card shows budget info
- [ ] Issuer: Mint card has clarification text
- [ ] Issuer: Distribute dropdown hides distributed coupons
- [ ] Monitor: Coupon Activity section visible
- [ ] Monitor: Shows all holders including 0x31f2... (if event-logger backfills)

**Step 4: Commit any test fixes**

```
fix: update tests for polish batch changes
```
