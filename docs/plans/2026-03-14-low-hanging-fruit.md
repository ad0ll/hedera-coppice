# Low-Hanging Fruit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all quick wins that improve score across Execution (20%), Integration (15%), and Innovation (10%) judging criteria without major architectural changes.

**Architecture:** These are independent fixes that can be committed atomically. Each task addresses a specific audit finding. The purchase flow fix (Task 4) is the most complex — it adds a lightweight Express API to the middleware that accepts purchase requests, verifies eUSD payment via Mirror Node, transfers eUSD via HTS SDK, and mints CPC tokens via the deployer's agent role. The proceeds allocation fix (Task 5) follows the same backend pattern.

**Tech Stack:** React, ethers.js v6, Hardhat, @hashgraph/sdk, Express, Hedera Testnet

**Prerequisite reading:** Before starting, skim these audit docs for context:
- `docs/audit-contract-role-matrix.md` — role requirements for each contract function
- `docs/audit-data-flow-trace.md` — how data flows through the frontend
- `docs/audit-persona-walkthroughs.md` — expected behavior per demo wallet
- `docs/audit-hackathon-checklist.md` — hackathon judging criteria and gaps

---

### Task 1: Fix Provider Singleton (Audit Finding 6)

**Why:** `useToken.ts:11`, `useIdentity.ts:7`, `useCompliance.ts:7` each create `new ethers.JsonRpcProvider(JSON_RPC_URL)` in the function body — runs on every render. Should be a module-level singleton.

**Files:**
- Create: `frontend/src/lib/provider.ts`
- Modify: `frontend/src/hooks/useToken.ts:11-12`
- Modify: `frontend/src/hooks/useIdentity.ts:7-8`
- Modify: `frontend/src/hooks/useCompliance.ts:7-8`

**Step 1: Create the provider singleton module**

```typescript
// frontend/src/lib/provider.ts
import { ethers } from "ethers";
import { JSON_RPC_URL } from "./constants";

export const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
```

**Step 2: Update useToken.ts — replace lines 11-12**

Remove:
```typescript
const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
const readContract = getTokenContract(readProvider);
```

Replace with:
```typescript
import { readProvider } from "../lib/provider";
// ... (at top of file, replacing the JSON_RPC_URL import)

// Inside useToken():
const readContract = getTokenContract(readProvider);
```

The full updated import block for `useToken.ts`:
```typescript
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../providers/WalletProvider";
import { getTokenContract } from "../lib/contracts";
import { readProvider } from "../lib/provider";
```

And remove line 11 (`const readProvider = ...`), keeping line 12 as-is since `readProvider` is now imported.

**Step 3: Update useIdentity.ts — same pattern**

Updated import block:
```typescript
import { useCallback } from "react";
import { ethers } from "ethers";
import { getIdentityRegistryContract } from "../lib/contracts";
import { readProvider } from "../lib/provider";
```

Remove line 7 (`const readProvider = ...`), keep line 8 as-is.

**Step 4: Update useCompliance.ts — same pattern**

Updated import block:
```typescript
import { useCallback } from "react";
import { ethers } from "ethers";
import { getComplianceContract } from "../lib/contracts";
import { readProvider } from "../lib/provider";
```

Remove line 7 (`const readProvider = ...`), keep line 8 as-is.

**Step 5: Verify frontend builds**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors, successful build

**Step 6: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All 18 tests pass (this change is invisible to tests)

**Step 7: Commit**

```bash
git add frontend/src/lib/provider.ts frontend/src/hooks/useToken.ts frontend/src/hooks/useIdentity.ts frontend/src/hooks/useCompliance.ts
git commit -m "fix: extract provider singleton from hooks"
```

---

### Task 2: Fix Stale Data in BondDetails and IssuerDashboard (Audit Finding 5)

**Why:** `BondDetails.tsx:11-14` fetches totalSupply and paused once via `useEffect([], [])` and never refreshes. `IssuerDashboard.tsx:27-29` same for paused. After minting or pausing, data is stale until full page reload.

**Files:**
- Modify: `frontend/src/components/BondDetails.tsx:11-14`
- Modify: `frontend/src/pages/IssuerDashboard.tsx:27-29`

**Step 1: Add polling to BondDetails**

Replace the `useEffect` block at `BondDetails.tsx:11-14`:

```typescript
// Old:
useEffect(() => {
  totalSupply().then((s) => setSupply(Number(ethers.formatEther(s)).toLocaleString("en-US")));
  paused().then(setIsPaused);
}, []);
```

```typescript
// New:
useEffect(() => {
  async function refresh() {
    totalSupply().then((s) => setSupply(Number(ethers.formatEther(s)).toLocaleString("en-US")));
    paused().then(setIsPaused);
  }
  refresh();
  const interval = setInterval(refresh, 10000);
  return () => clearInterval(interval);
}, []);
```

**Step 2: Add polling to IssuerDashboard paused status**

Replace the `useEffect` block at `IssuerDashboard.tsx:27-29`:

```typescript
// Old:
useEffect(() => {
  paused().then(setIsPaused).catch(() => {});
}, []);
```

