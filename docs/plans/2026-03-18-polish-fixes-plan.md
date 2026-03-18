# Polish Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix purchase API mint bug, add balance validation, create reusable HashScan link components, fix evidence chain links, switch Issuer page to Guardian data, add compliance purge script, and polish coupon/issuer UX.

**Architecture:** Fix critical API bug first (mint→issue). Create shared `<HashScanLink>` and `<AddressLink>` components used across all pages. Switch Issuer page data sources from HCS to Guardian. Add utility script for resetting compliance state.

**Tech Stack:** Next.js 16, ethers v6, React, Playwright E2E, Hedera Mirror Node

---

## Task Dependency Graph

```
Task 1 (mint→issue) ──────────────────────────────────┐
Task 2 (reusable link components) ─────────────────────┤
Task 3 (purchase balance check + error truncation) ────┤
Task 4 (coupon UX: paid guard, record date, links) ───┤
Task 5 (issuer activity links) ────────────────────────┤── Task 12 (verify)
Task 6 (distribution success link) ────────────────────┤
Task 7 (issuer Use of Proceeds → Guardian) ────────────┤
Task 8 (evidence chain: IPFS/HashScan/timestamps) ────┤
Task 9 (evidence chain: download raw VC) ──────────────┤
Task 10 (compliance status scanner links) ─────────────┤
Task 11 (compliance purge script) ─────────────────────┘
```

Tasks 1-11 are independent (except Task 2 should be done before 4-6 since they use the shared components). Task 12 is final verification.

---

## Task 1: Fix Purchase API — `mint()` → `issue()`

**Files:**
- Modify: `frontend/app/api/purchase/route.ts` (lines 29-32, 98)

**Step 1: Fix the ABI and contract call**

The ATS bond uses ERC1594 `issue(address, uint256, bytes)`, not `mint(address, uint256)`. The `0xfc855b1` revert is because `mint()` doesn't exist on the ATS diamond proxy.

Replace the ABI and call:

```typescript
// Line 29-32: Replace SECURITY_MINT_ABI
const SECURITY_MINT_ABI = [
  "function issue(address to, uint256 value, bytes data) external",
];

// Line 98: Replace the mint call
const mintTx = await securityContract.issue(investor, mintAmount, "0x");
```

Also update the comment on line 29:
```typescript
// ATS Security issuance ABI — the diamond proxy's ERC1594 facet
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```
fix: use ERC1594 issue() instead of mint() in purchase API
```

---

## Task 2: Create Reusable HashScan Link Components

**Files:**
- Create: `frontend/components/ui/hashscan-link.tsx`
- Modify: `frontend/lib/format.ts` (add hashscan URL helpers)

**Step 1: Add URL helpers to format.ts**

Append to `frontend/lib/format.ts`:

```typescript
const HASHSCAN_BASE = "https://hashscan.io/testnet";

export function hashScanTxUrl(txHash: string): string {
  return `${HASHSCAN_BASE}/transaction/${txHash}`;
}

export function hashScanAccountUrl(address: string): string {
  return `${HASHSCAN_BASE}/account/${address}`;
}

export function hashScanContractUrl(address: string): string {
  return `${HASHSCAN_BASE}/contract/${address}`;
}
```

**Step 2: Create the shared component**

Create `frontend/components/ui/hashscan-link.tsx`:

```tsx
import { abbreviateAddress } from "@/lib/format";
import { ExternalLinkIcon } from "@/components/ui/icons";

interface TxLinkProps {
  hash: string;
  prefixLen?: number;
}

