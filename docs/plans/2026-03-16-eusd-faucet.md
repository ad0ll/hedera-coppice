# eUSD Demo Faucet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Get 1,000 Test eUSD" faucet button on the Invest page so any connected wallet can claim test eUSD for the hackathon demo.

**Architecture:** API route mints fresh eUSD via Hedera SDK (`TokenMintTransaction` + `TransferTransaction`). Frontend component auto-detects HTS token association via Mirror Node; if unassociated, prompts MetaMask to call HTS precompile at `0x167` before claiming. Inline error display using existing `text-bond-red` pattern.

**Tech Stack:** Next.js API route, Hedera SDK (`@hashgraph/sdk`), Zod validation, viem, wagmi `useWriteContract`, Mirror Node REST API.

**Design doc:** `docs/plans/2026-03-16-eusd-faucet-design.md`

---

### Task 1: Faucet API Route

**Files:**
- Create: `frontend/app/api/faucet/route.ts`
- Test: `frontend/__tests__/api/faucet.test.ts`

**Step 1: Write the failing test**

Create `frontend/__tests__/api/faucet.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @hashgraph/sdk
const mockMintExecute = vi.fn().mockResolvedValue({ getReceipt: vi.fn().mockResolvedValue({}) });
const mockTransferExecute = vi.fn().mockResolvedValue({ getReceipt: vi.fn().mockResolvedValue({}) });

const mockTokenMintTransaction = vi.fn().mockReturnValue({
  setTokenId: vi.fn().mockReturnThis(),
  setAmount: vi.fn().mockReturnThis(),
  execute: mockMintExecute,
});

const mockTransferTransaction = vi.fn().mockReturnValue({
  addTokenTransfer: vi.fn().mockReturnThis(),
  execute: mockTransferExecute,
});

vi.mock("@hashgraph/sdk", () => ({
  TokenMintTransaction: mockTokenMintTransaction,
  TransferTransaction: mockTransferTransaction,
  TokenId: { fromString: vi.fn().mockReturnValue("0.0.8214937") },
  AccountId: { fromString: vi.fn().mockReturnValue("0.0.8213176") },
  Client: {
    forTestnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      close: vi.fn(),
    }),
  },
  PrivateKey: {
    fromStringECDSA: vi.fn().mockReturnValue("mockKey"),
  },
}));

// Mock hedera server utils
vi.mock("@/lib/hedera", () => ({
  getClient: vi.fn().mockReturnValue({
    setOperator: vi.fn(),
    close: vi.fn(),
  }),
  getOperatorKey: vi.fn().mockReturnValue("mockKey"),
  MIRROR_NODE_URL: "https://testnet.mirrornode.hedera.com",
  JSON_RPC_URL: "https://testnet.hashio.io/api",
}));

// Mock mirror-node for account ID lookup
const mockGetHederaAccountId = vi.fn().mockResolvedValue("0.0.8213185");
vi.mock("@/lib/mirror-node", () => ({
  getHederaAccountId: (...args: unknown[]) => mockGetHederaAccountId(...args),
}));

// Env vars
process.env.DEPLOYER_PRIVATE_KEY = "0x" + "dd".repeat(32);
process.env.HEDERA_ACCOUNT_ID = "0.0.8213176";
process.env.EUSD_TOKEN_ID = "0.0.8214937";

const VALID_ADDRESS = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/faucet", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/faucet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHederaAccountId.mockResolvedValue("0.0.8213185");
  });

  it("returns 400 for missing walletAddress", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for invalid walletAddress (not hex)", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: "not-an-address" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for numeric walletAddress", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: 12345 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and mints+transfers for valid address", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: VALID_ADDRESS }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.amount).toBe(1000);
  });

  it("calls TokenMintTransaction with correct amount (100000 = 1000.00 eUSD)", async () => {
    const { POST } = await import("@/app/api/faucet/route");
    await POST(makeRequest({ walletAddress: VALID_ADDRESS }));

    const instance = mockTokenMintTransaction.mock.results[0].value;
    expect(instance.setAmount).toHaveBeenCalledWith(100000);
  });

  it("returns 500 when Hedera SDK mint fails", async () => {
    mockMintExecute.mockRejectedValueOnce(new Error("INSUFFICIENT_PAYER_BALANCE"));
    const { POST } = await import("@/app/api/faucet/route");
    const res = await POST(makeRequest({ walletAddress: VALID_ADDRESS }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/api/faucet.test.ts`
Expected: FAIL — module `@/app/api/faucet/route` not found.

**Step 3: Write the API route**