```typescript
// New:
useEffect(() => {
  paused().then(setIsPaused).catch(() => {});
  const interval = setInterval(() => {
    paused().then(setIsPaused).catch(() => {});
  }, 10000);
  return () => clearInterval(interval);
}, []);
```

**Step 3: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All 18 pass

**Step 5: Commit**

```bash
git add frontend/src/components/BondDetails.tsx frontend/src/pages/IssuerDashboard.tsx
git commit -m "fix: poll totalSupply and paused status every 10s"
```

---

### Task 3: Add Role-Based UI to Issuer Dashboard (Audit Finding 3)

**Why:** Any wallet sees all issuer controls. Non-deployer wallets get raw EVM revert errors. Should check `isAgent()` on connect and show "not authorized" for non-agents.

**Files:**
- Modify: `frontend/src/pages/IssuerDashboard.tsx`

**Step 1: Add agent check after wallet connect**

Add a new state variable and effect. Insert after line 9 (`const { mint, pause, unpause, paused, setAddressFrozen, loading } = useToken();`):

```typescript
const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
```

Add a new effect after the paused effect (after line 29):

```typescript
useEffect(() => {
  if (!account) {
    setIsAuthorized(null);
    return;
  }
  isAgent(account).then(setIsAuthorized).catch(() => setIsAuthorized(false));
}, [account]);
```

Note: `isAgent` is already exported from `useToken()` — update the destructure on line 9:

```typescript
const { mint, pause, unpause, paused, setAddressFrozen, isAgent, loading } = useToken();
```

**Step 2: Add unauthorized state UI**

After the `if (!account)` return block (line 100), add:

```typescript
if (isAuthorized === false) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-bond-red/10 flex items-center justify-center">
        <svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-white mb-2">Not Authorized</h1>
      <p className="text-text-muted text-sm">Only the bond issuer can access this dashboard.</p>
    </div>
  );
}

if (isAuthorized === null) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-12 text-center">
      <span className="inline-block w-6 h-6 border-2 border-text-muted/40 border-t-text-muted rounded-full animate-spin" />
      <p className="text-text-muted text-sm mt-4">Checking authorization...</p>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All pass. The write-operations tests connect as deployer (who IS an agent), so they should still see the dashboard.

**Step 5: Commit**

```bash
git add frontend/src/pages/IssuerDashboard.tsx
git commit -m "feat: add role-based access control to Issuer Dashboard"
```

---

### Task 4: Fix Purchase Flow — Backend Mint + Real eUSD Transfer (Audit Findings 1 & 2)

**Why:** This is the **CRITICAL** bug. The purchase flow fails for all non-deployer wallets because `mint()` requires Token Agent role, and eUSD payment is simulated with `setTimeout(1500)`. The fix: a backend API that (1) verifies the investor's eUSD balance, (2) transfers eUSD from investor to treasury using HTS SDK (requires investor's signature — we'll use the `TransferTransaction` approach where the deployer pays and investor signs), and (3) mints CPC tokens using the deployer's agent key.

**Architecture decision:** Because browsers can't sign HTS transactions (requires Hedera SDK + private key), and we want a real end-to-end flow for the demo, the simplest approach that works for a hackathon is:

- **New backend endpoint:** `POST /api/purchase` in the middleware
- **Frontend calls this endpoint** instead of calling `mint()` directly
- **Backend uses deployer key** to mint CPC tokens (deployer is the token agent)
- **eUSD transfer:** Backend uses HTS `TransferTransaction` where the deployer (operator) transfers eUSD FROM the investor TO the treasury. This requires the investor's account to have been associated with eUSD (already done in hts-setup.ts) AND the investor must have approved the deployer via `AccountAllowanceApproveTransaction` OR the operator must have the ability to transfer. **Simpler approach for hackathon:** Use an approved allowance model — the investor signs a MetaMask tx approving the deployer, then the backend executes the transfer.

**Actually simplest approach:** The HTS system contract precompile at `0x167` allows ERC-20 style `approve()` and `transferFrom()` calls from Solidity/MetaMask. We can:
1. Frontend: investor calls `approve(treasury, amount)` on the HTS precompile via MetaMask
2. Backend: deployer calls `transferFrom(investor, treasury, amount)` via HTS SDK, then `mint(investor, amount)` via EVM

**Wait — even simpler:** Since this is a hackathon demo with known wallets, and the private keys are all in .env, the backend can just:
1. Verify eUSD balance via Mirror Node
2. Execute `TransferTransaction` from investor → treasury, signing with investor's key (available in .env)
3. Mint CPC to investor using deployer key

This is the fastest path. The private keys are test keys. Let's do it.

**Files:**
- Create: `middleware/src/purchase-api.ts`
- Modify: `middleware/package.json` (add express dependency)
- Modify: `frontend/src/components/TransferFlow.tsx:62-67`
- Modify: `frontend/src/lib/constants.ts` (add API_URL)

**Step 1: Install express in middleware**

Run: `cd middleware && npm install express cors`
Run: `cd middleware && npm install -D @types/express @types/cors`

**Step 2: Create the purchase API**

```typescript
// middleware/src/purchase-api.ts
import express from "express";
import cors from "cors";
import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Hbar,
} from "@hashgraph/sdk";
import { ethers } from "ethers";
import { getClient, getOperatorKey, JSON_RPC_URL, MIRROR_NODE_URL } from "./config.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const TOKEN_ABI = ["function mint(address to, uint256 amount)"];

