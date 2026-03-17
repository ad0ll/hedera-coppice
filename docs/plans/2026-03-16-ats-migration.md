# ATS Migration & Coupon Payments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate CPC bond token from standalone T-REX to Hedera's Asset Tokenization Studio (ATS), add coupon/yield payment functionality, and expand the frontend from 3 pages to 5 pages (Invest, Coupons, Impact, Issuer, Compliance).

**Architecture:** Client-side uses ATS SDK (`@hashgraph/asset-tokenization-sdk@5.0.0`) with ethers v6 for wallet connection and contract reads. Server-side API routes use viem for deployer-signed transactions against ATS diamond contracts. HCS audit/impact topics and eUSD faucet remain unchanged.

**Tech Stack:** Next.js 16 App Router, ATS SDK v5.0.0 (ethers v6), viem v2 (server-side), Tailwind CSS v4, React Query, Hedera SDK, Zod

---

## Phase 0: ATS SDK Spike & Foundation

### Task 1: Install ATS SDK and verify it works

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/lib/ats-spike.ts` (temporary, deleted in Task 3)

**Step 1: Install the ATS SDK**

Run: `cd frontend && npm install @hashgraph/asset-tokenization-sdk@5.0.0`

**Step 2: Create a spike script to verify SDK imports work**

Create `frontend/lib/ats-spike.ts`:

```typescript
// Temporary spike — verifying ATS SDK imports and types compile.
// Delete after Task 3.
import { Network, Bond, Security } from "@hashgraph/asset-tokenization-sdk";

// Verify the key types exist at compile time
type _NetworkType = typeof Network;
type _BondType = typeof Bond;
type _SecurityType = typeof Security;

export const ATS_RESOLVER = "0.0.7707874";
export const ATS_FACTORY = "0.0.7708432";

console.log("ATS SDK spike: imports OK");
```

**Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit lib/ats-spike.ts`

If there are type errors related to `reflect-metadata` or decorators, add to `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Step 4: Check for dependency conflicts**

Run: `cd frontend && npm ls ethers`

Verify ethers v6 is installed (ATS SDK depends on it). Note: this will coexist with viem — no conflict since they're independent libraries.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/ats-spike.ts
git commit -m "chore: install ATS SDK v5.0.0 and verify imports"
```

---

### Task 2: Create ATS setup script

This script creates the CPC bond token against Hedera's existing ATS deployment, registers demo wallets with compliance identities, sets the initial coupon, and mints initial supply.

**Files:**
- Create: `scripts/ats-setup.ts`
- Create: `scripts/.env.example` (update with new vars)

**Step 1: Write the setup script**

Create `scripts/ats-setup.ts`:

```typescript
import "reflect-metadata";
import { Network, Bond, Security, ConnectRequest, CreateBondRequest, SetCouponRequest, IssueRequest } from "@hashgraph/asset-tokenization-sdk";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, ".env") });

const ATS_RESOLVER = "0.0.7707874";
const ATS_FACTORY = "0.0.7708432";
const RPC_URL = process.env.HEDERA_JSON_RPC || "https://testnet.hashio.io/api";
const MIRROR_NODE = process.env.HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";

// Demo wallets — must match frontend/lib/constants.ts
const DEMO_WALLETS = {
  deployer: { accountId: "0.0.8213176", evmAddress: "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee" },
  alice: { accountId: "0.0.8213185", evmAddress: "0x4f9ad4fd6623b23bed45e47824b1f224da21d762", country: 276 },
  bob: { accountId: "0.0.8214040", evmAddress: "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7", country: 840 },
  charlie: { accountId: "0.0.8214051", evmAddress: "0xff3a3d1fec979bb1c6b3b368752b61b249a76f90", country: 156 },
  diana: { accountId: "0.0.8214895", evmAddress: "0x35bccfff4fcafd35ff5b3c412d85fba6ee04bcdf", country: 250 },
};

async function main() {
  console.log("=== ATS Setup: Creating CPC Bond Token ===\n");

  // 1. Initialize ATS SDK
  console.log("1. Initializing ATS SDK...");
  // NOTE: The exact Network.init() / Network.connect() API must be verified
  // against the SDK source. The code below follows the pattern from
  // docs/ats/developer-guides/sdk-integration.md but may need adjustment
  // based on the actual v5.0.0 API.
  //
  // If the SDK requires a custodial wallet for server-side usage and does
  // NOT support raw private keys, we will need to fall back to calling
  // the ATS factory contract directly via ethers with a Wallet signer.
  // See the fallback section at the bottom of this file.

  // TODO: Fill in actual Network.init() and Network.connect() calls
  // after verifying the v5.0.0 API surface in Task 3.

  // 2. Create bond
  console.log("2. Creating CPC bond token...");
  // Bond.create() with parameters:
  // - name: "Coppice Green Bond"
  // - symbol: "CPC"
  // - decimals: 18
  // - isin: "CPCGB2028" (demo ISIN)
  // - currency: EUSD_EVM_ADDRESS
  // - nominalValue: 1 (1 eUSD per token)
  // - startingDate: now
  // - maturityDate: 2028-03-15
  // - enableERC3643: true

  // TODO: Fill in after SDK API verification

  // 3. Register demo wallet identities
  console.log("3. Registering demo wallet identities...");
  // For each demo wallet: register identity, set country, issue claims

  // TODO: Fill in after SDK API verification

  // 4. Set initial coupon
  console.log("4. Setting initial coupon schedule...");
  // Bond.setCoupon() with:
  // - rate: 425 (4.25% with 2 decimals)
  // - rateDecimals: 2
  // - recordDate: 30 days from now
  // - executionDate: 31 days from now

  // TODO: Fill in after SDK API verification

  // 5. Mint initial supply to demo wallets
  console.log("5. Minting initial CPC supply...");
  // Security.issue() or Security.mint() to each verified wallet

  // TODO: Fill in after SDK API verification

  // 6. Output results
  console.log("\n=== Setup Complete ===");
  console.log("Save these to frontend/.env:");
  // Print new contract addresses for .env

  // TODO: Fill in after SDK API verification
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
```