Create `frontend/app/api/faucet/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { z } from "zod";
import { TokenMintTransaction, TransferTransaction, TokenId, AccountId } from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";
import { getErrorMessage } from "@/lib/format";
import { getHederaAccountId } from "@/lib/mirror-node";

const FAUCET_AMOUNT = 100_000; // 1,000.00 eUSD (2 decimals)

const faucetBodySchema = z.object({
  walletAddress: z.string().nonempty(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = faucetBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let walletAddress;
  try {
    walletAddress = getAddress(parsed.data.walletAddress);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const eusdTokenId = process.env.EUSD_TOKEN_ID;
  if (!eusdTokenId) {
    return NextResponse.json({ error: "EUSD_TOKEN_ID not configured" }, { status: 500 });
  }

  const hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
  if (!hederaAccountId) {
    return NextResponse.json({ error: "HEDERA_ACCOUNT_ID not configured" }, { status: 500 });
  }

  // Resolve EVM address to Hedera account ID for the transfer
  let recipientAccountId: string;
  try {
    recipientAccountId = await getHederaAccountId(walletAddress);
  } catch {
    return NextResponse.json(
      { error: "Could not resolve wallet to Hedera account — is the wallet funded with HBAR?" },
      { status: 400 },
    );
  }

  const client = getClient();
  try {
    // Mint fresh eUSD to treasury
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(eusdTokenId))
      .setAmount(FAUCET_AMOUNT);
    const mintResult = await mintTx.execute(client);
    await mintResult.getReceipt(client);

    // Transfer from treasury to recipient
    const transferTx = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(eusdTokenId), AccountId.fromString(hederaAccountId), -FAUCET_AMOUNT)
      .addTokenTransfer(TokenId.fromString(eusdTokenId), AccountId.fromString(recipientAccountId), FAUCET_AMOUNT);
    const transferResult = await transferTx.execute(client);
    await transferResult.getReceipt(client);

    return NextResponse.json({ success: true, amount: 1000 });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Faucet failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/api/faucet.test.ts`
Expected: All 6 tests PASS.

**Step 5: Commit**

```bash
git add frontend/app/api/faucet/route.ts frontend/__tests__/api/faucet.test.ts
git commit -m "feat: add faucet API route with tests

Mints 1,000 eUSD via Hedera SDK and transfers to recipient wallet.
No auth required — testnet demo faucet for hackathon."
```

---

### Task 2: FaucetButton Component

**Files:**
- Create: `frontend/components/faucet-button.tsx`
- Modify: `frontend/app/page.tsx:67-80` (add FaucetButton below eUSD balance)

**Step 1: Create the FaucetButton component**