const EUSD_TOKEN_ID = process.env.EUSD_TOKEN_ID!;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

// Map EVM addresses to Hedera account IDs + private keys for demo wallets
const WALLET_KEYS: Record<string, { accountId: string; privateKey: string }> = {};

function loadWalletKeys() {
  const wallets = [
    { env: "ALICE", accountId: process.env.ALICE_ACCOUNT_ID },
    { env: "DIANA", accountId: process.env.DIANA_ACCOUNT_ID },
    { env: "DEPLOYER", accountId: process.env.HEDERA_ACCOUNT_ID },
  ];

  for (const w of wallets) {
    const pk = process.env[`${w.env}_PRIVATE_KEY`];
    if (pk && w.accountId) {
      // Resolve EVM address from private key
      const keyHex = pk.startsWith("0x") ? pk : `0x${pk}`;
      const wallet = new ethers.Wallet(keyHex);
      WALLET_KEYS[wallet.address.toLowerCase()] = {
        accountId: w.accountId,
        privateKey: pk,
      };
    }
  }
}

async function resolveAccountId(evmAddress: string): Promise<string | null> {
  // Check local cache first
  const cached = WALLET_KEYS[evmAddress.toLowerCase()];
  if (cached) return cached.accountId;

  // Fall back to Mirror Node
  try {
    const res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch {
    return null;
  }
}

async function getEusdBalance(accountId: string): Promise<number> {
  try {
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const entry = data.tokens?.find((t: any) => t.token_id === EUSD_TOKEN_ID);
    return entry ? entry.balance / 100 : 0; // 2 decimals
  } catch {
    return 0;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/purchase", async (req, res) => {
  const { investorAddress, amount } = req.body;

  if (!investorAddress || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid request: need investorAddress and positive amount" });
  }

  try {
    // 1. Resolve investor's Hedera account ID
    const investorAccountId = await resolveAccountId(investorAddress);
    if (!investorAccountId) {
      return res.status(400).json({ error: "Could not resolve investor account" });
    }

    // 2. Check eUSD balance
    const balance = await getEusdBalance(investorAccountId);
    if (balance < amount) {
      return res.status(400).json({ error: `Insufficient eUSD balance: ${balance} < ${amount}` });
    }

    // 3. Transfer eUSD from investor to treasury (deployer)
    const client = getClient();
    const operatorKey = getOperatorKey();
    const treasuryAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
    const tokenId = TokenId.fromString(EUSD_TOKEN_ID);

    // Get investor's private key for signing (demo wallets only)
    const walletInfo = WALLET_KEYS[investorAddress.toLowerCase()];
    if (!walletInfo) {
      return res.status(400).json({ error: "Unknown wallet — only demo wallets are supported" });
    }

    const investorKey = PrivateKey.fromStringECDSA(
      walletInfo.privateKey.startsWith("0x") ? walletInfo.privateKey.slice(2) : walletInfo.privateKey
    );

    // eUSD has 2 decimals
    const eusdAmount = Math.round(amount * 100);

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, AccountId.fromString(investorAccountId), -eusdAmount)
      .addTokenTransfer(tokenId, treasuryAccountId, eusdAmount)
      .freezeWith(client)
      .sign(investorKey);

    const transferResult = await transferTx.execute(client);
    const transferReceipt = await transferResult.getReceipt(client);
    console.log(`  eUSD transfer: ${transferReceipt.status} (${amount} eUSD from ${investorAccountId} to treasury)`);

    // 4. Mint CPC tokens to investor via EVM
    const deployerKeyHex = DEPLOYER_KEY.startsWith("0x") ? DEPLOYER_KEY : `0x${DEPLOYER_KEY}`;
    const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
    const deployerWallet = new ethers.Wallet(deployerKeyHex, provider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, deployerWallet);

    const mintTx = await tokenContract.mint(investorAddress, ethers.parseEther(String(amount)));
    const mintReceipt = await mintTx.wait();
    console.log(`  CPC mint: ${mintReceipt?.hash} (${amount} CPC to ${investorAddress})`);

    client.close();

    return res.json({
      success: true,
      eusdTxId: transferReceipt.transactionId?.toString(),
      mintTxHash: mintReceipt?.hash,
    });
  } catch (err: any) {
    console.error("Purchase error:", err.message);
    return res.status(500).json({ error: err.message?.slice(0, 200) || "Purchase failed" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.API_PORT || 3001;

loadWalletKeys();
console.log(`Purchase API starting on port ${PORT}`);
console.log(`  Known wallets: ${Object.keys(WALLET_KEYS).length}`);

app.listen(PORT, () => {
  console.log(`  Listening at http://localhost:${PORT}`);
});
```

**Step 3: Add account IDs to .env.example**

Add these lines to `.env.example` after the private keys section:

```
# Hedera Account IDs for demo wallets (populated by setup scripts)
DEPLOYER_ACCOUNT_ID=0.0.XXXXX
ALICE_ACCOUNT_ID=0.0.XXXXX
DIANA_ACCOUNT_ID=0.0.XXXXX
```

Also add to the actual `.env` file the real account IDs:
```
ALICE_ACCOUNT_ID=0.0.8213185
DIANA_ACCOUNT_ID=0.0.8214895
```

(HEDERA_ACCOUNT_ID already serves as the deployer account ID)

**Step 4: Add API_URL to frontend constants**

Add to `frontend/src/lib/constants.ts` after line 4:

```typescript
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
```

Add to `.env.example`:
```
# Backend API (for purchase flow)
VITE_API_URL=http://localhost:3001
```

**Step 5: Update TransferFlow.tsx to call backend API**

Replace the purchase flow (lines 62-68 in `TransferFlow.tsx`):

```typescript
// Old (lines 62-68):
await new Promise((r) => setTimeout(r, 1500));
newSteps[2] = { label: "eUSD payment processed", status: "success" };
newSteps[3] = { ...newSteps[3], status: "active" };
setSteps([...newSteps]);

await mint(account, parsedAmount);
newSteps[3] = { label: "Bond tokens issued", status: "success" };
```

```typescript
// New:
import { API_URL } from "../lib/constants";
// (add to imports at top of file)

// Replace lines 62-68 with:
const purchaseRes = await fetch(`${API_URL}/api/purchase`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ investorAddress: account, amount: Number(amount) }),
});

const purchaseData = await purchaseRes.json();

if (!purchaseRes.ok) {
  throw new Error(purchaseData.error || "Purchase failed");
}

newSteps[2] = { label: "eUSD payment processed", status: "success", detail: purchaseData.eusdTxId };
newSteps[3] = { ...newSteps[3], status: "active" };
setSteps([...newSteps]);

// Mint already happened on the backend
newSteps[3] = { label: "Bond tokens issued", status: "success", detail: purchaseData.mintTxHash?.slice(0, 18) + "..." };
```

Wait — the backend does both eUSD transfer AND mint in one call. Let's restructure the step flow. The 4 steps become:
1. Verify identity (frontend, real contract call)
2. Check compliance (frontend, real contract call)
3. Submit purchase to backend (eUSD transfer + CPC mint happen server-side)
4. Confirm completion

Actually, to keep the 4-step UI and show progress, let's keep it as is but adjust:

Replace the entire try block body (lines 39-70) with:

```typescript
// Step 1: Verify identity (real contract call)
const verified = await isVerified(account);
if (!verified) {
  newSteps[0] = { label: "Identity verification", status: "error", detail: "Identity not verified" };
  setSteps([...newSteps]);
  setRunning(false);
  return;
}
newSteps[0] = { label: "Identity verified", status: "success" };
newSteps[1] = { ...newSteps[1], status: "active" };
setSteps([...newSteps]);

// Step 2: Check compliance (real contract call)
const allowed = await canTransfer(ethers.ZeroAddress, account, parsedAmount);
if (!allowed) {
  newSteps[1] = { label: "Compliance check", status: "error", detail: "Transfer blocked by compliance" };
  setSteps([...newSteps]);
  setRunning(false);
  return;
}
newSteps[1] = { label: "Compliance verified", status: "success" };
newSteps[2] = { ...newSteps[2], status: "active" };
setSteps([...newSteps]);

// Steps 3 & 4: Backend handles eUSD transfer + CPC mint
const purchaseRes = await fetch(`${API_URL}/api/purchase`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ investorAddress: account, amount: Number(amount) }),
});