> **Note:** This script is intentionally stubbed with TODOs. Task 3 explores the SDK API surface and fills in the actual calls. This 2-step approach prevents us from writing code against an API we haven't verified.

**Step 2: Commit the scaffold**

```bash
git add scripts/ats-setup.ts
git commit -m "feat: scaffold ATS setup script (stubs for API verification)"
```

---

### Task 3: Explore ATS SDK API surface and fill in setup script

**Files:**
- Modify: `scripts/ats-setup.ts`
- Delete: `frontend/lib/ats-spike.ts`

This task requires hands-on exploration of the ATS SDK. The agent executing this task should:

**Step 1: Read the SDK source to understand the actual v5.0.0 API**

The SDK is installed at `frontend/node_modules/@hashgraph/asset-tokenization-sdk/`. Key files to read:
- `build/esm/src/index.js` or `build/cjs/src/index.js` — what's exported
- Look for `Network` class — how init() and connect() actually work
- Look for `Bond` class — create(), setCoupon(), getCoupon() signatures
- Look for `Security` class — issue(), mint() signatures
- Look for `ConnectRequest`, `SupportedWallets` — wallet connection types
- Check if there's a raw-private-key option for server-side (there likely isn't — see research)

**Step 2: If SDK doesn't support raw-key server-side, implement ethers v6 fallback**

The ATS SDK likely requires DFNS/Fireblocks/AWS KMS for server-side. For the setup script, use ethers v6 directly:
- Import the TypeChain factory from `@hashgraph/asset-tokenization-contracts` (it's a dependency of the SDK)
- Create `new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(RPC_URL))`
- Call the ATS factory contract's `createBond()` function directly
- Call identity/compliance facets directly

**Step 3: Fill in all TODO sections in `scripts/ats-setup.ts`**

Replace every TODO with working code. Ensure:
- Bond is created with correct parameters
- At least Alice gets registered with identity + claims
- One coupon is scheduled
- Initial supply is minted to Alice

**Step 4: Run the setup script against testnet**

Run: `cd scripts && npx tsx ats-setup.ts`

Record all output — especially the new CPC contract address, identity registry address, and compliance address.

**Step 5: Delete the spike file**

Run: `rm frontend/lib/ats-spike.ts`

**Step 6: Commit**

```bash
git add scripts/ats-setup.ts
git rm frontend/lib/ats-spike.ts
git commit -m "feat: implement ATS setup script, create CPC bond on testnet"
```

---

### Task 4: Update environment variables and constants

**Files:**
- Modify: `frontend/lib/constants.ts`
- Modify: `frontend/.env` (if it exists)
- Modify: `.env.example` files as needed

**Step 1: Update constants.ts with new ATS contract addresses**

After running the setup script, update `frontend/lib/constants.ts`:

```typescript
import type { Address } from "viem";

// ATS deployment (Hedera testnet)
export const ATS_RESOLVER = "0.0.7707874";
export const ATS_FACTORY = "0.0.7708432";

// CPC Bond Token — created via ATS factory (update after running ats-setup.ts)
export const CPC_SECURITY_ID: Address = "0x_NEW_ADDRESS_FROM_SETUP_SCRIPT" as Address;

// eUSD HTS token EVM address (unchanged)
export const EUSD_EVM_ADDRESS: Address = "0x00000000000000000000000000000000007D5999";

export const MIRROR_NODE_URL =
  process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";

export const JSON_RPC_URL =
  process.env.NEXT_PUBLIC_HEDERA_JSON_RPC || "https://testnet.hashio.io/api";

export const TOPIC_IDS = {
  audit: process.env.NEXT_PUBLIC_AUDIT_TOPIC_ID || "",
  impact: process.env.NEXT_PUBLIC_IMPACT_TOPIC_ID || "",
};

export const EUSD_TOKEN_ID = process.env.NEXT_PUBLIC_EUSD_TOKEN_ID || "";

export const DEMO_WALLETS: Record<string, { label: string; country: string; role: string }> = {
  "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee": { label: "Deployer/Issuer", country: "DE", role: "issuer" },
  "0x4f9ad4fd6623b23bed45e47824b1f224da21d762": { label: "Alice", country: "DE", role: "verified" },
  "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7": { label: "Bob", country: "US", role: "unverified" },
  "0xff3a3d1fec979bb1c6b3b368752b61b249a76f90": { label: "Charlie", country: "CN", role: "verified" },
  "0x35bccfff4fcafd35ff5b3c412d85fba6ee04bcdf": { label: "Diana", country: "FR", role: "freeze-demo" },
};

// Bond details — now sourced from on-chain via ATS SDK, these are display defaults
export const BOND_DETAILS = {
  name: "Coppice Green Bond",
  symbol: "CPC",
  couponRate: "4.25%",
  maturity: "2028-03-15",
  issuer: "Coppice Finance",
  currency: "eUSD",
};
```

**Step 2: Update .env.example files with new vars**

Add `CPC_SECURITY_ID` and `ATS_RESOLVER`/`ATS_FACTORY` to relevant .env.example files.

**Step 3: Remove references to old T-REX contract addresses from @coppice/common**

The `@coppice/common` package exports `tokenAddress`, `identityRegistryAddress`, `modularComplianceAddress`. These are now replaced by the ATS security ID. Check which files import from `@coppice/common` and update them.

Run: `grep -r "@coppice/common" frontend/`

**Step 4: Verify build still passes**

Run: `cd frontend && npm run build`

Fix any type errors from the constants change.

**Step 5: Commit**

```bash
git add frontend/lib/constants.ts
git commit -m "feat: update constants for ATS-deployed CPC bond"
```

---

## Phase 1: Wallet Connection Migration (wagmi -> ATS SDK)

### Task 5: Create ATS provider and wallet context

**Files:**
- Create: `frontend/lib/ats.ts`
- Create: `frontend/contexts/ats-context.tsx`

**Step 1: Write the ATS initialization module**

Create `frontend/lib/ats.ts`:

```typescript
// ATS SDK initialization — client-side only.
// This module initializes the ATS Network singleton and provides
// typed access to the resolver/factory configuration.

import { Network } from "@hashgraph/asset-tokenization-sdk";
import { CPC_SECURITY_ID, JSON_RPC_URL, MIRROR_NODE_URL } from "./constants";

let initialized = false;

export async function initAtsNetwork(): Promise<void> {
  if (initialized) return;

  // NOTE: The exact init API must be verified from SDK source in Task 3.
  // This follows the documented pattern but may need adjustment.
  await Network.init({
    configuration: {
      resolverAddress: "0.0.7707874",
      factoryAddress: "0.0.7708432",
    },
    network: {
      name: "testnet",
      chainId: 296,
    },
    mirrorNode: {
      url: MIRROR_NODE_URL,
    },
    rpcNode: {
      url: JSON_RPC_URL,
    },
  });

  initialized = true;
}

export { CPC_SECURITY_ID };
```

**Step 2: Write the ATS React context**

Create `frontend/contexts/ats-context.tsx`:

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Address } from "viem";

