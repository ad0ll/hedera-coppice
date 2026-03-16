# Judge Self-Promotion to Issuer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let hackathon judges promote themselves to the agent role and use the issuer dashboard with direct wallet signing.

**Architecture:** New API route `/api/demo/grant-agent-role` calls `token.addAgent(address)` via deployer key. Issuer page replaces "Not Authorized" state with a demo promote UI. Allocate Proceeds card is hidden for non-owner agents.

**Tech Stack:** Next.js 16 API routes, viem, wagmi v3, vitest, Zod 4

---

### Task 1: API Route — `/api/demo/grant-agent-role`

**Files:**
- Create: `frontend/app/api/demo/grant-agent-role/route.ts`
- Test: `frontend/__tests__/api/grant-agent-role.test.ts`

**Step 1: Write the failing test**

Create `frontend/__tests__/api/grant-agent-role.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock deployer utilities
const mockWriteContract = vi.fn().mockResolvedValue("0xtxhash");
const mockReadContract = vi.fn().mockResolvedValue(false); // default: not an agent
const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
  transactionHash: "0xtxhash",
  status: "success",
});

vi.mock("@/lib/deployer", () => ({
  getDeployerWalletClient: vi.fn().mockReturnValue({
    account: { address: "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE" },
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  }),
  getServerPublicClient: vi.fn().mockReturnValue({
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
    readContract: (...args: unknown[]) => mockReadContract(...args),
  }),
}));

// Mock viem — need real getAddress
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return { ...actual };
});

// Mock auth — accept all signatures
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Mock wagmi config
vi.mock("@/lib/wagmi", () => ({
  hederaTestnet: { id: 296, name: "Hedera Testnet" },
}));

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock @coppice/common
vi.mock("@coppice/common", () => ({
  tokenAbi: [],
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  CONTRACT_ADDRESSES: {
    token: "0x17e19B53981370a904d0003Ba2D336837a43cbf0",
  },
}));

// Set env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);

const FAKE_ADDRESS = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/demo/grant-agent-role", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/demo/grant-agent-role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockResolvedValue(false);
  });

  it("rejects missing investorAddress", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({ message: "test", signature: "0xsig" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid address", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: "not-an-address",
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid address");
  });

  it("rejects invalid signature", async () => {
    mockVerifyAuth.mockRejectedValueOnce(new Error("Invalid signature"));
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xbadsig",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 409 when address is already an agent", async () => {
    mockReadContract.mockResolvedValueOnce(true);
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already/i);
  });

  it("succeeds and returns txHash", async () => {
    const { POST } = await import("@/app/api/demo/grant-agent-role/route");
    const res = await POST(makeRequest({
      investorAddress: FAKE_ADDRESS,
      message: "test",
      signature: "0xsig",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBe("0xtxhash");
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/api/grant-agent-role.test.ts`
Expected: FAIL — module not found

**Step 3: Write the API route**

Create `frontend/app/api/demo/grant-agent-role/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAddress, type Address } from "viem";
import { z } from "zod";
import { tokenAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getDeployerWalletClient, getServerPublicClient } from "@/lib/deployer";
import { verifyAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";

const bodySchema = z.object({
  investorAddress: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { investorAddress, message, signature } = parsed.data;

  let address: Address;
  try {
    address = getAddress(investorAddress);
  } catch {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    await verifyAuth(message, signature, address);
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const publicClient = getServerPublicClient();
    const walletClient = getDeployerWalletClient();

    // Check if already an agent
    const alreadyAgent = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.token,
      abi: tokenAbi,
      functionName: "isAgent",
      args: [address],
    });

    if (alreadyAgent) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }

    // Call token.addAgent(address) as deployer (owner)
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.token,
      abi: tokenAbi,
      functionName: "addAgent",
      args: [address],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: receipt.transactionHash });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Failed to grant agent role");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/api/grant-agent-role.test.ts`
Expected: PASS — all 5 tests green

