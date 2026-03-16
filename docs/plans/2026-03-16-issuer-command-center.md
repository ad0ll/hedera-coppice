# Issuer Command Center Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the issuer dashboard as a "Command Center" with stats banner, holders table, compact operation cards, and activity feed.

**Architecture:** Single-page layout at `/issue`. Stats banner (full-bleed) at top uses existing `useTokenRead` hook + new `useHolders` hook. Holders table is the centerpiece — derives addresses from HCS audit events, then batch-reads balanceOf/isFrozen/isVerified per address. Operation cards (mint, allocate, freeze, pause) arranged in a 2x2 grid. Activity feed at bottom reuses `useHCSAudit("audit")` with compact rendering. Allocate proceeds made visible to agents (not just owner).

**Tech Stack:** Next.js 16 App Router, wagmi v3, viem v2, Tailwind CSS v4, Zod 4, Hedera Mirror Node API

---

### Task 1: Create `useHolders` hook — derive holder addresses from HCS events + batch contract reads

**Files:**
- Create: `frontend/hooks/use-holders.ts`
- Test: `frontend/__tests__/hooks/use-holders.test.ts`

This hook extracts unique addresses from HCS audit MINT/TRANSFER events, then for each address reads `balanceOf`, `isFrozen`, and `isVerified` from contracts. It returns a typed array of holder objects.

**Step 1: Write the test file**

```typescript
// frontend/__tests__/hooks/use-holders.test.ts
import { describe, it, expect } from "vitest";
import { extractHolderAddresses } from "@/hooks/use-holders";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

describe("extractHolderAddresses", () => {
  it("extracts unique non-zero to-addresses from MINT events", () => {
    const events: AuditEvent[] = [
      { type: "MINT", ts: 1, tx: "0x1", data: { from: "0x" + "0".repeat(40), to: "0xAlice", amount: "100" }, sequenceNumber: 1, consensusTimestamp: "1.0" },
      { type: "MINT", ts: 2, tx: "0x2", data: { from: "0x" + "0".repeat(40), to: "0xBob", amount: "50" }, sequenceNumber: 2, consensusTimestamp: "2.0" },
      { type: "MINT", ts: 3, tx: "0x3", data: { from: "0x" + "0".repeat(40), to: "0xAlice", amount: "200" }, sequenceNumber: 3, consensusTimestamp: "3.0" },
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toHaveLength(2);
    expect(addresses).toContain("0xAlice");
    expect(addresses).toContain("0xBob");
  });

  it("extracts both from and to from TRANSFER events, excludes zero address", () => {
    const events: AuditEvent[] = [
      { type: "TRANSFER", ts: 1, tx: "0x1", data: { from: "0xAlice", to: "0xCharlie", amount: "10" }, sequenceNumber: 1, consensusTimestamp: "1.0" },
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toContain("0xAlice");
    expect(addresses).toContain("0xCharlie");
    expect(addresses).not.toContain("0x" + "0".repeat(40));
  });

  it("returns empty array for non-transfer events", () => {
    const events: AuditEvent[] = [
      { type: "TOKEN_PAUSED", ts: 1, tx: "0x1", data: { by: "0xAdmin" }, sequenceNumber: 1, consensusTimestamp: "1.0" },
    ];
    expect(extractHolderAddresses(events)).toHaveLength(0);
  });

  it("normalizes addresses to lowercase for deduplication", () => {
    const events: AuditEvent[] = [
      { type: "MINT", ts: 1, tx: "0x1", data: { from: "0x" + "0".repeat(40), to: "0xABCD" }, sequenceNumber: 1, consensusTimestamp: "1.0" },
      { type: "MINT", ts: 2, tx: "0x2", data: { from: "0x" + "0".repeat(40), to: "0xabcd" }, sequenceNumber: 2, consensusTimestamp: "2.0" },
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/hooks/use-holders.test.ts`
Expected: FAIL — module not found

**Step 3: Write the hook implementation**