// NOTE: Actual ATS SDK imports will be verified in Task 3.
// The pattern below assumes Network.connect() returns account info
// and Network.disconnect() cleans up.

interface AtsContextValue {
  address: Address | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AtsContext = createContext<AtsContextValue>({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function AtsProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize ATS Network on mount
  useEffect(() => {
    // Dynamic import to avoid SSR issues (ATS SDK uses window.ethereum)
    import("@/lib/ats").then(({ initAtsNetwork }) => {
      initAtsNetwork().catch(console.error);
    });
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // NOTE: Actual connect call depends on SDK API verified in Task 3.
      // Expected pattern:
      // const { Network, ConnectRequest, SupportedWallets } = await import("@hashgraph/asset-tokenization-sdk");
      // await Network.connect(new ConnectRequest({ wallet: SupportedWallets.METAMASK, ... }));
      // const account = Network.getAccount();
      // setAddress(account.evmAddress as Address);

      // Placeholder — will be filled after SDK API verification
      throw new Error("ATS connect not yet implemented — complete Task 3 first");
    } catch (err) {
      console.error("ATS connect failed:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Network.disconnect() or similar
    setAddress(undefined);
  }, []);

  return (
    <AtsContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </AtsContext.Provider>
  );
}

export function useAts() {
  return useContext(AtsContext);
}

// Convenience hook matching wagmi's useConnection() shape for easier migration
export function useConnection() {
  const { address, isConnecting } = useAts();
  return { address, isConnecting };
}
```

**Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/lib/ats.ts frontend/contexts/ats-context.tsx
git commit -m "feat: create ATS provider and wallet context"
```

---

### Task 6: Replace wagmi providers and wallet button

**Files:**
- Modify: `frontend/components/providers.tsx`
- Modify: `frontend/components/wallet-button.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/lib/auth.ts`

**Step 1: Rewrite providers.tsx**

Replace WagmiProvider with AtsProvider:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtsProvider } from "@/contexts/ats-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AtsProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </QueryClientProvider>
    </AtsProvider>
  );
}
```

**Step 2: Rewrite wallet-button.tsx**

```typescript
"use client";