**Step 5: Run full test suite**

Run: `npm run test:unit`
Expected: All 55 tests pass (50 existing + 5 new)

**Step 6: Commit**

```bash
git add frontend/app/api/demo/grant-agent-role/route.ts frontend/__tests__/api/grant-agent-role.test.ts
git commit -m "feat: add /api/demo/grant-agent-role endpoint for judge self-promotion"
```

---

### Task 2: Add `useTokenOwner` hook

**Files:**
- Modify: `frontend/hooks/use-token.ts`

**Step 1: Add the hook**

Add to `frontend/hooks/use-token.ts` after the `useIsFrozen` export (after line 59):

```typescript
export function useTokenOwner() {
  return useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "owner",
  });
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add frontend/hooks/use-token.ts
git commit -m "feat: add useTokenOwner hook"
```

---

### Task 3: Issuer page — demo promote UI and conditional Allocate

**Files:**
- Modify: `frontend/app/issue/page.tsx`

**Step 1: Update imports**

Replace the existing imports block (lines 1-15) with:

```typescript
"use client";

import { useState, useCallback } from "react";
import { isAddress, parseEther } from "viem";
import { useConnection, useConfig } from "wagmi";
import { useTokenRead, useTokenWrite, useIsAgent, useTokenOwner } from "@/hooks/use-token";
import { ProjectAllocation } from "@/components/project-allocation";
import { signAuthMessage } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusMessage } from "@/components/ui/status-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons";
import { useOperationStatus } from "@/hooks/use-operation-status";
import { abbreviateAddress, getErrorMessage } from "@/lib/format";
import { BOND_CATEGORIES } from "@/lib/event-types";
```

Changes from original:
- Added `useCallback` import
- Added `useTokenOwner` to the use-token import
- Added `StatusBadge` import
- Added `WarningIcon` import
- Removed `ProhibitIcon` (no longer used — "Not Authorized" state is replaced)

**Step 2: Add state and hooks**

After line 22 (`const { data: isAuthorized, isLoading: isCheckingAgent } = useIsAgent(address);`), add the `refetch` destructure and new hooks:

Replace line 22 with:
```typescript
  const { data: isAuthorized, isLoading: isCheckingAgent, refetch: refetchIsAgent } = useIsAgent(address);
  const { data: tokenOwner } = useTokenOwner();
  const isOwner = address && tokenOwner ? address.toLowerCase() === tokenOwner.toLowerCase() : false;
```

Add demo promote state after the existing state declarations (after line 38, `const proceedsOp = useOperationStatus();`):

```typescript
  const [promoting, setPromoting] = useState(false);
  const promoteOp = useOperationStatus();

  const handlePromote = useCallback(async () => {
    if (!address || promoting) return;
    setPromoting(true);
    promoteOp.clear();
    try {
      const { message, signature } = await signAuthMessage(config, address, "Grant Agent Role");
      const res = await fetch("/api/demo/grant-agent-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorAddress: address, message, signature }),
      });
      const data: { error?: string; txHash?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant agent role");
      promoteOp.setStatus({ type: "success", msg: "Agent role granted — loading dashboard..." });
      await refetchIsAgent();
    } catch (err: unknown) {
      promoteOp.setStatus({ type: "error", msg: getErrorMessage(err, 80, "Failed") });
    } finally {
      setPromoting(false);
    }
  }, [address, config, promoting, promoteOp, refetchIsAgent]);
```

**Step 3: Replace the "Not Authorized" block**

Replace lines 137-146 (the `if (!isAuthorized)` block) with:

```typescript
  if (!isAuthorized) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon className="w-6 h-6 text-bond-amber" />}
        title="Become an Issuer"
        description="Grant yourself the agent role to mint tokens, freeze wallets, and pause trading. This demonstrates ERC-3643 role-based access control."
        variant="default"
        action={
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={handlePromote}
              disabled={promoting}
              className="w-full btn-primary"
            >
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
```