const purchaseData = await purchaseRes.json();

if (!purchaseRes.ok) {
  throw new Error(purchaseData.error || "Purchase failed");
}

newSteps[2] = { label: "eUSD payment processed", status: "success" };
newSteps[3] = { ...newSteps[3], status: "active" };
setSteps([...newSteps]);

// Brief pause to show the step transition
await new Promise((r) => setTimeout(r, 500));
newSteps[3] = { label: "Bond tokens issued", status: "success" };
setSteps([...newSteps]);
setAmount("");
```

Also remove the `mint` import from TransferFlow since it's no longer called directly:
```typescript
// Old line 4:
import { useToken } from "../hooks/useToken";
// Remove this import entirely — mint is no longer used from the frontend

// Also remove line 18:
const { mint } = useToken();
```

**Step 6: Add npm script for the purchase API**

Add to `middleware/package.json` scripts:

```json
"purchase-api": "tsx src/purchase-api.ts"
```

**Step 7: Verify everything builds**

Run: `cd middleware && npm install`
Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 8: Manual test**

1. Start the API: `cd middleware && npm run purchase-api`
2. Verify health: `curl http://localhost:3001/api/health` → `{"status":"ok"}`
3. Start frontend: `cd frontend && npm run dev`
4. Connect as Alice, run purchase flow — should complete all 4 steps
5. Check Alice's CPC balance increased
6. Check Alice's eUSD balance decreased