import { useAts } from "@/contexts/ats-context";
import { DEMO_WALLETS } from "@/lib/constants";
import { abbreviateAddress } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useAts();

  const walletLabel = address
    ? DEMO_WALLETS[address.toLowerCase()]?.label || abbreviateAddress(address)
    : "";

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 bg-surface-3/80 border border-border rounded-lg px-2.5 py-1.5 sm:px-3">
          <span className="w-2 h-2 rounded-full bg-bond-green animate-pulse-dot" />
          <span className="text-sm font-medium text-white">{walletLabel}</span>
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            {abbreviateAddress(address)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-text-muted hover:text-bond-red transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bond-green rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      disabled={isConnecting}
      className="bg-bond-green text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

**Step 3: Update layout.tsx — remove wagmi SSR logic**

Remove `cookieToInitialState`, `getConfig`, and `headers` imports. The layout becomes simpler since ATS SDK doesn't use cookie-based SSR hydration:

```typescript
import type { Metadata } from "next";
import {
  Instrument_Serif,
  Bricolage_Grotesque,
  Geist_Mono,
} from "next/font/google";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coppice - Green Bond Tokenization",
  description: "ERC-3643 compliant green bond tokenization on Hedera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${bricolageGrotesque.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-surface text-text flex flex-col">
        <Providers>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full" role="main">
            {children}
          </main>
          <footer className="border-t border-border/50 py-4" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-text-muted">
              <a href="https://erc3643.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                ERC-3643 Compliant Green Bonds on Hedera
              </a>
              <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bond-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-bond-green" />
                </span>
                Hedera Testnet
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
```

Note: `RootLayout` is no longer `async` — no need for `headers()` or `cookieToInitialState`.

**Step 4: Update auth.ts — replace wagmi signMessage**

The `signAuthMessage` function currently imports from `@wagmi/core`. Replace with ethers v6 signing via the ATS SDK's provider:

```typescript
import { verifyMessage, getAddress } from "viem";
import type { Address } from "viem";

/**
 * Client-side: sign an auth message proving wallet ownership.
 * Uses ethers v6 personal_sign via ATS SDK's BrowserProvider.
 */
export async function signAuthMessage(
  address: Address,
  purpose: string,
): Promise<{ message: string; signature: string }> {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const message = `Coppice - ${purpose}\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

  // Use ethers BrowserProvider from window.ethereum for signing
  // (ATS SDK uses ethers internally, so this is compatible)
  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);

  return { message, signature };
}

// verifyAuth stays the same — it's server-side and uses viem (no wagmi dependency)
function validateTimestamp(message: string): void {
  const timestampMatch = message.match(/Timestamp: (.+)/);
  if (!timestampMatch) {
    throw new Error("Invalid auth message: missing timestamp");
  }
  const messageTime = new Date(timestampMatch[1]).getTime();
  if (isNaN(messageTime)) {
    throw new Error("Invalid auth message: malformed timestamp");
  }
  const age = Date.now() - messageTime;
  if (age > 60_000) {
    throw new Error("Signature expired (>60s)");
  }
  if (age < -5_000) {
    throw new Error("Signature timestamp is in the future");
  }
}

export async function verifyAuth(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<void> {
  validateTimestamp(message);

  const isValid = await verifyMessage({
    address: getAddress(expectedAddress),
    message,
    signature: signature as `0x${string}`,
  });

  if (!isValid) {
    throw new Error("Invalid signature");
  }
}
```

Note: `signAuthMessage` signature changes — it no longer takes a wagmi `Config` parameter. All callers must be updated.

**Step 5: Verify build passes**

Run: `cd frontend && npm run build`

**Step 6: Commit**

```bash
git add frontend/components/providers.tsx frontend/components/wallet-button.tsx frontend/app/layout.tsx frontend/lib/auth.ts
git commit -m "feat: replace wagmi with ATS SDK wallet connection"
```

---

### Task 7: Migrate page components from wagmi hooks to ATS context

**Files:**
- Modify: `frontend/app/page.tsx` — replace `useConnection` from wagmi with `useConnection` from ats-context
- Modify: `frontend/app/issue/page.tsx` — same
- Modify: `frontend/app/monitor/page.tsx` — no wagmi imports, no change needed
- Modify: `frontend/components/compliance-status.tsx` — replace wagmi hooks
- Modify: `frontend/components/transfer-flow.tsx` — replace wagmi hooks
- Modify: `frontend/hooks/use-token.ts` — rewrite without wagmi
- Modify: `frontend/hooks/use-identity.ts` — rewrite without wagmi
- Modify: `frontend/hooks/use-compliance.ts` — rewrite without wagmi

This is a large task. The key changes for each file:

**Step 1: Rewrite use-token.ts → use-bond.ts**

Replace wagmi's `useReadContract`/`useWriteContract` with React Query + ethers v6 calls via ATS SDK:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { CPC_SECURITY_ID, JSON_RPC_URL } from "@/lib/constants";

// Use ethers v6 for contract reads (ATS SDK uses ethers internally)
async function getEthersProvider() {
  const { ethers } = await import("ethers");
  return new ethers.JsonRpcProvider(JSON_RPC_URL);
}

// ATS bond read functions — these call the diamond proxy's Bond facet
// The exact ABI will come from @hashgraph/asset-tokenization-contracts
// or we extract the minimal ABI needed for each function.

export function useBondDetails() {
  return useQuery({
    queryKey: ["bond-details", CPC_SECURITY_ID],
    queryFn: async () => {
      // TODO: Call Bond.getBondDetails() via ATS SDK or direct ethers call
      // Return: name, symbol, decimals, nominalValue, currency, maturityDate, etc.
      return null;
    },
    refetchInterval: 30_000,
  });
}

export function useTokenBalance(address: Address | undefined) {
  return useQuery({
    queryKey: ["cpc-balance", address],
    queryFn: async () => {
      if (!address) return BigInt(0);
      // TODO: Call balanceOf on the ATS security contract
      return BigInt(0);
    },
    enabled: !!address,
    refetchInterval: 10_000,
  });
}

export function useTotalSupply() {
  return useQuery({
    queryKey: ["cpc-total-supply"],
    queryFn: async () => {
      // TODO: Call totalSupply on the ATS security contract
      return BigInt(0);
    },
    refetchInterval: 10_000,
  });
}

export function useIsPaused() {
  return useQuery({
    queryKey: ["cpc-paused"],
    queryFn: async () => {
      // TODO: Call paused() on the ATS security contract
      return false;
    },
    refetchInterval: 10_000,
  });
}

export function useIsAgent(address: Address | undefined) {
  return useQuery({
    queryKey: ["cpc-is-agent", address],
    queryFn: async () => {
      if (!address) return false;
      // TODO: Call isAgent or hasRole on the ATS security contract
      return false;
    },
    enabled: !!address,
  });
}
```

> **Note:** The TODO items here depend on Task 3's findings about the exact ATS contract ABIs. The implementing agent should read the TypeChain output from `@hashgraph/asset-tokenization-contracts` to get the actual function signatures.

**Step 2: Replace all `from "wagmi"` imports across page components**

For each file:
- Replace `import { useConnection } from "wagmi"` with `import { useConnection } from "@/contexts/ats-context"`
- Replace `import { useConfig } from "wagmi"` — remove entirely (no longer needed)
- Replace `import { usePublicClient } from "wagmi"` — use ethers JsonRpcProvider instead
- Replace `import { writeContract, waitForTransactionReceipt } from "@wagmi/core"` — use ethers BrowserProvider signer
- Update `signAuthMessage(config, address, purpose)` calls to `signAuthMessage(address, purpose)` (config param removed)

**Step 3: Verify all pages compile**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Run the dev server and smoke test**

Run: `cd frontend && npm run dev`

Check that `/`, `/issue`, and `/monitor` load without crashes. Wallet connection may not fully work until Task 3 fills in the ATS connect implementation.

**Step 5: Commit**

```bash
git add frontend/app/ frontend/components/ frontend/hooks/ frontend/contexts/
git commit -m "feat: migrate all pages from wagmi to ATS context"
```

---

### Task 8: Remove wagmi dependency

**Files:**
- Delete: `frontend/lib/wagmi.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/lib/deployer.ts` — remove wagmi chain import

**Step 1: Update deployer.ts**

`deployer.ts` imports `hederaTestnet` from `@/lib/wagmi`. Replace with inline chain definition:

```typescript
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { JSON_RPC_URL } from "@/lib/constants";

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: {
      http: [JSON_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
});

export function getDeployerAccount() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  }
  const keyHex = (deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`) as `0x${string}`;
  return privateKeyToAccount(keyHex);
}