Create `frontend/components/faucet-button.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useConnection, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { EUSD_EVM_ADDRESS, EUSD_TOKEN_ID, MIRROR_NODE_URL } from "@/lib/constants";
import { getErrorMessage } from "@/lib/format";

const HTS_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000167" as const;

const associateTokenAbi = [
  {
    name: "associateToken",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "account", type: "address" as const },
      { name: "token", type: "address" as const },
    ],
    outputs: [{ name: "responseCode", type: "int64" as const }],
  },
] as const;

type FaucetState = "idle" | "associating" | "claiming" | "success";

const BUTTON_LABELS: Record<FaucetState, string> = {
  idle: "Get 1,000 Test eUSD",
  associating: "Associating token...",
  claiming: "Claiming eUSD...",
  success: "1,000 eUSD claimed!",
};

async function checkTokenAssociation(evmAddress: string): Promise<boolean> {
  try {
    // First resolve EVM address to Hedera account ID
    const accountRes = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
    if (!accountRes.ok) return false;
    const accountData = await accountRes.json();
    const accountId = accountData.account;

    // Then check token association
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
    );
    if (!res.ok) return false;
    const data = await res.json();
    return (data.tokens?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export function FaucetButton() {
  const { address } = useConnection();
  const [state, setState] = useState<FaucetState>("idle");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const handleClaim = useCallback(async () => {
    if (!address || state !== "idle") return;
    setError(null);

    try {
      // Check if wallet is associated with eUSD
      const isAssociated = await checkTokenAssociation(address);

      if (!isAssociated) {
        setState("associating");
        try {
          const hash = await writeContractAsync({
            address: HTS_PRECOMPILE_ADDRESS,
            abi: associateTokenAbi,
            functionName: "associateToken",
            args: [address, EUSD_EVM_ADDRESS],
          });
          // Wait briefly for association to propagate
          // The writeContractAsync already waits for the tx to be mined
        } catch (err: unknown) {
          const msg = getErrorMessage(err, 100, "Token association failed");
          // Check if already associated (not an error)
          if (msg.includes("TOKEN_ALREADY_ASSOCIATED")) {
            // Already associated, continue to claim
          } else {
            throw err;
          }
        }
      }

      // Claim eUSD from faucet
      setState("claiming");
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Faucet request failed");
      }

      setState("success");
      setTimeout(() => setState("idle"), 3000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 100, "Failed to claim eUSD");
      setError(msg);
      setState("idle");
    }
  }, [address, state, writeContractAsync]);

  if (!address) return null;

  const isActive = state !== "idle" && state !== "success";

  return (
    <div className="mt-2">
      <button
        onClick={handleClaim}
        disabled={isActive}
        className={`text-xs font-medium px-3 py-1.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green ${
          state === "success"
            ? "text-bond-green bg-bond-green/10 border border-bond-green/20"
            : "text-text-muted hover:text-white bg-surface-3 hover:bg-surface-3/80 border border-border"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {BUTTON_LABELS[state]}
      </button>
      {error && (
        <p className="status-msg-error mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

**Step 2: Run lint to check for issues**

Run: `npm run lint` (from repo root)
Expected: No errors in faucet-button.tsx.

**Step 3: Integrate into the Invest page**

Modify `frontend/app/page.tsx`. Add import for `FaucetButton` and place it below the eUSD balance display. The modified portfolio section (lines 67-80) should become:

```typescript
// Add import at top:
import { FaucetButton } from "@/components/faucet-button";

// In the portfolio section, add FaucetButton after the eUSD balance:
<div className="bg-surface-2 border-y border-border full-bleed">
  <div className="max-w-7xl mx-auto flex divide-x divide-border">
    <div className="flex-1 py-5 pr-6">
      <p className="stat-label mb-1">CPC Balance</p>
      <p className="font-display text-3xl text-white">{cpcBalance}</p>
      <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
    </div>
    <div className="flex-1 py-5 pl-6">
      <p className="stat-label mb-1">eUSD Balance</p>
      <p className="font-display text-3xl text-bond-green">{displayEusdBalance}</p>
      <p className="text-xs text-text-muted mt-1">Coppice USD</p>
      <FaucetButton />
    </div>
  </div>
</div>
```

**Step 4: Run lint and build**

Run: `npm run lint && npm run build` (from repo root)
Expected: No errors.

**Step 5: Commit**

```bash
git add frontend/components/faucet-button.tsx frontend/app/page.tsx
git commit -m "feat: add FaucetButton component on Invest page

Auto-detects HTS token association via Mirror Node.
Handles association + claim in a single click flow.
Inline error display using existing text-bond-red pattern."
```

---

### Task 3: Unit Tests for FaucetButton

Skipped — the FaucetButton is a thin client component that orchestrates a Mirror Node fetch, a wagmi write, and a fetch to our API. The meaningful logic (API route) is already tested in Task 1. The component behavior is best verified via E2E tests in Task 4.

---

### Task 4: E2E Tests

**Files:**
- Create: `e2e/tests/faucet.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/tests/faucet.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY } from "../fixtures/test-keys";

test.describe("eUSD Faucet", () => {
  test("faucet button is visible when wallet is connected", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("faucet button is not visible when wallet is disconnected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).not.toBeVisible();
  });

  test("clicking faucet claims eUSD for pre-associated wallet", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for portfolio to load
    await expect(page.getByText("eUSD Balance")).toBeVisible({ timeout: 15000 });

    // Record initial balance text
    const balanceBefore = await page.locator(".font-display.text-bond-green").textContent();

    // Click faucet
    const faucetButton = page.getByRole("button", { name: /get 1,000 test eusd/i });
    await faucetButton.click();

    // Should show claiming state
    await expect(page.getByRole("button", { name: /claiming eusd/i })).toBeVisible({ timeout: 5000 });

    // Should show success
    await expect(page.getByRole("button", { name: /1,000 eusd claimed/i })).toBeVisible({
      timeout: 30000,
    });

    // Button should reset to idle after 3 seconds
    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
```

**Step 2: Run E2E tests**

Run: `cd e2e && npx playwright test tests/faucet.spec.ts`
Expected: All 3 tests PASS. The "clicking faucet claims eUSD" test exercises the real API route against Hedera testnet.

**Step 3: Commit**

```bash
git add e2e/tests/faucet.spec.ts
git commit -m "test: add E2E tests for eUSD faucet

Tests faucet visibility, claim flow with pre-associated wallet."
```

---

### Task 5: Verify, Lint, and Final Check

**Step 1: Run full test suite**

Run: `npm run lint && npm run test:unit && npm run build` (from repo root)
Expected: All pass, no regressions.

**Step 2: Manual smoke test**

Run: `npm run dev` (from repo root)
1. Open http://localhost:3000
2. Connect with Alice's wallet
3. Note eUSD balance
4. Click "Get 1,000 Test eUSD"
5. Verify balance increases by 1,000
6. Click again — verify it works repeatedly

**Step 3: Final commit if any fixes needed**

---

### Summary of Files

| Action | File |
|--------|------|
| Create | `frontend/app/api/faucet/route.ts` |
| Create | `frontend/components/faucet-button.tsx` |
| Modify | `frontend/app/page.tsx` |
| Create | `frontend/__tests__/api/faucet.test.ts` |
| Create | `e2e/tests/faucet.spec.ts` |