**Step 9: Update E2E test for purchase flow**

The existing test at `e2e/tests/write-operations.spec.ts:123-152` stops at step 3. Now that the backend exists, the test should verify all 4 steps complete. However, the E2E test needs the purchase API running. For now, update the test comment to note this dependency:

At `write-operations.spec.ts:123`, update the test:

```typescript
test("should run Alice compliance checks and purchase flow UI", async ({ page }) => {
  // Tests the full investor portal: 4 compliance checks + TransferFlow UI
  // REQUIRES: middleware purchase-api running (npm run purchase-api)
  const ALICE_KEY = "ALICE_PRIVATE_KEY_REDACTED";

  await injectWalletMock(page, ALICE_KEY);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect Wallet" }).click();

  // Wait for all 4 compliance checks to pass
  await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("ONCHAINID linked")).toBeVisible();
  await expect(page.getByText("All claims verified")).toBeVisible();
  await expect(page.getByText("Germany - Approved")).toBeVisible();
  await expect(page.getByText("Transfer permitted")).toBeVisible();

  // Alice should see her portfolio with CPC and eUSD balances
  await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("eUSD Balance")).toBeVisible();

  // Purchase flow: enter amount and click Purchase
  await page.getByPlaceholder("Amount (CPC)").fill("5");
  await page.getByRole("button", { name: "Purchase" }).click();

  // All 4 steps should pass (steps 1-2 are contract reads, steps 3-4 via backend API)
  await expect(page.getByText("Identity verified")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Compliance verified")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("eUSD payment processed")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Bond tokens issued")).toBeVisible({ timeout: 30000 });
});
```

**Step 10: Commit**

```bash
git add middleware/src/purchase-api.ts middleware/package.json middleware/package-lock.json frontend/src/components/TransferFlow.tsx frontend/src/lib/constants.ts .env.example e2e/tests/write-operations.spec.ts
git commit -m "feat: implement real purchase flow with backend eUSD transfer + CPC mint"
```

---

### Task 5: Submit Real Impact Events to HCS (Audit Finding 4 + TODO from plan-deviations.md line 54)

**Why:** The impact topic (0.0.8214935) has 0 messages. The "Allocate Proceeds" button on IssuerDashboard shows a fake success message but doesn't write to HCS. The `ProjectAllocation` chart on ComplianceMonitor is always empty. This weakens both the Integration (15%) and Innovation (10%) scores.

**Architecture:** Add an `/api/allocate` endpoint to the purchase API that submits `PROCEEDS_ALLOCATED` events to the HCS impact topic. The frontend calls this endpoint when the issuer clicks "Allocate to HCS".

**Files:**
- Modify: `middleware/src/purchase-api.ts` (add /api/allocate endpoint)
- Modify: `frontend/src/pages/IssuerDashboard.tsx:76-86` (call backend instead of faking it)
- Modify: `frontend/src/lib/constants.ts` (API_URL already added in Task 4)

**Step 1: Add allocate endpoint to purchase-api.ts**

Add this route after the `/api/purchase` route (before the `app.listen` call):

```typescript
app.post("/api/allocate", async (req, res) => {
  const { project, category, amount, currency } = req.body;

  if (!project || !category || !amount) {
    return res.status(400).json({ error: "Missing project, category, or amount" });
  }

  try {
    const client = getClient();
    const operatorKey = getOperatorKey();
    const impactTopicId = process.env.IMPACT_TOPIC_ID;
    if (!impactTopicId) {
      return res.status(500).json({ error: "IMPACT_TOPIC_ID not configured" });
    }

    const payload = {
      type: "PROCEEDS_ALLOCATED",
      ts: Date.now(),
      data: {
        project,
        category,
        amount: String(amount),
        currency: currency || "USD",
      },
    };

    const { TopicMessageSubmitTransaction, TopicId } = await import("@hashgraph/sdk");

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(impactTopicId))
      .setMessage(JSON.stringify(payload))
      .freezeWith(client)
      .sign(operatorKey);

    const result = await tx.execute(client);
    const receipt = await result.getReceipt(client);
    console.log(`  Proceeds allocated: ${project} - $${amount} ${category} (${receipt.status})`);

    client.close();

    return res.json({ success: true, status: receipt.status.toString() });
  } catch (err: any) {
    console.error("Allocate error:", err.message);
    return res.status(500).json({ error: err.message?.slice(0, 200) || "Allocation failed" });
  }
});
```

**Step 2: Update IssuerDashboard to call backend**

Replace `handleAllocateProceeds` function at `IssuerDashboard.tsx:76-86`:

```typescript
async function handleAllocateProceeds() {
  if (!project || !proceedsAmount) return;
  setProceedsStatus(null);
  try {
    const res = await fetch(`${API_URL}/api/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project,
        category,
        amount: Number(proceedsAmount),
        currency: "USD",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Allocation failed");
    setProceedsStatus({ type: "success", msg: `Allocated $${Number(proceedsAmount).toLocaleString("en-US")} to ${project} (submitted to HCS)` });
    setProject("");
    setProceedsAmount("");
  } catch (err: any) {
    setProceedsStatus({ type: "error", msg: err.message?.slice(0, 80) || "Failed" });
  }
}
```

Add import for `API_URL` at top of `IssuerDashboard.tsx`:

```typescript
import { API_URL } from "../lib/constants";
```

**Step 3: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 4: Manual test**

1. Start API: `cd middleware && npm run purchase-api`
2. Start frontend: `cd frontend && npm run dev`
3. Connect as deployer, go to /issue
4. Fill in project "Solar Farm Alpha", category "Renewable Energy", amount 50000
5. Click "Allocate to HCS" — should succeed with real HCS submission
6. Go to /monitor — ProjectAllocation should now show the allocation bar chart

**Step 5: Commit**

```bash
git add middleware/src/purchase-api.ts frontend/src/pages/IssuerDashboard.tsx
git commit -m "feat: real HCS impact topic submissions for proceeds allocation"
```

---

### Task 6: Delete create-diana.ts (Audit Finding 10)

**Why:** One-shot script that was already executed. Uses deprecated `setKey()` and `setAlias()` methods. Dead code.

**Files:**
- Delete: `middleware/src/create-diana.ts`

**Step 1: Delete the file**

Run: `rm middleware/src/create-diana.ts`

**Step 2: Verify nothing imports it**

Run: `grep -r "create-diana" middleware/` — should return nothing (it's a standalone script, not imported).

**Step 3: Commit**

```bash
git rm middleware/src/create-diana.ts
git commit -m "chore: delete spent create-diana.ts script"
```

---

### Task 7: Fix HIP-478 Error in Research Doc

**Why:** `docs/hedera-research.md:75` incorrectly says "HIP-478 system contracts (future): Would allow smart contracts to write to HCS natively from Solidity." HIP-478 is actually about oracle integration. HIP-1208 is the real HCS precompile proposal.

**Files:**
- Modify: `docs/hedera-research.md:75`

**Step 1: Fix the incorrect line**

Replace line 75:
```
2. **HIP-478 system contracts** (future): Would allow smart contracts to write to HCS natively from Solidity. Status: Proposed/Draft as of early 2026 — NOT yet live on mainnet/testnet
```

With:
```
2. **HIP-1208 system contracts** (future): Would allow smart contracts to write to HCS natively from Solidity. Status: Proposed/Draft as of early 2026 — NOT yet live on mainnet/testnet. Note: HIP-478 is about oracle integration, not HCS precompiles.
```

**Step 2: Commit**

```bash
git add docs/hedera-research.md
git commit -m "fix: correct HIP-478 to HIP-1208 in research doc"
```

---

### Task 8: Contract Verification on HashScan

**Why:** No contracts are source-verified on HashScan. Judges clicking contract links see only bytecode. This hurts the Integration (15%) score. The `@nomicfoundation/hardhat-verify` plugin supports HashScan via custom chains config.

**Note on hashscan-verify:** There is a `@hashgraph/hardhat-hethers` ecosystem but the standard approach for Hardhat 2 is `hardhat-verify` with a custom `etherscan` config pointing to HashScan's verification API. However, HashScan verification for Hedera contracts uses a different API from Etherscan. The recommended approach as of 2026 is:

1. **Option A:** Use `hardhat-verify` with HashScan's Sourcify integration. HashScan supports Sourcify verification. Hardhat's `hardhat-verify` plugin supports `--verify-on sourcify` natively.
2. **Option B:** Manual verification via HashScan's UI (upload source + metadata).

Let's use Option A — Sourcify verification via hardhat-verify.

**Files:**
- Modify: `contracts/hardhat.config.ts`
- Modify: `contracts/package.json` (if `@nomicfoundation/hardhat-verify` isn't already included)

**Step 1: Check if hardhat-verify is installed**

`@nomicfoundation/hardhat-toolbox` already includes `@nomicfoundation/hardhat-verify` as a peer dependency. Check:

Run: `cd contracts && npx hardhat verify --help`

If this works, the plugin is already available. If not:

Run: `cd contracts && npm install -D @nomicfoundation/hardhat-verify`

**Step 2: Update hardhat.config.ts for Sourcify**

Add to `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hederaTestnet: {
      url: process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 296,
    },
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      // HashScan doesn't require an API key for Sourcify
      hederaTestnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/testnet",
        },
      },
    ],
  },
};