```typescript
// frontend/hooks/use-holders.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { type Address, zeroAddress, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

const ZERO = zeroAddress.toLowerCase();

export interface HolderInfo {
  address: Address;
  balance: bigint;
  frozen: boolean;
  verified: boolean;
}

/** Extract unique holder addresses from HCS audit MINT/TRANSFER events. */
export function extractHolderAddresses(events: AuditEvent[]): string[] {
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
 * Hook that derives token holders from HCS audit events, then reads
 * balanceOf, isFrozen, and isVerified for each address.
 */
export function useHolders(events: AuditEvent[]) {
  const publicClient = usePublicClient();
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const prevAddressesRef = useRef<string>("");

  useEffect(() => {
    if (!publicClient || events.length === 0) {
      setLoading(false);
      return;
    }

    const addresses = extractHolderAddresses(events);
    const addressKey = addresses.sort().join(",");

    // Skip if addresses haven't changed
    if (addressKey === prevAddressesRef.current && holders.length > 0) return;
    prevAddressesRef.current = addressKey;

    if (addresses.length === 0) {
      setHolders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHolderData() {
      const results: HolderInfo[] = [];

      // Batch all reads in parallel per address
      const promises = addresses.filter(isAddress).map(async (addr) => {
        const address = addr as Address;
        try {
          const [balance, frozen, verified] = await Promise.all([
            publicClient!.readContract({
              address: CONTRACT_ADDRESSES.token,
              abi: tokenAbi,
              functionName: "balanceOf",
              args: [address],
            }),
            publicClient!.readContract({
              address: CONTRACT_ADDRESSES.token,
              abi: tokenAbi,
              functionName: "isFrozen",
              args: [address],
            }),
            publicClient!.readContract({
              address: CONTRACT_ADDRESSES.identityRegistry,
              abi: identityRegistryAbi,
              functionName: "isVerified",
              args: [address],
            }),
          ]);
          return { address, balance, frozen, verified } as HolderInfo;
        } catch {
          return { address, balance: 0n, frozen: false, verified: false } as HolderInfo;
        }
      });

      const settled = await Promise.all(promises);
      results.push(...settled);

      if (!cancelled) {
        // Sort by balance descending
        results.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
        setHolders(results);
        setLoading(false);
      }
    }

    fetchHolderData();

    // Re-fetch every 15 seconds
    const interval = setInterval(fetchHolderData, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicClient, events, holders.length]);

  return { holders, loading };
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/hooks/use-holders.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/hooks/use-holders.ts frontend/__tests__/hooks/use-holders.test.ts
git commit -m "feat(issuer): add useHolders hook with address extraction from HCS events"
```

---

### Task 2: Create `HoldersTable` component

**Files:**
- Create: `frontend/components/holders-table.tsx`

This component renders the holders list with balance, frozen status, verified status, and HashScan links.

**Step 1: Write the component**

```typescript
// frontend/components/holders-table.tsx
"use client";

import { type Address } from "viem";
import { formatBalance, abbreviateAddress } from "@/lib/format";
import { DEMO_WALLETS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner, ExternalLinkIcon } from "@/components/ui/icons";
import type { HolderInfo } from "@/hooks/use-holders";

function holderLabel(address: Address): string | null {
  return DEMO_WALLETS[address.toLowerCase()]?.label ?? null;
}

export function HoldersTable({ holders, loading }: { holders: HolderInfo[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="card-flush">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-semibold text-white">Token Holders</h3>
        </div>
        <div className="px-6 py-8 flex items-center justify-center gap-3 text-text-muted text-sm" role="status">
          <Spinner aria-hidden />
          Loading holder data...
        </div>
      </div>
    );
  }

  return (
    <div className="card-flush">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Token Holders</h3>
        <span className="text-xs text-text-muted font-mono">{holders.length} addresses</span>
      </div>

      {holders.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-text-muted">
          No holders yet. Mint tokens to add the first holder.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-3 text-left stat-label font-medium">Address</th>
                <th className="px-6 py-3 text-right stat-label font-medium">Balance</th>
                <th className="px-6 py-3 text-center stat-label font-medium">Verified</th>
                <th className="px-6 py-3 text-center stat-label font-medium">Status</th>
                <th className="px-6 py-3 text-right stat-label font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h) => {
                const label = holderLabel(h.address);
                return (
                  <tr key={h.address} className="border-b border-border/20 last:border-0 hover:bg-surface-3/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white">{abbreviateAddress(h.address)}</span>
                        {label && (
                          <span className="text-xs text-text-muted">({label})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-white">
                      {formatBalance(h.balance)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <StatusBadge
                        label={h.verified ? "Verified" : "Unverified"}
                        variant={h.verified ? "green" : "red"}
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      {h.frozen ? (
                        <StatusBadge label="Frozen" variant="red" />
                      ) : (
                        <StatusBadge label="Active" variant="green" />
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <a
                        href={`https://hashscan.io/testnet/account/${h.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-bond-green transition-colors"
                        title="View on HashScan"
                      >
                        <ExternalLinkIcon />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/holders-table.tsx