export function getDeployerWalletClient() {
  return createWalletClient({
    account: getDeployerAccount(),
    chain: hederaTestnet,
    transport: http(JSON_RPC_URL),
  });
}

export function getServerPublicClient() {
  return createPublicClient({
    chain: hederaTestnet,
    transport: http(JSON_RPC_URL),
  });
}
```

**Step 2: Verify no remaining wagmi imports**

Run: `grep -r "wagmi" frontend/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"`

Fix any remaining references.

**Step 3: Uninstall wagmi**

Run: `cd frontend && npm uninstall wagmi @wagmi/core @wagmi/connectors`

Note: `@wagmi/core` and `@wagmi/connectors` may not be separate deps (wagmi v3 bundles them). Check `package.json` and uninstall whatever wagmi packages exist.

**Step 4: Delete wagmi.ts**

Run: `rm frontend/lib/wagmi.ts`

**Step 5: Verify build**

Run: `cd frontend && npm run build`

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove wagmi dependency, complete ATS wallet migration"
```

---

## Phase 2: New Pages

### Task 9: Add Coupons and Impact nav links

**Files:**
- Modify: `frontend/components/nav.tsx`

**Step 1: Add two new nav items**

Update the nav links array to include Coupons and Impact between Invest and Issuer:

```typescript
// In the desktop nav section:
<Link href="/" className={navLinkClass("/")}>Invest</Link>
<Link href="/coupons" className={navLinkClass("/coupons")}>Coupons</Link>
<Link href="/impact" className={navLinkClass("/impact")}>Impact</Link>
<Link href="/issue" className={navLinkClass("/issue")}>Issuer</Link>
<Link href="/monitor" className={navLinkClass("/monitor")}>Compliance</Link>

// In the mobile menu array:
{[
  { href: "/", label: "Invest" },
  { href: "/coupons", label: "Coupons" },
  { href: "/impact", label: "Impact" },
  { href: "/issue", label: "Issuer" },
  { href: "/monitor", label: "Compliance" },
].map(/* ... */)}
```

**Step 2: Verify nav renders correctly**

Run: `cd frontend && npm run dev`

Check that all 5 nav links appear. Coupons and Impact will 404 until we create their pages.

**Step 3: Commit**

```bash
git add frontend/components/nav.tsx
git commit -m "feat: add Coupons and Impact nav links"
```

---

### Task 10: Create Coupons page

**Files:**
- Create: `frontend/app/coupons/page.tsx`
- Create: `frontend/hooks/use-coupons.ts`
- Create: `frontend/components/coupon-schedule.tsx`
- Create: `frontend/components/next-coupon-card.tsx`
- Create: `frontend/components/yield-history.tsx`

**Step 1: Create the coupons hook**

Create `frontend/hooks/use-coupons.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { CPC_SECURITY_ID } from "@/lib/constants";

export interface Coupon {
  id: number;
  rate: number;
  rateDecimals: number;
  recordDate: Date;
  executionDate: Date;
  status: "scheduled" | "record" | "executed" | "paid";
}