export default config;
```

**Step 3: Create a verification script**

Read `contracts/deployments/deployed-addresses.json` to get all deployed contract addresses, then verify the key ones.

Create `contracts/scripts/verify-contracts.ts`:

```typescript
import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressesPath = path.join(__dirname, "../deployments/deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

  // Key contracts to verify (the ones judges will inspect)
  const contractsToVerify = [
    { name: "Token (T-REX)", address: addresses.token },
    { name: "IdentityRegistry", address: addresses.identityRegistry },
    { name: "ModularCompliance", address: addresses.modularCompliance },
    { name: "ClaimIssuer", address: addresses.claimIssuer },
    { name: "CountryRestrictModule", address: addresses.countryRestrictModule },
    { name: "MaxBalanceModule", address: addresses.maxBalanceModule },
    { name: "SupplyLimitModule", address: addresses.supplyLimitModule },
  ];

  for (const contract of contractsToVerify) {
    console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
    try {
      await run("verify", {
        address: contract.address,
        network: "hederaTestnet",
      });
      console.log(`  ✓ Verified`);
    } catch (err: any) {
      if (err.message?.includes("Already Verified") || err.message?.includes("already verified")) {
        console.log(`  ✓ Already verified`);
      } else {
        console.log(`  ✗ Failed: ${err.message?.slice(0, 100)}`);
      }
    }
  }
}

main().catch(console.error);
```

**Step 4: Run verification**

Run: `cd contracts && npx hardhat run scripts/verify-contracts.ts --network hederaTestnet`

**Important:** Sourcify verification requires that the exact compiler version, settings, and source code match what was deployed. Since we haven't changed the contracts since deployment, this should work. If Sourcify verification fails because it can't match the bytecode, we'll need to use the HashScan UI for manual verification.

**Note:** If `hardhat verify` doesn't support Sourcify for custom chains or HashScan's API differs from standard Sourcify, this task may need adjustment. Try it first, and if it fails, document what happened and we'll use manual verification.

**Step 5: Commit**

```bash
git add contracts/hardhat.config.ts contracts/scripts/verify-contracts.ts
git commit -m "feat: add contract verification via Sourcify/HashScan"
```

---

### Task 9: Add Compliance Auto-Refresh After Freeze (Audit Finding from persona walkthroughs)

**Why:** If Diana gets frozen while viewing her portal, ComplianceStatus still shows "Eligible to Invest" until page refresh. The compliance checks only run once when `account` changes.

**Files:**
- Modify: `frontend/src/components/ComplianceStatus.tsx:20-94`

**Step 1: Add polling to ComplianceStatus**

The current `useEffect` at line 20 depends on `[account]`. Add a poll interval:

Replace the `useEffect` (lines 20-94):

```typescript
useEffect(() => {
  if (!account) {
    setChecks([]);
    setEligible(false);
    onEligibilityChange?.(false);
    return;
  }

  async function runChecks() {
    const results: CheckResult[] = [
      { label: "Identity Registered", status: "loading" },
      { label: "KYC / AML / Accredited", status: "loading" },
      { label: "Jurisdiction Check", status: "loading" },
      { label: "Compliance Module", status: "loading" },
    ];
    setChecks([...results]);

    const registered = await isRegistered(account!);
    results[0] = {
      label: "Identity Registered",
      status: registered ? "pass" : "fail",
      detail: registered ? "ONCHAINID linked" : "No identity found",
    };
    setChecks([...results]);

    if (!registered) {
      results[1] = { label: "KYC / AML / Accredited", status: "fail", detail: "Not registered" };
      results[2] = { label: "Jurisdiction Check", status: "fail", detail: "Not registered" };
      results[3] = { label: "Compliance Module", status: "fail", detail: "Not registered" };
      setChecks([...results]);
      setEligible(false);
      onEligibilityChange?.(false);
      return;
    }

    const verified = await isVerified(account!);
    results[1] = {
      label: "KYC / AML / Accredited",
      status: verified ? "pass" : "fail",
      detail: verified ? "All claims verified" : "Missing required claims",
    };
    setChecks([...results]);

    const country = await getCountry(account!);
    const RESTRICTED_COUNTRIES = [156];
    const countryNames: Record<number, string> = { 276: "Germany", 250: "France", 156: "China", 840: "United States" };
    const isRestricted = RESTRICTED_COUNTRIES.includes(country);
    results[2] = {
      label: "Jurisdiction Check",
      status: isRestricted ? "fail" : "pass",
      detail: isRestricted
        ? `${countryNames[country] || `Code ${country}`} - Restricted`
        : `${countryNames[country] || `Code ${country}`} - Approved`,
    };
    setChecks([...results]);

    const transferAllowed = await canTransfer(
      ethers.ZeroAddress,
      account!,
      ethers.parseEther("1")
    );
    results[3] = {
      label: "Compliance Module",
      status: transferAllowed ? "pass" : "fail",
      detail: transferAllowed ? "Transfer permitted" : "Transfer blocked by compliance",
    };
    setChecks([...results]);

    const allPass = results.every((r) => r.status === "pass");
    setEligible(allPass);
    onEligibilityChange?.(allPass);
  }

  runChecks();
  const interval = setInterval(runChecks, 15000);
  return () => clearInterval(interval);
}, [account]);
```

The only change is adding the `setInterval` and cleanup. The poll interval is 15s (longer than balance polling at 10s, since compliance checks involve 4 sequential contract calls).

**Step 2: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`

**Step 3: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All pass

**Step 4: Commit**

```bash
git add frontend/src/components/ComplianceStatus.tsx
git commit -m "fix: auto-refresh compliance status every 15s"
```