export function TxLink({ hash, prefixLen = 10 }: TxLinkProps) {
  return (
    <a
      href={`https://hashscan.io/testnet/transaction/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-bond-green hover:text-bond-green/80 transition-colors"
      title={hash}
    >
      {abbreviateAddress(hash, prefixLen, 0)}
      <ExternalLinkIcon />
    </a>
  );
}

interface AddressLinkProps {
  address: string;
  type?: "account" | "contract";
  prefixLen?: number;
  suffixLen?: number;
}

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
    </a>
  );
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean

**Step 4: Commit**

```
feat: add reusable TxLink and AddressLink components for HashScan
```

---

## Task 3: Purchase Balance Check + Error Truncation

**Files:**
- Modify: `frontend/components/transfer-flow.tsx` (add balance check, increase error length)

**Step 1: Add client-side balance validation**

In `transfer-flow.tsx`, import `useHTS` and add balance check:

```typescript
// Add to imports (line 12):
import { useHTS } from "@/hooks/use-hts";

// Inside TransferFlow component, after line 24:
const { getEusdBalance } = useHTS();
const [eusdBalance, setEusdBalance] = useState<number | null>(null);

// Add useEffect to fetch balance (after the useState declarations):
useEffect(() => {
  if (!address) return;
  let cancelled = false;
  getEusdBalance(address).then((bal) => {
    if (!cancelled) setEusdBalance(bal);
  });
  return () => { cancelled = true; };
}, [address, getEusdBalance]);
```

**Step 2: Add balance warning and disable button**

Replace the button disabled logic (line 150):

```tsx
disabled={!enabled || running || !amount || (eusdBalance !== null && Number(amount) > eusdBalance)}
```

Add balance warning after the cost display (after line 161, inside the `{amount && enabled && ...}` block):

```tsx
{amount && enabled && !running && eusdBalance !== null && Number(amount) > eusdBalance && (
  <p className="text-xs text-bond-red mt-1">
    Insufficient eUSD balance ({eusdBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} available)
  </p>
)}
```

**Step 3: Increase error message length**

In `transfer-flow.tsx` line 113, change `getErrorMessage(err, 60, ...)` to show more context:

```typescript
const message = getErrorMessage(err, 200, "Transaction failed");
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean

**Step 5: Commit**

```
fix: add client-side eUSD balance check to purchase flow
```

---

## Task 4: Coupon UX — Paid Guard, Record Date, Contract Link

**Files:**
- Modify: `frontend/app/issue/page.tsx` (disable paid coupons, show record date)
- Modify: `frontend/app/coupons/page.tsx` (add bond contract link)

**Step 1: Block re-distribution of paid coupons + show record date**

In `frontend/app/issue/page.tsx`:

Replace the disabled condition on line 406:

```tsx
disabled={selectedCouponId === null || selectedCoupon?.status === "upcoming" || selectedCoupon?.status === "paid" || distributing}
```

Replace the status messages block (lines 412-417):

```tsx
{selectedCoupon && (
  <p className="text-xs text-text-muted">
    {selectedCoupon.status === "upcoming" && `Record date: ${new Date(selectedCoupon.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Distribution available after execution date.`}
    {selectedCoupon.status === "record" && `Record date passed. Execution date: ${new Date(selectedCoupon.executionDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
    {selectedCoupon.status === "executable" && "Ready for distribution."}
    {selectedCoupon.status === "paid" && "This coupon has already been distributed."}
  </p>
)}
```

**Step 2: Add bond contract link to coupons page footer**

In `frontend/app/coupons/page.tsx`, add a HashScan link to the bond info footer section. Add import at top:

```typescript
import { CPC_SECURITY_ID } from "@/lib/constants";
```

After the description paragraph (line 259), before the closing `</div>`:

```tsx
<a
  href={`https://hashscan.io/testnet/contract/${CPC_SECURITY_ID}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1 text-xs text-bond-green hover:text-bond-green/80 transition-colors mt-3"
>
  View bond contract on HashScan
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
</a>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean

**Step 4: Commit**

```
fix: block paid coupon re-distribution, show dates in status messages
```

---

## Task 5: Issuer Activity Feed — Clickable Addresses

**Files:**
- Modify: `frontend/components/issuer-activity-feed.tsx`

**Step 1: Make addresses clickable in event summaries**

Import the AddressLink component at the top:

```typescript
import { AddressLink } from "@/components/ui/hashscan-link";
```

Change `eventSummary` to return `ReactNode` instead of `string`, and replace address abbreviations with `AddressLink` components:

```tsx
function eventSummary(event: AuditEvent): React.ReactNode {
  const d = event.data;
  switch (event.type) {
    case "MINT":
      return <>Minted {d.amount ?? "?"} CPC to <AddressLink address={d.to ?? ""} prefixLen={6} suffixLen={4} /></>;
    case "TRANSFER":
      return <><AddressLink address={d.from ?? ""} prefixLen={6} suffixLen={4} /> sent {d.amount ?? "?"} CPC to <AddressLink address={d.to ?? ""} prefixLen={6} suffixLen={4} /></>;
    case "TOKEN_PAUSED":
      return <>Token paused by <AddressLink address={d.by ?? ""} prefixLen={6} suffixLen={4} /></>;
    case "TOKEN_UNPAUSED":
      return <>Token unpaused by <AddressLink address={d.by ?? ""} prefixLen={6} suffixLen={4} /></>;
    case "WALLET_FROZEN":
      return <>Froze <AddressLink address={d.address ?? d.wallet ?? ""} prefixLen={6} suffixLen={4} /></>;
    case "WALLET_UNFROZEN":
      return <>Unfroze <AddressLink address={d.address ?? d.wallet ?? ""} prefixLen={6} suffixLen={4} /></>;
    default:
      return event.type;
  }
}
```

Also add the tx hash as a `TxLink` — import it:

```typescript
import { AddressLink, TxLink } from "@/components/ui/hashscan-link";
```

Replace the existing tx link (lines 71-81) with the TxLink component:

```tsx
{event.tx && (
  <span className="shrink-0 text-xs">
    <TxLink hash={event.tx} prefixLen={8} />
  </span>
)}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean

**Step 3: Commit**

```
feat: make addresses and tx hashes clickable in issuer activity feed
```

---

## Task 6: Distribution Success — Inline HashScan Link

**Files:**
- Modify: `frontend/app/issue/page.tsx` (line 194)

**Step 1: Make distribution success message include a clickable link**

The `distributeOp.setStatus` on line 194 currently shows a plain text tx hash. Change it to include a URL that the StatusMessage component can render. Since StatusMessage renders plain text, we'll change the success handler to set a richer message:

Replace line 194:

```typescript
distributeOp.setStatus({
  type: "success",
  msg: `Coupon #${selectedCouponId} distributed`,
  link: { label: result.txHash.slice(0, 16) + "...", href: `https://hashscan.io/testnet/transaction/${result.txHash}` },
});
```

Wait — `StatusMessage` doesn't support links. Let's keep it simple — use the raw URL in the message:

```typescript
distributeOp.setStatus({
  type: "success",
  msg: `Coupon #${selectedCouponId} distributed (${result.txHash.slice(0, 12)}...)`,
});
```

Actually, let's add a separate state for the tx hash and render it below the StatusMessage. Add state:

After line 71 (`const distributeOp = useOperationStatus();`), add:

```typescript
const [lastDistributeTx, setLastDistributeTx] = useState<string | null>(null);
```

In `handleDistribute`, after line 194, add:

```typescript
setLastDistributeTx(result.txHash);
```

Clear it when starting a new distribution — in `handleDistribute` at the top (after line 180):

```typescript
setLastDistributeTx(null);
```

Then in the JSX, after `<StatusMessage status={distributeOp.status} />` (line 419), add:

```tsx
{lastDistributeTx && distributeOp.status?.type === "success" && (
  <a
    href={`https://hashscan.io/testnet/transaction/${lastDistributeTx}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-bond-green hover:text-bond-green/80 transition-colors"
  >
    View on HashScan
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
  </a>
)}
```

**Step 2: Simplify the success message (remove redundant tx hash)**

Replace line 194:

```typescript
distributeOp.setStatus({ type: "success", msg: `Coupon #${selectedCouponId} distributed successfully.` });
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean

**Step 4: Commit**

```
feat: add HashScan link to coupon distribution success
```

---

## Task 7: Switch Issuer Use of Proceeds to Guardian Data

**Files:**
- Modify: `frontend/components/project-allocation.tsx` (switch from HCS to Guardian)
- Modify: `frontend/app/issue/page.tsx` (switch totalAllocated to Guardian)

**Step 1: Rewrite ProjectAllocation to use Guardian data**

Replace the entire `frontend/components/project-allocation.tsx`:

```tsx
"use client";

import { useGuardian } from "@/hooks/use-guardian";
import { CATEGORY_COLORS } from "@/lib/event-types";

export function ProjectAllocation() {
  const { data } = useGuardian();

  if (!data || data.projects.length === 0) {
    return (
      <div className="card-static">
        <h3 className="card-title">Use of Proceeds</h3>
        <p className="text-sm text-text-muted">No allocations recorded yet.</p>
      </div>
    );
  }

  const allocations = data.projects
    .filter((p) => p.allocation)
    .map((p) => ({
      name: p.registration.ProjectName,
      category: p.registration.ICMACategory,
      amount: p.allocation!.AllocatedAmountEUSD,
    }));

  const totalByCategory: Record<string, number> = {};
  let grandTotal = 0;
  for (const a of allocations) {
    totalByCategory[a.category] = (totalByCategory[a.category] || 0) + a.amount;
    grandTotal += a.amount;
  }

  return (
    <div className="card-static">
      <h3 className="card-title">Use of Proceeds</h3>

      <div className="space-y-2 mb-6">
        {Object.entries(totalByCategory).map(([category, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={category}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">{category}</span>
                <span className="text-white font-mono">
                  {total.toLocaleString("en-US")} eUSD ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {allocations.map((a) => (
          <div key={a.name} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
            <div>
              <span className="text-white">{a.name}</span>
              <span className="text-xs text-text-muted ml-2">{a.category}</span>
            </div>
            <span className="font-mono text-bond-green">
              {a.amount.toLocaleString("en-US")} eUSD
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Switch totalAllocated in issuer page**

In `frontend/app/issue/page.tsx`, replace lines 49-52:

```typescript
// Old: reads from HCS impact events
// const totalAllocated = impactEvents
//   .filter((e) => e.type === EVENT_TYPES.PROCEEDS_ALLOCATED)
//   .reduce((sum, e) => sum + parseFloat(e.data.amount || "0"), 0);

// New: reads from Guardian data
const totalAllocated = guardianData?.totalAllocatedEUSD ?? 0;
```

Now remove the unused HCS impact import. Remove from line 43:

```typescript
// Remove this line:
const { events: impactEvents } = useHCSAudit("impact");
```

Also check if `EVENT_TYPES` import is still needed. It's used at line 51 which we're removing. Check if it's used elsewhere in the file — it's not (the import was only for `PROCEEDS_ALLOCATED`). But `BOND_CATEGORIES` is still used (line 21). So remove `EVENT_TYPES` from the import on line 21:

```typescript
import { BOND_CATEGORIES } from "@/lib/event-types";
```

**Step 3: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

**Step 4: Commit**

```
feat: switch issuer Use of Proceeds from HCS to Guardian data
```

---

## Task 8: Evidence Chain — Fix Links + Add Timestamps

**Files:**
- Modify: `frontend/components/guardian/vc-evidence.tsx` (fix IPFS URL, add timestamps)
- Modify: `frontend/components/guardian/guardian-events.tsx` (add timestamps)

**Step 1: Fix IPFS URL and HashScan URL formats**

In `frontend/components/guardian/vc-evidence.tsx`:

The Guardian hash (e.g., `B528VZi5LR9TbJynASChiQ6sDMmziX3Sv3DGSoo1z36J`) is a base58 hash used by Guardian's IPFS. The public `ipfs.io` gateway may not pin these. Use Guardian's own IPFS gateway if available, or use a more reliable public gateway. Also, some Guardian hashes are NOT standard CIDs — they're internal document hashes.

Replace the `ipfsUrl` function:

```typescript
function ipfsUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
}
```

Since IPFS may not resolve (402/404), let's make the link indicate it may not resolve and add a fallback:

Actually, the simplest fix: Guardian hashes might work on `gateway.ipfs.io` or `dweb.link`. But more importantly, for the hackathon, the links should work. Let's keep the URL format but add `nftstorage.link` as an alternative gateway which tends to be more reliable:

```typescript
function ipfsUrl(hash: string): string {
  return `https://dweb.link/ipfs/${hash}`;
}
```

For HashScan, the format `https://hashscan.io/testnet/topic/{topicId}/message/{messageId}` should work, but HashScan uses a different path format for topic messages. Let me check — actually HashScan uses `/topic/{topicId}` to view the topic, and individual messages might need the sequence number, not the timestamp. Let's link to the topic page instead:

```typescript
function hashScanUrl(topicId: string, messageId: string): string {
  // HashScan topic message view uses the consensus timestamp
  return `https://hashscan.io/testnet/transaction/${messageId}`;
}
```

Wait — HCS messages are viewable via their consensus timestamp as transactions on HashScan. The format is:

```
https://hashscan.io/testnet/transaction/{consensusTimestamp}
```

Where consensusTimestamp is the `messageId` (e.g., `1773798642.220911089`). This is the correct format.

Update `hashScanUrl`:

```typescript
function hashScanUrl(topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/transaction/${messageId}`;
}
```

**Step 2: Add full timestamps instead of date-only**

In `vc-evidence.tsx`, replace the date display (line 37):

```tsx
// Old:
{new Date(evidence.issuanceDate).toLocaleDateString()}

// New:
{new Date(evidence.issuanceDate).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit",
})}
```

In `guardian-events.tsx`, replace the date display (line 119):

```tsx
// Old:
{new Date(event.date).toLocaleDateString()}

// New:
{new Date(event.date).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit",
})}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean

**Step 4: Commit**

```
fix: improve evidence chain IPFS/HashScan links and add timestamps
```

---

## Task 9: Evidence Chain — Download Raw VC JSON

**Files:**
- Modify: `frontend/app/api/guardian/data/route.ts` (return raw documents)
- Modify: `frontend/lib/guardian-types.ts` (add rawDocument field)
- Modify: `frontend/components/guardian/project-card.tsx` (add download button)

**Step 1: Add rawDocument to types**

In `frontend/lib/guardian-types.ts`, add to `GuardianProject`:

```typescript
// Add after verificationEvidence?
registrationDocument?: Record<string, unknown>;
allocationDocument?: Record<string, unknown>;
mrvDocument?: Record<string, unknown>;
verificationDocument?: Record<string, unknown>;
```

**Step 2: Return raw documents from API**

In `frontend/app/api/guardian/data/route.ts`, update `FetchResult`:

```typescript
interface FetchResult<T> {
  cs: T;
  evidence: VCEvidence;
  rawDocument: Record<string, unknown>;
}
```

Update the `fetchViewerBlock` return to include the raw document:

```typescript
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
```

Thread through to project construction (around line 121-133):

```typescript
registrationDocument: reg.rawDocument,
allocationDocument: alloc?.rawDocument,
mrvDocument: mrv?.rawDocument,
verificationDocument: verif?.rawDocument,
```

**Step 3: Add download button to project card**

In `frontend/components/guardian/project-card.tsx`, add a download helper function:

```typescript
function downloadJson(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

Add a "Download Evidence" button inside the expanded evidence section, after all `VCEvidenceRow` entries (inside the `{expanded && (` block, at the end before the closing `</div>`):

```tsx
<button
  onClick={() => {
    const evidence: Record<string, unknown> = {};
    if (project.registrationDocument) evidence.registration = project.registrationDocument;
    if (project.allocationDocument) evidence.allocation = project.allocationDocument;
    if (project.mrvDocument) evidence.mrv = project.mrvDocument;
    if (project.verificationDocument) evidence.verification = project.verificationDocument;
    downloadJson(evidence, `${project.registration.ProjectName.replace(/\s+/g, "-").toLowerCase()}-evidence.json`);
  }}
  className="w-full text-center text-xs text-text-muted hover:text-white transition-colors py-2 mt-2 border-t border-border/30"
>
  Download Evidence Chain (JSON)
</button>
```

**Step 4: Update guardian-data test**

In `frontend/__tests__/api/guardian-data.test.ts`, add assertion for rawDocument:

```typescript
expect(data.projects[0].registrationDocument).toBeTruthy();
```

**Step 5: Verify build + test**

Run: `npm run build`
Run: `npm run test:unit`

**Step 6: Commit**

```
feat: add raw VC document download to evidence chain
```

---

## Task 10: Compliance Status — Scanner Links

**Files:**
- Modify: `frontend/components/compliance-status.tsx`

**Step 1: Add contract links to compliance check details**

In the `buildResults` function (around line 97-114), enhance the detail strings to include useful info. We can't easily add links in the current `CheckResult.detail` string field, but we can add a new optional `link` field.

Update the `CheckResult` interface (line 18-22):

```typescript
interface CheckResult {
  label: string;
  status: "pass" | "fail" | "loading";
  detail?: string;
  link?: { href: string; label: string };
}
```

Update `buildResults` to include links:

```typescript
function buildResults(claims: ClaimStatus, registered: boolean, countryResult: { country: number; isRestricted: boolean; countryCheckFailed: boolean }, transferAllowed: boolean): CheckResult[] {
  const countryLabel = COUNTRY_NAMES[countryResult.country] || `Code ${countryResult.country}`;
  return [
    {
      label: "On-Chain Identity",
      status: registered ? "pass" : "fail",
      detail: registered ? "Identity contract linked" : "No identity found",
      link: registered ? { href: `https://hashscan.io/testnet/contract/${CONTRACT_ADDRESSES.identityRegistry}`, label: "Registry" } : undefined,
    },
    { label: "KYC Credential", status: claims.kyc ? "pass" : "fail", detail: claims.kyc ? "Verified" : "Missing" },
    { label: "AML Credential", status: claims.aml ? "pass" : "fail", detail: claims.aml ? "Verified" : "Missing" },
    { label: "Accredited Credential", status: claims.accredited ? "pass" : "fail", detail: claims.accredited ? "Verified" : "Missing" },
    {
      label: "Jurisdiction Check",
      status: countryResult.countryCheckFailed ? "fail" : countryResult.isRestricted ? "fail" : "pass",
      detail: countryResult.countryCheckFailed
        ? `${countryLabel} - Could not verify (try again)`
        : countryResult.isRestricted
          ? `${countryLabel} - Restricted`
          : `${countryLabel} - Approved`,
    },
    {
      label: "Transfer Eligibility",
      status: transferAllowed ? "pass" : "fail",
      detail: transferAllowed ? "Transfer permitted" : "Transfer blocked by compliance",
      link: { href: `https://hashscan.io/testnet/contract/${CONTRACT_ADDRESSES.compliance}`, label: "Compliance" },
    },
  ];
}
```

Also update `notRegisteredResults` to not have links (it's fine as-is since it has no link field).

**Step 2: Render the link in the check row**

In the JSX where checks are rendered (around line 365-385), add the link after the detail:

```tsx
{checks.map((check) => (
  <div key={check.label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 flex items-center justify-center">
        {check.status === "loading" ? (
          <Spinner aria-label="Checking" />
        ) : check.status === "pass" ? (
          <span className="animate-icon-enter"><CheckIcon className="w-5 h-5 text-bond-green" /></span>
        ) : (
          <span className="animate-icon-enter"><XIcon className="w-5 h-5 text-bond-red" /></span>
        )}
      </div>
      <span className="text-sm text-white">{check.label}</span>
    </div>
    <div className="flex items-center gap-2">
      {check.detail && (
        <span className={`text-xs ${check.status === "pass" ? "text-text-muted" : "text-bond-red/80"}`}>
          {check.detail}
        </span>
      )}
      {check.link && check.status === "pass" && (
        <a href={check.link.href} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">
          {check.link.label}
        </a>
      )}
    </div>
  </div>
))}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean

**Step 4: Commit**

```
feat: add HashScan links to compliance status checks
```

---

## Task 11: Compliance Purge Script

**Files:**
- Create: `scripts/reset-compliance.ts`

**Step 1: Create the purge script**

Create `scripts/reset-compliance.ts`:

```typescript
/**
 * Reset compliance state for a wallet address.
 * Removes the identity from the T-REX IdentityRegistry so the address
 * can go through the onboarding flow again.
 *
 * Usage: npx tsx scripts/reset-compliance.ts <address>
 * Requires: DEPLOYER_PRIVATE_KEY in .env
 */

import { ethers } from "ethers";
import "dotenv/config";

const IDENTITY_REGISTRY = "0x03ecdB8673d65b81752AC14dAaCa797D846c1B31";
const JSON_RPC_URL = "https://testnet.hashio.io/api";

const REGISTRY_ABI = [
  "function contains(address) view returns (bool)",
  "function deleteIdentity(address) external",
  "function identity(address) view returns (address)",
];

async function main() {
  const address = process.argv[2];
  if (!address || !ethers.isAddress(address)) {
    console.error("Usage: npx tsx scripts/reset-compliance.ts <0xAddress>");
    process.exit(1);
  }

  const checksummed = ethers.getAddress(address);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("DEPLOYER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL, undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, REGISTRY_ABI, wallet);

  console.log(`Checking identity for ${checksummed}...`);
  const registered = await registry.contains(checksummed);
  if (!registered) {
    console.log("Address is not registered in IdentityRegistry. Nothing to purge.");
    return;
  }

  const identityAddr = await registry.identity(checksummed);
  console.log(`Found identity contract: ${identityAddr}`);
  console.log("Deleting identity from registry...");

  const tx = await registry.deleteIdentity(checksummed, { gasLimit: BigInt(500_000) });
  console.log(`Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Identity deleted. Status: ${receipt?.status === 1 ? "SUCCESS" : "REVERTED"}`);
  console.log(`HashScan: https://hashscan.io/testnet/transaction/${receipt?.hash}`);

  // Verify
  const stillRegistered = await registry.contains(checksummed);
  console.log(`Verification: contains(${checksummed}) = ${stillRegistered}`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
```

**Step 2: Verify it compiles**

Run: `cd /Users/adoll/projects/hedera-green-bonds && npx tsx --version`
Expected: prints version (confirms tsx is available)

**Step 3: Commit**

```
feat: add compliance reset script for test account re-use
```

---

## Task 12: Full Verification (includes previous plan's Task 10)

**Step 1: Run full unit test suite**

Run: `npm run test:unit`
Expected: 104+ tests pass

**Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Run build**

Run: `npm run build`
Expected: Clean

**Step 4: Fix any unit test / build failures**

If tests fail due to mock shape changes (e.g., guardian-data test needs rawDocument), fix them.

**Step 5: Update E2E tests for new features**

In `e2e/tests/impact-page.spec.ts`, update any tests that reference the old ICMA section:
- "ICMA Green Bond Principles" → "ICMA Compliance Evidence"
- "Guardian MRV Integration" → removed (replaced by ICMA section)

In `e2e/tests/coupons-page.spec.ts`, check existing tests still pass with new bond contract link.

In `e2e/tests/issuer-dashboard.spec.ts`, check existing tests still pass with Guardian-based Use of Proceeds.

**Step 6: Run full local E2E suite**

Run: `cd e2e && npx playwright test --reporter=list`
Expected: All tests pass (67+ tests including new compliance-monitor Guardian tab test)

Fix any failures.

**Step 7: Deploy to Vercel**

Run: `vercel --prod --yes`

**Step 8: Run remote E2E suite against Vercel**

Run: `cd e2e && E2E_BASE_URL=https://www.coppice.cc npx playwright test guardian-live impact-page coupons-page compliance-monitor --reporter=list`
Expected: 23+ tests pass

**Step 9: Manual smoke test on Vercel**

1. **Invest page**: Connect wallet → compliance checks show scanner links → enter purchase amount > balance → see "Insufficient eUSD" warning
2. **Invest page**: Onboard new wallet → steps show tx hashes → identity contract link works
3. **Impact page**: Click "View Evidence Chain" → IPFS/HashScan links work → timestamps shown (not just dates) → click "Download Evidence Chain (JSON)" → JSON downloads
4. **Impact page**: ICMA Compliance Evidence shows real data, "Guardian Verified" badge
5. **Issuer page**: Grant agent role → mint tokens → activity feed shows clickable addresses and tx hashes
6. **Issuer page**: Distribute coupon → success shows "View on HashScan" link
7. **Issuer page**: Paid coupons disabled in dropdown message says "already been distributed"
8. **Issuer page**: Use of Proceeds matches Impact page data (Guardian source)
9. **Coupons page**: Coupon rate shows "4.25%" → bond contract link in footer
10. **Compliance page**: Toggle "Guardian Verification" tab → events appear with IPFS/HashScan links

**Step 10: Test compliance purge script**

Run: `cd scripts && npx tsx reset-compliance.ts 0x63196a9408a2756a0Fa058ff05C3212c0597B04c`
Expected: Identity deleted from registry. Then re-test onboarding on Invest page.

**Step 11: Commit any final fixes**

```
fix: final adjustments from E2E and smoke testing
```