**Step 4: Add demo banner at top of authorized dashboard**

Replace line 150 (the `<h1>` tag) with:

```typescript
      {!isOwner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-bond-amber/8 border border-bond-amber/20 animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>
          <StatusBadge label="Demo" variant="amber" className="text-[10px] uppercase tracking-wider shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            You have the agent role for this demo session. In production, agent roles are managed by the token owner.
          </p>
        </div>
      )}
      <h1 className="page-title animate-entrance" style={{ "--index": isOwner ? 0 : 1 } as React.CSSProperties}>Issuer Dashboard</h1>
```

**Step 5: Conditionally hide Allocate Proceeds card**

The Allocate Proceeds card is in lines 174-195 (the second `<div className="animate-entrance">` inside "Token Operations"). Wrap it with a conditional:

Replace:
```typescript
          <div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
            <Card>
              <h3 className="card-title">Allocate Proceeds</h3>
              ...
            </Card>
          </div>
```

With:
```typescript
          {isOwner && (
            <div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
              <Card>
                <h3 className="card-title">Allocate Proceeds</h3>
                ...
              </Card>
            </div>
          )}
```

Only the wrapping `{isOwner && (...)}` is added — the inner Card content stays identical.

**Also update animation indices** for the Risk Controls section and ProjectAllocation to account for the shifted layout when `!isOwner`. Use a variable:

After the `isOwner` const, add:
```typescript
  const indexOffset = isOwner ? 0 : 1;
```

Then update all `"--index"` values in the return JSX:
- Demo banner: `0` (only shown when `!isOwner`)
- `<h1>`: `indexOffset`
- "Token Operations" label: `1 + indexOffset`
- Mint card: `2 + indexOffset`
- Allocate card (when shown): `3 + indexOffset`
- "Risk Controls" label: `4 + indexOffset`
- Freeze card: `5 + indexOffset`
- Pause card: `6 + indexOffset`
- ProjectAllocation: `7 + indexOffset`

**Step 6: Run lint and build**

Run: `npm run lint`
Expected: Clean

Run: `npm run build`
Expected: Compiles successfully

**Step 7: Run unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 8: Commit**

```bash
git add frontend/app/issue/page.tsx
git commit -m "feat: issuer page demo promote UI and conditional allocate"
```

---

### Task 4: Verify with Playwright screenshots

**Step 1: Ensure dev server is running from worktree**

Run: `lsof -i :3000 -P -n | head -3`
Verify the process cwd is the worktree directory. If not, start the dev server:
Run: `cd /Users/adoll/projects/hedera-green-bonds/.claude/worktrees/design-overhaul/frontend && npm run dev`

**Step 2: Screenshot issuer page (not connected)**

Navigate to `http://localhost:3000/issue` and take a full-page screenshot.
Expected: Empty state with "Connect your issuer wallet..." message.

**Step 3: Screenshot issuer page (connected, not agent)**

This requires a wallet connection. If using Playwright browser with no wallet, verify the DOM snapshot shows the "Become an Issuer" empty state with the "Grant Agent Role" button and amber demo disclaimer.

**Step 4: Screenshot investor page**

Navigate to `http://localhost:3000/` — verify the design overhaul is still intact (no regressions).

**Step 5: Screenshot monitor page**

Navigate to `http://localhost:3000/monitor` — verify no regressions.

---

### Task 5: Final verification and merge

**Step 1: Run full test suite**

Run: `npm run lint && npm run build && npm run test:unit`
Expected: All pass

**Step 2: Merge to main**

```bash
git -C /Users/adoll/projects/hedera-green-bonds/.claude/worktrees/simplify-frontend merge design/editorial-finance
git -C /Users/adoll/projects/hedera-green-bonds/.claude/worktrees/simplify-frontend push origin main
```

(Or if `simplify-frontend` worktree has been removed, adjust the merge path accordingly.)