---

### Task 10: Update CLAUDE.md

**Why:** CLAUDE.md is a living document. Needs to reflect new architecture (purchase API), new conventions (always verify contracts), and current project state.

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md**

Add the purchase API to architecture and commands sections. Update key files. The full updated content:

```markdown
# Coppice - ERC-3643 Green Bond Tokenization on Hedera

## Project Overview
Compliant green bond tokenization using ERC-3643 (T-REX) on Hedera for the Hello Future Apex Hackathon 2026.

## Architecture
- **contracts/**: Hardhat project with T-REX v4.1.6 + OnchainID v2.0.0. Solidity 0.8.17.
- **middleware/**: Node.js scripts for HCS topics, HTS eUSD stablecoin, event logger, purchase API.
- **frontend/**: React + Vite + Tailwind CSS. MetaMask wallet integration, ethers.js v6.
- **e2e/**: Playwright E2E tests with MetaMask mocking.

## Critical Constraints
- Do NOT rewrite T-REX contracts — use them as-is from @tokenysolutions/t-rex@4.1.6
- Do NOT rewrite OnchainID contracts — use ABIs from @onchain-id/solidity@2.0.0
- Deployment follows exact sequence from reference/deploy-full-suite.fixture.ts
- Claims are signed by claimIssuerSigningKey (random wallet), added by wallet owner
- Token starts paused after deployment — must call unpause()
- HCS messages must be <1KB per chunk
- Always verify contracts on HashScan after deploying

## Key Files
- Implementation plan: docs/plans/2026-03-13-coppice-green-bonds.md
- Low-hanging fruit plan: docs/plans/2026-03-14-low-hanging-fruit.md
- Audit docs: docs/audit-*.md
- Reference fixture: reference/deploy-full-suite.fixture.ts
- Accounts & keys: .env
- Provider singleton: frontend/src/lib/provider.ts
- Purchase API: middleware/src/purchase-api.ts

## Demo Wallets
| Role | Account | Country |
|------|---------|---------|
| Deployer/Issuer | 0.0.8213176 | — |
| Alice (Verified) | 0.0.8213185 | DE (276) |
| Bob (Unverified) | 0.0.8214040 | US (840) |
| Charlie (Restricted) | 0.0.8214051 | CN (156) |
| Diana (Freeze demo) | 0.0.8214895 | FR (250) |

## Deployed Contracts
- Token (CPC): 0x17e19B53981370a904d0003Ba2D336837a43cbf0
- IdentityRegistry: 0x03ecdB8673d65b81752AC14dAaCa797D846c1B31
- ModularCompliance: 0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf
- ClaimIssuer: 0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A
- Audit HCS Topic: 0.0.8214934
- Impact HCS Topic: 0.0.8214935
- eUSD Token (HTS): 0.0.8214937

## Commands
```bash
# Contracts
cd contracts && npx hardhat compile
cd contracts && npx hardhat test
cd contracts && npx hardhat run scripts/deploy.ts --network hederaTestnet
cd contracts && npx hardhat run scripts/verify-contracts.ts --network hederaTestnet

# Middleware
cd middleware && npx tsx src/hcs-setup.ts
cd middleware && npx tsx src/hts-setup.ts
cd middleware && npm run event-logger
cd middleware && npm run purchase-api

# Frontend
cd frontend && npm run dev

# E2E (requires frontend + purchase-api running)
cd e2e && npx playwright test
```
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with purchase API and verification"
```

---

## Summary of All Tasks

| # | Task | Audit Finding | Score Impact | Estimated Difficulty |
|---|------|--------------|-------------|---------------------|
| 1 | Provider singleton | F6 (LOW) | Execution (minor) | Trivial |
| 2 | Stale data polling | F5 (LOW) | Execution 20% | Easy |
| 3 | Role-based issuer UI | F3 (MEDIUM) | Execution 20% | Easy |
| 4 | Fix purchase flow | F1+F2 (CRITICAL+HIGH) | Execution 20% + Integration 15% | Medium |
| 5 | Real HCS impact events | F4 (MEDIUM) | Integration 15% + Innovation 10% | Easy (builds on Task 4 API) |
| 6 | Delete create-diana.ts | F10 (INFO) | None (cleanup) | Trivial |
| 7 | Fix HIP reference | N/A (research doc) | None (correctness) | Trivial |
| 8 | Contract verification | F8 (MEDIUM) | Integration 15% | Medium (may need troubleshooting) |
| 9 | Compliance auto-refresh | Persona walkthrough | Execution 20% | Easy |
| 10 | Update CLAUDE.md | N/A | None (docs) | Trivial |

**Dependency order:** Task 10 (CLAUDE.md) should be done FIRST — it provides context for compaction. Then Tasks 1-3 and 6-9 are independent. Task 5 depends on Task 4 (shares the purchase-api.ts). After completing all tasks, review CLAUDE.md again and update if needed.

**Typecasting rule:** Do not typecast unless explicitly instructed. If a typecast is unavoidable, include a clear comment explaining why. Prefer fixing the underlying type issue instead.