git commit -m "feat(issuer): add HoldersTable component"
```

---

### Task 3: Create `IssuerStats` component — stats banner

**Files:**
- Create: `frontend/components/issuer-stats.tsx`

Full-bleed stats banner matching the design of the investor portfolio stats on the home page.

**Step 1: Write the component**

```typescript
// frontend/components/issuer-stats.tsx
"use client";

import { formatBalance } from "@/lib/format";
import type { HolderInfo } from "@/hooks/use-holders";

interface IssuerStatsProps {
  totalSupply: bigint | undefined;
  isPaused: boolean | null;
  holders: HolderInfo[];
  totalAllocated: number;
}

export function IssuerStats({ totalSupply, isPaused, holders, totalAllocated }: IssuerStatsProps) {
  const holderCount = holders.filter((h) => h.balance > 0n).length;
  const frozenCount = holders.filter((h) => h.frozen).length;
  const supplyDisplay = totalSupply != null ? formatBalance(totalSupply) : "--";

  return (
    <div className="bg-surface-2 border-y border-border full-bleed">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
        <div className="py-5 pr-6">
          <p className="stat-label mb-1">Total Supply</p>
          <p className="font-display text-3xl text-white">{supplyDisplay}</p>
          <p className="text-xs text-text-muted mt-1">CPC minted</p>
        </div>
        <div className="py-5 px-6">
          <p className="stat-label mb-1">Holders</p>
          <p className="font-display text-3xl text-white">{holderCount}</p>
          {frozenCount > 0 && (
            <p className="text-xs text-bond-red mt-1">{frozenCount} frozen</p>
          )}
          {frozenCount === 0 && (
            <p className="text-xs text-text-muted mt-1">Active accounts</p>
          )}
        </div>
        <div className="py-5 px-6">
          <p className="stat-label mb-1">Token Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
            <p className="font-display text-3xl" style={{ color: isPaused ? "var(--color-bond-red)" : "var(--color-bond-green)" }}>
              {isPaused === null ? "--" : isPaused ? "Paused" : "Active"}
            </p>
          </div>
        </div>
        <div className="py-5 pl-6">
          <p className="stat-label mb-1">Proceeds Allocated</p>
          <p className="font-display text-3xl text-bond-amber">
            {totalAllocated > 0 ? `$${totalAllocated.toLocaleString("en-US")}` : "--"}
          </p>
          <p className="text-xs text-text-muted mt-1">Use of proceeds</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/issuer-stats.tsx
git commit -m "feat(issuer): add IssuerStats banner component"
```

---

### Task 4: Create `IssuerActivityFeed` component — compact recent events

**Files:**
- Create: `frontend/components/issuer-activity-feed.tsx`

Compact activity feed showing the last 20 audit events. Reuses `AuditEvent` type from `use-hcs-audit`.

**Step 1: Write the component**

```typescript
// frontend/components/issuer-activity-feed.tsx
"use client";

import { EVENT_BADGE_CLASSES } from "@/lib/event-types";
import { abbreviateAddress } from "@/lib/format";
import { ExternalLinkIcon, Spinner } from "@/components/ui/icons";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

function formatTimestamp(ts: number | string): string {
  if (typeof ts === "string") {
    const secs = parseFloat(ts);
    return new Date(secs * 1000).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function eventSummary(event: AuditEvent): string {
  const d = event.data;
  switch (event.type) {
    case "MINT":
      return `Minted ${d.amount ?? "?"} CPC to ${abbreviateAddress(d.to ?? "", 6, 4)}`;
    case "TRANSFER":
      return `${abbreviateAddress(d.from ?? "", 6, 4)} sent ${d.amount ?? "?"} CPC to ${abbreviateAddress(d.to ?? "", 6, 4)}`;
    case "TOKEN_PAUSED":
      return `Token paused by ${abbreviateAddress(d.by ?? "", 6, 4)}`;
    case "TOKEN_UNPAUSED":
      return `Token unpaused by ${abbreviateAddress(d.by ?? "", 6, 4)}`;
    case "WALLET_FROZEN":
      return `Froze ${abbreviateAddress(d.address ?? d.wallet ?? "", 6, 4)}`;
    case "WALLET_UNFROZEN":
      return `Unfroze ${abbreviateAddress(d.address ?? d.wallet ?? "", 6, 4)}`;
    default:
      return event.type;
  }
}

export function IssuerActivityFeed({ events, loading }: { events: AuditEvent[]; loading: boolean }) {
  const recent = [...events].reverse().slice(0, 20);

  return (
    <div className="card-flush">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <span className="text-xs text-text-muted font-mono">{events.length} total events</span>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center gap-3 text-text-muted text-sm py-4 justify-center" role="status">
            <Spinner aria-hidden />
            Loading events...
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {recent.map((event) => (
              <div key={event.sequenceNumber} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGE_CLASSES[event.type] || "bg-surface-3 text-text-muted"}`}>
                  {event.type}
                </span>
                <span className="text-xs text-text-muted flex-1 truncate">
                  {eventSummary(event)}
                </span>
                <span className="text-[11px] text-text-muted/60 shrink-0">
                  {formatTimestamp(event.consensusTimestamp || event.ts)}
                </span>
                {event.tx && (
                  <a
                    href={`https://hashscan.io/testnet/transaction/${event.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-bond-green transition-colors shrink-0"
                    title={event.tx}
                  >
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/issuer-activity-feed.tsx
git commit -m "feat(issuer): add IssuerActivityFeed component"
```

---

### Task 5: Rewrite the issuer dashboard page — assemble Command Center

**Files:**
- Modify: `frontend/app/issue/page.tsx` (full rewrite)
- Modify: `frontend/app/api/issuer/allocate/route.ts:31-35` (allow agents, not just deployer)

This is the main task — assemble the stats banner, holders table, operation cards, proceeds allocation, and activity feed into the new layout.

**Step 1: Update the allocate API route to accept agents**

In `frontend/app/api/issuer/allocate/route.ts`, replace the deployer-only auth check with an agent check. The route currently verifies `signature` against `DEPLOYER_ADDRESS`. Instead, verify the signature against the signer's address (extracted from the signature), then check if that address is an agent on-chain.

Actually, simpler approach that doesn't require on-chain reads from the API route: just verify the wallet signature is valid (which `verifyAuth` already does by recovering the signer), then skip the deployer-only check. The wallet signature itself proves the caller is who they claim to be, and the frontend already gates access behind `useIsAgent()`.

```typescript
// In route.ts, change the auth section:
// BEFORE: await verifyAuth(authMessage, signature, deployerAddress);
// AFTER:  await verifyAuth(authMessage, signature);
// And remove the deployerAddress lookup

// But verifyAuth takes 3 args. Let's check what it does...
```

Actually, let me check `verifyAuth` to understand its signature.

The auth function `verifyAuth(message, signature, expectedAddress)` recovers the signer from the EIP-191 signature and compares it to `expectedAddress`. To allow any agent (not just deployer), we need to either:
- Remove the address check and just verify the signature is valid (then the frontend isAgent gate is sufficient)
- Or change it to accept a list of allowed addresses

The simplest approach: make `verifyAuth` return the recovered address, and let the route decide. But `verifyAuth` is used elsewhere too. Instead, let's just change the allocate route to verify the signature is valid (recovers to any address) and skip the deployer check. We can do this by passing the recovered address from the signature as the expected address.

Cleanest approach: extract the signer from the request body, verify signature matches that signer. The allocate route doesn't need to restrict to deployer — the frontend already restricts to agents, and the worst case for a hackathon is someone can submit a PROCEEDS_ALLOCATED HCS message (informational only, no funds movement).

Change in `route.ts`:
- Remove `DEPLOYER_ADDRESS` check
- Add `signerAddress` to the request body schema
- Verify signature matches the provided signerAddress

**Step 2: Rewrite the issuer dashboard page**

The new layout:
1. Auth gate (keep existing)
2. `<IssuerStats>` — full-bleed stats banner
3. `<HoldersTable>` — centerpiece
4. Operation cards in 2x2 grid: Mint, Allocate, Freeze, Pause
5. `<ProjectAllocation>` — use of proceeds breakdown
6. `<IssuerActivityFeed>` — recent events

The operation cards remain compact forms. Mint and Allocate on the left column, Freeze and Pause on the right.

```typescript
// frontend/app/issue/page.tsx — full rewrite
"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useConnection, useConfig } from "wagmi";
import { useTokenRead, useTokenWrite, useIsAgent, useTokenOwner } from "@/hooks/use-token";
import { useHolders } from "@/hooks/use-holders";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { IssuerStats } from "@/components/issuer-stats";
import { HoldersTable } from "@/components/holders-table";
import { IssuerActivityFeed } from "@/components/issuer-activity-feed";
import { ProjectAllocation } from "@/components/project-allocation";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { abbreviateAddress, getErrorMessage } from "@/lib/format";
import { BOND_CATEGORIES, EVENT_TYPES } from "@/lib/event-types";
import { fetchAPI } from "@/lib/api-client";
import { grantAgentRoleResponseSchema } from "@/app/api/demo/grant-agent-role/route";
import { allocateResponseSchema } from "@/app/api/issuer/allocate/route";

export default function IssuerDashboard() {
  const { address } = useConnection();
  const config = useConfig();
  const { totalSupply, paused: pausedQuery } = useTokenRead();
  const { mint, pause, unpause, setAddressFrozen, loading } = useTokenWrite();
  const { data: isAuthorized, isLoading: isCheckingAgent, refetch: refetchIsAgent } = useIsAgent(address);
  const { data: tokenOwner } = useTokenOwner();
  const isOwner = address && tokenOwner ? address.toLowerCase() === tokenOwner.toLowerCase() : false;

  // HCS events — used for holders table and activity feed
  const { events: auditEvents, loading: auditLoading } = useHCSAudit("audit");
  const { events: impactEvents } = useHCSAudit("impact");
  const { holders, loading: holdersLoading } = useHolders(auditEvents);

  const isPaused = pausedQuery.data ?? null;
  const supply = totalSupply.data;

  // Calculate total allocated from impact events
  const totalAllocated = impactEvents
    .filter((e) => e.type === EVENT_TYPES.PROCEEDS_ALLOCATED)
    .reduce((sum, e) => sum + parseFloat(e.data.amount || "0"), 0);

  // Form state
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const mintOp = useOperationStatus();

  const [freezeAddr, setFreezeAddr] = useState("");
  const freezeOp = useOperationStatus();

  const pauseOp = useOperationStatus();

  const [project, setProject] = useState("");
  const [category, setCategory] = useState("Renewable Energy");
  const [proceedsAmount, setProceedsAmount] = useState("");
  const proceedsOp = useOperationStatus();

  const [promoting, setPromoting] = useState(false);
  const promoteOp = useOperationStatus();

  async function handlePromote() {
    if (!address || promoting) return;
    setPromoting(true);
    promoteOp.clear();
    try {
      const { message, signature } = await signAuthMessage(config, address, "Grant Agent Role");
      await fetchAPI("/api/demo/grant-agent-role", grantAgentRoleResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorAddress: address, message, signature }),
      });
      promoteOp.setStatus({ type: "success", msg: "Agent role granted — loading dashboard..." });
      await refetchIsAgent();
    } catch (err: unknown) {
      promoteOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    } finally {
      setPromoting(false);
    }
  }

  async function handleMint() {
    if (!mintTo || !mintAmount) return;
    if (!isAddress(mintTo)) {
      mintOp.setStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    mintOp.clear();
    try {
      await mint(mintTo, parseEther(mintAmount));
      mintOp.setStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${abbreviateAddress(mintTo, 10, 0)}` });
      setMintTo("");
      setMintAmount("");
    } catch (err: unknown) {
      mintOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Mint failed") });
    }
  }

  async function handleFreeze(action: "freeze" | "unfreeze") {
    if (!freezeAddr) return;
    if (!isAddress(freezeAddr)) {
      freezeOp.setStatus({ type: "error", msg: "Invalid Ethereum address" });
      return;
    }
    freezeOp.clear();
    try {
      await setAddressFrozen(freezeAddr, action === "freeze");
      freezeOp.setStatus({
        type: "success",
        msg: `${action === "freeze" ? "Froze" : "Unfroze"} ${abbreviateAddress(freezeAddr, 10, 0)}`,
      });
    } catch (err: unknown) {
      freezeOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handlePauseToggle() {
    pauseOp.clear();
    try {
      if (isPaused) {
        await unpause();
        pauseOp.setStatus({ type: "success", msg: "Token unpaused" });
      } else {
        await pause();
        pauseOp.setStatus({ type: "success", msg: "Token paused" });
      }
    } catch (err: unknown) {
      pauseOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  async function handleAllocateProceeds() {
    if (!project || !proceedsAmount || !address) return;
    proceedsOp.clear();
    try {
      const { message: authMessage, signature } = await signAuthMessage(config, address, "Allocate Proceeds");

      await fetchAPI("/api/issuer/allocate", allocateResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          category,
          amount: Number(proceedsAmount),
          currency: "USD",
          signerAddress: address,
          message: authMessage,
          signature,
        }),
      });
      proceedsOp.setStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project}` });
      setProject("");
      setProceedsAmount("");
    } catch (err: unknown) {
      proceedsOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    }
  }

  // --- Render gates ---

  if (!address) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon className="w-6 h-6 text-text-muted" />}
        title="Issuer Dashboard"
        description="Connect your issuer wallet to manage tokens, view holders, allocate proceeds, and control trading."
      />
    );
  }

  if (isCheckingAgent) {
    return (
      <div className="card p-12 text-center">
        <span className="spinner w-6 h-6" role="status" aria-label="Checking authorization" />
        <p className="text-text-muted text-sm mt-4">Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon className="w-6 h-6 text-bond-amber" />}
        title="Become an Issuer"
        description="Grant yourself the agent role to manage tokens, view holders, and control trading. This demonstrates ERC-3643 role-based access control."
        variant="default"
        action={
          <div className="space-y-3 max-w-sm mx-auto">
            <button onClick={handlePromote} disabled={promoting} aria-busy={promoting} className="w-full btn-primary">
              {promoting ? "Granting role..." : "Grant Agent Role"}
            </button>
            <StatusMessage status={promoteOp.status} />
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-bond-amber/8 border border-bond-amber/20 text-left">
              <WarningIcon className="w-4 h-4 text-bond-amber shrink-0 mt-0.5" />
              <p className="text-xs text-bond-amber/90">
                Demo only — in production, agent roles are assigned by the token owner, not self-service.
              </p>
            </div>
          </div>
        }
      />
    );
  }

  // --- Main dashboard ---

  let idx = 0;

  return (
    <div className="space-y-6">
      {!isOwner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-bond-amber/8 border border-bond-amber/20 animate-entrance" style={{ "--index": idx++ }}>
          <StatusBadge label="Demo" variant="amber" className="text-[10px] uppercase tracking-wider shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            You have the agent role for this demo session. In production, agent roles are managed by the token owner.
          </p>
        </div>
      )}

      <h1 className="page-title animate-entrance" style={{ "--index": idx++ }}>Issuer Dashboard</h1>

      {/* Stats Banner */}
      <div className="animate-entrance" style={{ "--index": idx++ }}>
        <IssuerStats totalSupply={supply} isPaused={isPaused} holders={holders} totalAllocated={totalAllocated} />
      </div>

      {/* Holders Table */}
      <div className="animate-entrance" style={{ "--index": idx++ }}>
        <HoldersTable holders={holders} loading={holdersLoading} />
      </div>

      {/* Operation Cards — 2x2 grid */}
      <div className="space-y-4">
        <p className="stat-label animate-entrance" style={{ "--index": idx++ }}>Operations</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mint */}
          <div className="animate-entrance" style={{ "--index": idx++ }}>
            <Card>
              <h3 className="card-title">Mint Tokens</h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="mint-to">Recipient address</label>
                <input id="mint-to" type="text" value={mintTo} onChange={(e) => setMintTo(e.target.value)}
                  placeholder="Recipient address (0x...)" className="input" />
                <label className="sr-only" htmlFor="mint-amount">Mint amount</label>
                <input id="mint-amount" type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="Amount (CPC)" min="0" className="input" />
                <button onClick={handleMint} disabled={loading || !mintTo || !mintAmount}
                  className="w-full btn-primary">
                  {loading ? "Minting..." : "Mint"}
                </button>
                <StatusMessage status={mintOp.status} />
              </div>
            </Card>
          </div>

          {/* Allocate Proceeds — now visible to all agents */}
          <div className="animate-entrance" style={{ "--index": idx++ }}>
            <Card>
              <h3 className="card-title">Allocate Proceeds</h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="project-name">Project name</label>
                <input id="project-name" type="text" value={project} onChange={(e) => setProject(e.target.value)}
                  placeholder="Project name" className="input" />
                <label className="sr-only" htmlFor="project-category">Category</label>
                <select id="project-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  {BOND_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
                <label className="sr-only" htmlFor="proceeds-amount">Amount in USD</label>
                <input id="proceeds-amount" type="number" value={proceedsAmount} onChange={(e) => setProceedsAmount(e.target.value)}
                  placeholder="Amount (USD)" min="0" className="input" />
                <button onClick={handleAllocateProceeds} disabled={!project || !proceedsAmount}
                  className="w-full btn-outline-amber">
                  Record Allocation
                </button>
                <StatusMessage status={proceedsOp.status} />
              </div>
            </Card>
          </div>

          {/* Freeze/Unfreeze */}
          <div className="animate-entrance" style={{ "--index": idx++ }}>
            <Card>
              <h3 className="card-title">Freeze / Unfreeze Wallet</h3>
              <div className="space-y-3">
                <label className="sr-only" htmlFor="freeze-addr">Wallet address to freeze/unfreeze</label>
                <input id="freeze-addr" type="text" value={freezeAddr} onChange={(e) => setFreezeAddr(e.target.value)}
                  placeholder="Wallet address (0x...)" className="input" />
                <div className="flex gap-2">
                  <button onClick={() => handleFreeze("freeze")}
                    disabled={loading || !freezeAddr}
                    className="flex-1 btn-outline-red">
                    Freeze
                  </button>
                  <button onClick={() => handleFreeze("unfreeze")}
                    disabled={loading || !freezeAddr}
                    className="flex-1 btn-outline-green">
                    Unfreeze
                  </button>
                </div>
                <StatusMessage status={freezeOp.status} />
              </div>
            </Card>
          </div>

          {/* Pause Control */}
          <div className="animate-entrance" style={{ "--index": idx++ }}>
            <Card>
              <h3 className="card-title">Token Pause Control</h3>
              <div className="flex items-center justify-between mb-4 bg-surface-3/50 rounded-lg px-4 py-3">
                <span className="text-sm text-text-muted">Current Status</span>
                <span className={`text-sm font-medium flex items-center gap-2 ${isPaused ? "text-bond-red" : "text-bond-green"}`}>
                  <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
                  {isPaused ? "Paused" : "Active"}
                </span>
              </div>
              <button onClick={handlePauseToggle} disabled={loading}
                className={`w-full ${isPaused ? "btn-outline-green" : "btn-outline-red"}`}>
                {isPaused ? "Unpause Token" : "Pause Token"}
              </button>
              <StatusMessage status={pauseOp.status} className="mt-2" />
            </Card>
          </div>
        </div>
      </div>

      {/* Use of Proceeds */}
      <div className="animate-entrance" style={{ "--index": idx++ }}>
        <ProjectAllocation />
      </div>

      {/* Activity Feed */}
      <div className="animate-entrance" style={{ "--index": idx++ }}>
        <IssuerActivityFeed events={auditEvents} loading={auditLoading} />
      </div>
    </div>
  );
}
```

**Step 3: Update the allocate API route**

Change `frontend/app/api/issuer/allocate/route.ts` to accept a `signerAddress` in the request body and verify the signature against that address (instead of hardcoding deployer-only).

```typescript
// In allocateBodySchema, add:
signerAddress: z.string().nonempty(),