export interface CouponAmount {
  couponId: number;
  numerator: bigint;
  denominator: bigint;
  amount: number;
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons", CPC_SECURITY_ID],
    queryFn: async (): Promise<Coupon[]> => {
      // TODO: Call Bond.getAllCoupons() or Bond.getCouponCount() + Bond.getCoupon()
      // via ATS SDK or direct ethers contract call.
      // For now, return demo data so the UI can be built.
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in31Days = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      return [
        {
          id: 1,
          rate: 425,
          rateDecimals: 2,
          recordDate: in30Days,
          executionDate: in31Days,
          status: "scheduled",
        },
      ];
    },
    refetchInterval: 30_000,
  });
}

export function useCouponAmount(couponId: number, address: Address | undefined) {
  return useQuery({
    queryKey: ["coupon-amount", couponId, address],
    queryFn: async (): Promise<CouponAmount | null> => {
      if (!address) return null;
      // TODO: Call Bond.getCouponAmountFor(couponId, address)
      // Returns numerator/denominator for pro-rata calculation
      return null;
    },
    enabled: !!address && couponId > 0,
    refetchInterval: 30_000,
  });
}

export function useNextCoupon() {
  const { data: coupons } = useCoupons();
  if (!coupons || coupons.length === 0) return null;

  const now = new Date();
  return coupons.find((c) => c.executionDate > now) ?? coupons[coupons.length - 1];
}
```

**Step 2: Create the next-coupon-card component**

Create `frontend/components/next-coupon-card.tsx` — shows countdown to next coupon payment with rate and estimated payout. Use the existing design system (card-flush, stat-label, font-display, etc.).

**Step 3: Create the coupon-schedule component**

Create `frontend/components/coupon-schedule.tsx` — table of all coupons with columns: #, Rate, Record Date, Execution Date, Status. Use existing table styling patterns from `holders-table.tsx`.

**Step 4: Create the yield-history component**

Create `frontend/components/yield-history.tsx` — per-holder list of received coupon payments with amounts and dates. Empty state when no coupons have been paid yet.

**Step 5: Create the coupons page**

Create `frontend/app/coupons/page.tsx`:

```typescript
"use client";

import { useConnection } from "@/contexts/ats-context";
import { NextCouponCard } from "@/components/next-coupon-card";
import { CouponSchedule } from "@/components/coupon-schedule";
import { YieldHistory } from "@/components/yield-history";
import { useCoupons } from "@/hooks/use-coupons";

export default function CouponsPage() {
  const { address } = useConnection();
  const { data: coupons, isLoading } = useCoupons();

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 }}>
        Coupon Payments
      </h1>

      <div className="animate-entrance" style={{ "--index": 1 }}>
        <NextCouponCard address={address} />
      </div>

      <div className="animate-entrance" style={{ "--index": 2 }}>
        <CouponSchedule coupons={coupons ?? []} loading={isLoading} />
      </div>

      {address && (
        <div className="animate-entrance" style={{ "--index": 3 }}>
          <YieldHistory address={address} coupons={coupons ?? []} />
        </div>
      )}
    </div>
  );
}
```

**Step 6: Verify page loads**

Run: `cd frontend && npm run dev`

Navigate to `/coupons` — should render with demo data.

**Step 7: Commit**

```bash
git add frontend/app/coupons/ frontend/hooks/use-coupons.ts frontend/components/next-coupon-card.tsx frontend/components/coupon-schedule.tsx frontend/components/yield-history.tsx
git commit -m "feat: add Coupons page with schedule, next payment, and yield history"
```

---

### Task 11: Create Impact page

**Files:**
- Create: `frontend/app/impact/page.tsx`
- Create: `frontend/components/impact-metrics.tsx`
- Create: `frontend/components/icma-alignment.tsx`
- Move: `frontend/components/project-allocation.tsx` — keep as-is, re-export from Impact page

**Step 1: Create impact-metrics component**

Create `frontend/components/impact-metrics.tsx` — large stat cards showing:
- CO2 tonnes avoided
- Clean energy generated (MWh)
- Projects funded (count)

Data sourced from HCS impact topic messages. Reuse `useHCSAudit("impact")` and aggregate by event type.

**Step 2: Create icma-alignment component**

Create `frontend/components/icma-alignment.tsx` — 4 cards showing alignment with ICMA Green Bond Principles:
1. Use of Proceeds — check
2. Project Evaluation & Selection — check
3. Management of Proceeds — check
4. Reporting — check

These are static display cards (we meet all 4 principles by design). Use CheckIcon for each.

**Step 3: Create the Impact page**

Create `frontend/app/impact/page.tsx`:

```typescript
"use client";

import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { ImpactMetrics } from "@/components/impact-metrics";
import { ProjectAllocation } from "@/components/project-allocation";
import { ICMAAlignment } from "@/components/icma-alignment";
import { AuditEventFeed } from "@/components/audit-event-feed";