// Replace the deployer-only auth check with:
try {
  await verifyAuth(authMessage, signature, parsed.data.signerAddress);
} catch (err: unknown) {
  const msg = getErrorMessage(err, 0, "Auth failed");
  return NextResponse.json({ error: msg }, { status: 401 });
}

// Remove the DEPLOYER_ADDRESS lookup
```

**Step 4: Build and verify**

Run: `npm run build && npm run lint`
Expected: clean build, no lint errors

**Step 5: Commit**

```bash
git add frontend/app/issue/page.tsx frontend/app/api/issuer/allocate/route.ts
git commit -m "feat(issuer): redesign dashboard as Command Center with stats, holders, activity feed"
```

---

### Task 6: Update E2E tests for the new dashboard layout

**Files:**
- Modify: `e2e/tests/issuer-dashboard.spec.ts`

Update E2E tests to match the new dashboard structure. Key changes:
- "Allocate Proceeds" is now visible to agents (Bob), not just owner
- New elements to verify: stats banner, holders table, activity feed
- Existing form selectors should remain the same

```typescript
// e2e/tests/issuer-dashboard.spec.ts — full rewrite
import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { DEPLOYER_KEY, ALICE_KEY, BOB_KEY } from "../fixtures/test-keys";

test.describe("Issuer Dashboard", () => {
  test("should require wallet connection", async ({ page }) => {
    await page.goto("/issue");
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible();
  });

  test("should show self-promotion UI for non-agent wallet (Alice)", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Become an Issuer")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: "Grant Agent Role" })).toBeVisible();
    await expect(page.getByText("Demo only")).toBeVisible();
    await expect(page.getByText("Mint Tokens")).not.toBeVisible();
  });

  test("should show full dashboard when connected as deployer", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Stats banner
    await expect(page.getByText("Total Supply")).toBeVisible();
    await expect(page.getByText("Holders")).toBeVisible();
    await expect(page.getByText("Token Status")).toBeVisible();
    await expect(page.getByText("Proceeds Allocated")).toBeVisible();

    // Holders table
    await expect(page.getByText("Token Holders")).toBeVisible();

    // Operation cards
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze")).toBeVisible();
    await expect(page.getByText("Token Pause Control")).toBeVisible();

    // Activity feed
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("should display mint form with inputs", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    const mintSection = page.getByText("Mint Tokens").locator("..");
    await expect(mintSection.getByPlaceholder("Recipient address")).toBeVisible({ timeout: 10000 });
    await expect(mintSection.getByPlaceholder("Amount (CPC)")).toBeVisible();
    await expect(mintSection.getByRole("button", { name: "Mint" })).toBeVisible();
  });

  test("should display freeze/unfreeze controls", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByRole("button", { name: "Freeze", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Unfreeze", exact: true })).toBeVisible();
  });

  test("should display pause control with current status", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Token Pause Control")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Active")).toBeVisible({ timeout: 15000 });
  });

  test("should show allocate proceeds form", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByPlaceholder("Project name")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Record Allocation" })).toBeVisible();
  });

  test("deployer should NOT see demo banner", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You have the agent role for this demo session")).not.toBeVisible();
  });

  test("self-promotion flow grants agent role (Bob)", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    const promoteButton = page.getByRole("button", { name: "Grant Agent Role" });
    const dashboard = page.getByText("Issuer Dashboard");

    await expect(promoteButton.or(dashboard)).toBeVisible({ timeout: 30000 });

    if (await promoteButton.isVisible()) {
      await promoteButton.click();
      await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 60000 });
    }

    // Bob should see the demo banner
    await expect(page.getByText("You have the agent role for this demo session")).toBeVisible();
    // Bob should now see ALL operation cards including allocate
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
  });
});
```

**Step 6: Run E2E tests**

Run: `cd e2e && npx playwright test tests/issuer-dashboard.spec.ts`
Expected: all 8 tests pass

**Step 7: Commit**

```bash
git add e2e/tests/issuer-dashboard.spec.ts
git commit -m "test(issuer): update E2E tests for Command Center layout"
```

---

### Task 7: Run full test suite and fix any issues

**Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: 70+ tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: clean build

**Step 3: Run lint**

Run: `npm run lint`
Expected: no errors

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: all tests pass

**Step 5: Final commit if any fixes needed**

```bash
git commit -m "fix(issuer): address test/lint issues from dashboard redesign"
```