export default function ImpactPage() {
  const { events: impactEvents } = useHCSAudit("impact");

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 }}>
        Green Impact
      </h1>

      <div className="animate-entrance" style={{ "--index": 1 }}>
        <ImpactMetrics events={impactEvents} />
      </div>

      <div className="animate-entrance" style={{ "--index": 2 }}>
        <ProjectAllocation />
      </div>

      <div className="animate-entrance" style={{ "--index": 3 }}>
        <ICMAAlignment />
      </div>

      <div className="animate-entrance" style={{ "--index": 4 }}>
        <AuditEventFeed topicType="impact" />
      </div>
    </div>
  );
}
```

**Step 4: Remove ProjectAllocation from Issuer page**

In `frontend/app/issue/page.tsx`, remove the `<ProjectAllocation />` section since it now lives on the Impact page. Keep the "Allocate Proceeds" form card — that's the issuer action that creates allocation records.

**Step 5: Verify page loads**

Run: `cd frontend && npm run dev`

Navigate to `/impact` — should render with HCS data (if any impact events exist).

**Step 6: Commit**

```bash
git add frontend/app/impact/ frontend/components/impact-metrics.tsx frontend/components/icma-alignment.tsx frontend/app/issue/page.tsx
git commit -m "feat: add Impact page with metrics, ICMA alignment, and use-of-proceeds"
```

---

### Task 12: Add coupon management to Issuer page

**Files:**
- Modify: `frontend/app/issue/page.tsx`
- Create: `frontend/components/set-coupon-form.tsx`

**Step 1: Create the set-coupon-form component**

Create `frontend/components/set-coupon-form.tsx` — a card form that lets the issuer:
- Set coupon rate (percentage input)
- Set record date (date picker)
- Set execution date (date picker)
- Submit via ATS SDK `Bond.setCoupon()`

Include a "Trigger Distribution" button for coupons that have passed their execution date.

**Step 2: Add to issuer page**

In `frontend/app/issue/page.tsx`, add `<SetCouponForm />` to the operations grid, replacing the removed ProjectAllocation section.

**Step 3: Verify page loads**

Run: `cd frontend && npm run dev`

**Step 4: Commit**

```bash
git add frontend/components/set-coupon-form.tsx frontend/app/issue/page.tsx
git commit -m "feat: add coupon management to Issuer page"
```

---

## Phase 3: Server-Side API Routes

### Task 13: Create coupon distribution API route

**Files:**
- Create: `frontend/app/api/issuer/distribute/route.ts`

**Step 1: Create the distribution route**

This route triggers mass coupon payout. The deployer calls `LifeCycleCashFlow.executeDistribution()` via viem:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { getDeployerWalletClient, getServerPublicClient } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import { CPC_SECURITY_ID } from "@/lib/constants";

const distributeBodySchema = z.object({
  couponId: z.number().int().positive(),
  signerAddress: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const distributeResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
  succeeded: z.number(),
  failed: z.number(),
});
export type DistributeResponse = z.infer<typeof distributeResponseSchema>;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = distributeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { couponId, signerAddress, message, signature } = parsed.data;

  try {
    await verifyAuth(message, signature, signerAddress);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err, 0, "Auth failed") }, { status: 401 });
  }

  try {
    const walletClient = getDeployerWalletClient();
    const publicClient = getServerPublicClient();

    // TODO: Call LifeCycleCashFlow.executeDistribution()
    // This requires the LifeCycleCashFlow contract address and ABI.
    // The ABI comes from @hashgraph/asset-tokenization-contracts.
    // Paginated: loop until all holders are paid.

    // Placeholder response
    return NextResponse.json({
      success: true,
      txHash: "0x_placeholder",
      succeeded: 0,
      failed: 0,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err, 200, "Distribution failed") }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add frontend/app/api/issuer/distribute/
git commit -m "feat: add coupon distribution API route (scaffold)"
```

---

### Task 14: Update purchase route for ATS contracts

**Files:**
- Modify: `frontend/app/api/purchase/route.ts`

**Step 1: Update the mint call**

Replace the T-REX `mint()` call with a call to the ATS security contract's `issue()` or `mint()` function. The eUSD transferFrom logic stays the same.

The key change is the contract address (now `CPC_SECURITY_ID`) and the ABI (now from ATS TypeChain output instead of `@coppice/common`).

**Step 2: Verify the route works**

This requires the ATS setup to be complete (Task 3). Test with a manual curl or via the frontend purchase flow.

**Step 3: Commit**

```bash
git add frontend/app/api/purchase/route.ts
git commit -m "feat: update purchase route for ATS security contract"
```

---

## Phase 4: Testing & Cleanup

### Task 15: Update existing unit tests

**Files:**
- Modify: `frontend/__tests__/api/purchase.test.ts`
- Modify: `frontend/__tests__/lib/auth.test.ts`
- Modify: `frontend/__tests__/lib/constants.test.ts`
- Modify: `frontend/__tests__/hooks/use-holders.test.ts`
- Delete or rewrite tests that depend on wagmi mocks

**Step 1: Update auth.test.ts**

Remove wagmi config parameter from `signAuthMessage` test calls. The server-side `verifyAuth` tests should be unchanged.

**Step 2: Update constants.test.ts**

Update to test new ATS constants (`CPC_SECURITY_ID`, `ATS_RESOLVER`, `ATS_FACTORY`).

**Step 3: Update purchase.test.ts**

Update mock contract address and ABI references to match ATS.

**Step 4: Run all unit tests**

Run: `npm run test:unit`

Fix failures.

**Step 5: Commit**

```bash
git add frontend/__tests__/
git commit -m "test: update unit tests for ATS migration"
```

---

### Task 16: Write unit tests for new hooks and components

**Files:**
- Create: `frontend/__tests__/hooks/use-coupons.test.ts`
- Create: `frontend/__tests__/components/coupon-schedule.test.ts` (or .tsx)
- Create: `frontend/__tests__/components/impact-metrics.test.ts`

**Step 1: Test use-coupons hook**

Test that `useCoupons` returns the expected shape, handles empty state, and transforms data correctly. Mock the underlying query function.

**Step 2: Test coupon-schedule component**

Test that coupon schedule renders rows for each coupon with correct status badges. Test empty state.

**Step 3: Test impact-metrics component**

Test that impact metrics aggregates HCS events correctly and displays formatted numbers.

**Step 4: Run all tests**

Run: `npm run test:unit`

**Step 5: Commit**

```bash
git add frontend/__tests__/
git commit -m "test: add unit tests for coupons and impact components"
```

---

### Task 17: Update E2E tests

**Files:**
- Modify: `e2e/tests/*.spec.ts` — update wallet mock for ATS SDK (no longer intercepts wagmi)
- Add: tests for `/coupons` and `/impact` pages

The E2E wallet mock currently intercepts wagmi's JSON-RPC calls. With ATS SDK, the mock needs to intercept `window.ethereum` at a lower level (ethers BrowserProvider also uses `window.ethereum`). The approach should be similar but the interception point changes.

**Step 1: Update wallet mock**

In the E2E setup, the mock wallet injects `window.ethereum` with a Proxy that handles `eth_requestAccounts`, `personal_sign`, etc. This should still work since ATS SDK's MetamaskService calls `detectEthereumProvider()` which finds `window.ethereum`. Verify this.

**Step 2: Add coupons page tests**

Test that `/coupons` renders the next coupon card and schedule table.

**Step 3: Add impact page tests**

Test that `/impact` renders impact metrics and ICMA alignment cards.

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test`

**Step 5: Commit**

```bash
git add e2e/
git commit -m "test: update E2E tests for ATS migration, add coupons and impact tests"
```

---

### Task 18: Remove @coppice/common package (if fully replaced)

**Files:**
- Check: `packages/common/` — if no files import from it, remove the package
- Modify: `package.json` workspaces if removing
- Modify: `turbo.json` if removing

**Step 1: Check for remaining imports**

Run: `grep -r "@coppice/common" --include="*.ts" --include="*.tsx" | grep -v node_modules`

If no results, the package can be removed.

**Step 2: Remove if unused**

If still used by some files, keep it. If fully replaced, remove `packages/common/` and update workspace config.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused @coppice/common package"
```

---

### Task 19: Update event logger for ATS contract events

**Files:**
- Modify: `services/src/event-logger.ts`

**Step 1: Update contract addresses**

The event logger listens for EVM events and submits to HCS. Update it to listen to the new ATS security contract address instead of the old T-REX token.

**Step 2: Add coupon distribution events**

Listen for `DistributionExecuted` events from the LifeCycleCashFlow contract and submit them to HCS audit topic.

**Step 3: Test the event logger**

Run: `cd services && npm run event-logger`

Verify it connects and starts polling.

**Step 4: Commit**

```bash
git add services/
git commit -m "feat: update event logger for ATS contract events"
```

---

### Task 20: Final verification and cleanup

**Step 1: Run full build**

Run: `npm run build`

**Step 2: Run all unit tests**

Run: `npm run test:unit`

**Step 3: Run linter**

Run: `npm run lint`

**Step 4: Start dev server and manually verify all 5 pages**

Run: `cd frontend && npm run dev`

- `/` — Invest page loads, bond details show, compliance checks run
- `/coupons` — Coupon schedule and next payment card render
- `/impact` — Impact metrics, allocation chart, ICMA cards render
- `/issue` — Issuer dashboard with coupon management
- `/monitor` — Compliance audit feed (unchanged)

**Step 5: Run E2E tests**

Run: `cd e2e && npx playwright test`

**Step 6: Update CLAUDE.md if needed**

If contract addresses changed, update the Deployed Contracts section. Remove references to T-REX-specific deployment. Add ATS SDK to the Architecture section.

**Step 7: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification for ATS migration"
```

---

## Dependency Graph

```
Task 1 (install SDK)
  └─ Task 2 (scaffold setup script)
       └─ Task 3 (explore SDK API, fill in setup script) ← CRITICAL PATH
            ├─ Task 4 (update constants with new addresses)
            │    └─ Task 5 (ATS provider + context)
            │         └─ Task 6 (replace wagmi providers)
            │              └─ Task 7 (migrate page components)
            │                   └─ Task 8 (remove wagmi)
            │                        ├─ Task 9 (nav links)
            │                        │    ├─ Task 10 (Coupons page)
            │                        │    └─ Task 11 (Impact page)
            │                        ├─ Task 12 (coupon management on Issuer)
            │                        ├─ Task 13 (distribution API route)
            │                        └─ Task 14 (update purchase route)
            └─ Task 19 (event logger)

Tasks 15-18 (testing) can start after Task 8
Task 20 (final) runs after everything else
```

## Risk Register

| Risk | Mitigation |
|---|---|
| ATS SDK v5.0.0 API doesn't match documented patterns | Task 3 is dedicated API exploration. Fall back to direct ethers + TypeChain calls if SDK is unusable. |
| No raw-key server-side signing in SDK | Already planned: server routes use viem directly against ATS contracts. |
| ethers v6 + viem coexistence causes bundle bloat | Accept it. Both are needed — ethers for ATS client-side, viem for server-side. |
| ATS factory contract call fails on testnet | The contracts are already deployed and working (other users create tokens). Check gas limits and parameters. |
| E2E wallet mock breaks with ATS SDK | Both wagmi and ATS use `window.ethereum` — mock should work at that level. If not, create ethers-specific mock. |
| Hackathon deadline (March 23) | Phase 0-1 is the critical foundation (~2 days). Phase 2 pages can be built in parallel (~1 day each). Testing is Phase 4 (~1 day). |
