# Frontend Rebuild — Next.js + Wagmi + Impeccable

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the Coppice frontend from Vite SPA to Next.js App Router with wagmi/viem, absorb the middleware purchase API into API routes, and apply impeccable design skills for quality.

**Architecture:** Next.js 15 App Router with a server component layout wrapping client providers (WagmiProvider + QueryClientProvider). Pages are `'use client'` since they depend on wallet state. API routes (`/api/purchase`, `/api/allocate`) replace the Express middleware server. Existing visual identity is preserved; impeccable skills audit and polish.

**Tech Stack:** Next.js 15, React 19, wagmi v2, viem, @tanstack/react-query, @hashgraph/sdk, Tailwind CSS v4, Playwright, vitest

**IMPORTANT — Pre-execution review:** Plans 1 (low-hanging fruit) and optionally 2-3 (viem migration) may have already modified files. Before starting this plan, read the current state of ALL frontend, middleware, and config files. Adjust steps to match reality. Use Context7 MCP for Next.js and wagmi documentation throughout.

**Typecasting rule:** Do not typecast unless explicitly instructed. No `any`. No `as Type` without a convincing comment. No `@ts-ignore`. Fix types properly.

**Design doc:** `docs/plans/2026-03-14-frontend-rebuild-design.md`

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `frontend-next/` (new directory, parallel to existing `frontend/`)
- Create: `frontend-next/package.json`
- Create: `frontend-next/next.config.ts`
- Create: `frontend-next/tsconfig.json`
- Create: `frontend-next/tailwind.config.ts` (or CSS-based Tailwind v4 config)
- Create: `frontend-next/app/layout.tsx`
- Create: `frontend-next/app/page.tsx`

We scaffold alongside the old frontend so we can reference it. At the end we swap.

**Step 1: Create Next.js project**

Run: `npx create-next-app@latest frontend-next --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack`

When prompted, accept defaults. This creates the Next.js scaffold with App Router, TypeScript, Tailwind, and ESLint.

**Step 2: Install project dependencies**

Run: `cd frontend-next && npm install viem wagmi @tanstack/react-query @hashgraph/sdk`

**Step 3: Clean up scaffold**

Delete the default page content and globals. We'll replace them with our own:

Run: `rm -f frontend-next/app/favicon.ico frontend-next/public/file.svg frontend-next/public/globe.svg frontend-next/public/next.svg frontend-next/public/vercel.svg frontend-next/public/window.svg`

**Step 4: Verify dev server starts**

Run: `cd frontend-next && npm run dev`

Open http://localhost:3000 — should show the Next.js default page.
Kill the server (Ctrl+C).

**Step 5: Commit**

```bash
git add frontend-next/
git commit -m "chore: scaffold Next.js project alongside existing frontend"
```

---

### Task 2: Port Tailwind Theme + Global Styles

**Files:**
- Modify: `frontend-next/app/globals.css`

**Step 1: Copy the Tailwind theme from the old frontend**

Read `frontend/src/index.css` for the current theme tokens (`@theme` block, custom colors, animations, scrollbar styles). Port them to `frontend-next/app/globals.css`.

The file should contain:
- Tailwind v4 `@import "tailwindcss"`
- `@theme` block with: `--color-bond-green`, `--color-bond-red`, `--color-bond-amber`, `--color-surface`, `--color-surface-2`, `--color-surface-3`, `--color-border`, `--color-text`, `--color-text-muted`
- Custom animations: `animate-pulse-dot`, `animate-spin`
- Custom `.card-glow` class
- Custom scrollbar styles
- Any other custom CSS from the old frontend

**Step 2: Verify Tailwind works**

Update `app/page.tsx` to use a custom color:

```tsx
export default function Home() {
  return <div className="min-h-screen bg-surface text-text p-8">
    <h1 className="text-2xl text-bond-green">Coppice</h1>
  </div>;
}
```

Run: `cd frontend-next && npm run dev`
Verify the green text renders on the dark background.

**Step 3: Commit**

```bash
git add frontend-next/app/globals.css frontend-next/app/page.tsx
git commit -m "feat: port Tailwind theme and global styles"
```

---

### Task 3: Create Lib Files (wagmi config, ABIs, constants)

**Files:**
- Create: `frontend-next/lib/wagmi.ts`
- Create: `frontend-next/lib/abis.ts`
- Create: `frontend-next/lib/constants.ts`

**Step 1: Create wagmi config with Hedera testnet chain**

```typescript
// frontend-next/lib/wagmi.ts
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_HEDERA_JSON_RPC || "https://testnet.hashio.io/api"],
    },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
});

export const config = createConfig({
  chains: [hederaTestnet],
  connectors: [injected()],
  transports: {
    [hederaTestnet.id]: http(),
  },
});

// Type-safe config registration
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
```

**Step 2: Create typed ABIs**

```typescript
// frontend-next/lib/abis.ts
// Typed ABI arrays with `as const` for full viem type inference.
// No typecast needed — viem infers function names, args, and return types.

export const tokenABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "paused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "setAddressFrozen", inputs: [{ name: "addr", type: "address" }, { name: "freeze", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isFrozen", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "isAgent", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

export const identityRegistryABI = [
  { type: "function", name: "isVerified", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "identity", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "investorCountry", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "uint16" }], stateMutability: "view" },
  { type: "function", name: "contains", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

export const modularComplianceABI = [
  { type: "function", name: "canTransfer", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;
```

**Step 3: Create constants**

```typescript
// frontend-next/lib/constants.ts
import type { Address } from "viem";

export const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";

export const CONTRACT_ADDRESSES: Record<string, Address> = {
  token: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x") as Address,
  identityRegistry: (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || "0x") as Address,
  // NOTE: typecast required here because env vars are string | undefined,
  // but viem Address type requires `0x${string}`. The env var IS an address
  // string at runtime; this cast bridges the compile-time gap.
  compliance: (process.env.NEXT_PUBLIC_COMPLIANCE_ADDRESS || "0x") as Address,
};

export const TOPIC_IDS = {
  audit: process.env.NEXT_PUBLIC_AUDIT_TOPIC_ID || "",
  impact: process.env.NEXT_PUBLIC_IMPACT_TOPIC_ID || "",
};

export const EUSD_TOKEN_ID = process.env.NEXT_PUBLIC_EUSD_TOKEN_ID || "";

export const DEMO_WALLETS: Record<string, { label: string; country: string; role: string }> = {
  "0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee": { label: "Deployer/Issuer", country: "DE", role: "issuer" },
  "0x4f9ad4fd6623b23bed45e47824b1f224da21d762": { label: "Alice", country: "DE", role: "verified" },
  "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7": { label: "Bob", country: "US", role: "unverified" },
  "0xff3a3d1fec979bb1c6b3b368752b61b249a76f90": { label: "Charlie", country: "CN", role: "restricted" },
  "0x35bccfff4fcafd35ff5b3c412d85fba6ee04bcdf": { label: "Diana", country: "FR", role: "freeze-demo" },
};

export const BOND_DETAILS = {
  name: "Coppice Green Bond",
  symbol: "CPC",
  couponRate: "4.25%",
  maturity: "2028-03-15",
  issuer: "Coppice Finance",
  currency: "eUSD",
};
```

**Step 4: Create .env.local**

```
NEXT_PUBLIC_HEDERA_JSON_RPC=https://testnet.hashio.io/api
NEXT_PUBLIC_HEDERA_MIRROR_NODE=https://testnet.mirrornode.hedera.com
NEXT_PUBLIC_TOKEN_ADDRESS=0x17e19B53981370a904d0003Ba2D336837a43cbf0
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x03ecdB8673d65b81752AC14dAaCa797D846c1B31
NEXT_PUBLIC_COMPLIANCE_ADDRESS=0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf
NEXT_PUBLIC_AUDIT_TOPIC_ID=0.0.8214934
NEXT_PUBLIC_IMPACT_TOPIC_ID=0.0.8214935
NEXT_PUBLIC_EUSD_TOKEN_ID=0.0.8214937

# Server-side only (for API routes)
HEDERA_ACCOUNT_ID=0.0.8213176
DEPLOYER_PRIVATE_KEY=<from .env>
ALICE_PRIVATE_KEY=<from .env>
ALICE_ACCOUNT_ID=0.0.8213185
DIANA_PRIVATE_KEY=<from .env>
DIANA_ACCOUNT_ID=0.0.8214895
EUSD_TOKEN_ID=0.0.8214937
TOKEN_ADDRESS=0x17e19B53981370a904d0003Ba2D336837a43cbf0
IMPACT_TOPIC_ID=0.0.8214935
```

Add `.env.local` to `.gitignore` if not already there.

**Step 5: Verify build**

Run: `cd frontend-next && npm run build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add frontend-next/lib/ frontend-next/.env.local.example
git commit -m "feat: add wagmi config, typed ABIs, and constants"
```

---

### Task 4: Create Providers + Layout

**Files:**
- Create: `frontend-next/providers.tsx`
- Modify: `frontend-next/app/layout.tsx`

**Step 1: Create the providers component**

```tsx
// frontend-next/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient must be created in state to avoid sharing between requests
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**Step 2: Create the root layout**

Port the nav structure from `frontend/src/App.tsx`. The layout is a server component; the nav wallet button is a separate client component.

```tsx
// frontend-next/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "@/providers";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coppice — Green Bond Tokenization",
  description: "ERC-3643 compliant green bond tokenization on Hedera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-text flex flex-col">
        <Providers>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
            {children}
          </main>
          <footer className="border-t border-border/50 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-text-muted">
              <a href="https://erc3643.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                ERC-3643 Compliant Green Bonds on Hedera
              </a>
              <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Hedera Testnet (Chain 296)
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
```

**Step 3: Create the Nav component**

Port from `frontend/src/App.tsx` (the `Layout` function's nav section + `WalletButton` + `MobileMenu`). This is a `'use client'` component because it uses `useAccount`, `useConnect`, `useDisconnect`.

Create `frontend-next/components/nav.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive ? "bg-bond-green/10 text-bond-green" : "text-text-muted hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2">
              <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="currentColor" className="text-surface-3" />
                <path d="M16 6C11 11 9 16 11 21C12 24 14 26 16 27C18 26 20 24 21 21C23 16 21 11 16 6Z" fill="#22c55e" opacity="0.9"/>
              </svg>
              <span className="text-lg font-semibold tracking-tight text-white">Coppice</span>
            </Link>
            <div className="hidden sm:flex gap-1">
              {navLink("/", "Invest")}
              {navLink("/issue", "Issuer")}
              {navLink("/monitor", "Compliance")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-text-muted hover:text-white hover:bg-surface-3/50 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <WalletButton />
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-surface-2/95 backdrop-blur-md px-4 py-3 flex gap-2">
          {[{ href: "/", label: "Invest" }, { href: "/issue", label: "Issuer" }, { href: "/monitor", label: "Compliance" }].map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className={`flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-bond-green/10 text-bond-green" : "text-text-muted hover:text-white hover:bg-surface-3/50"
                }`}
              >{label}</Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
```

**Step 4: Create WalletButton component**

```tsx
// frontend-next/components/wallet-button.tsx
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { DEMO_WALLETS } from "@/lib/constants";

export function WalletButton() {
  const { address, isConnecting } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const walletLabel = address
    ? DEMO_WALLETS[address.toLowerCase()]?.label || `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  if (address) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 bg-surface-3/80 border border-border rounded-lg px-2.5 py-1.5 sm:px-3">
          <span className="w-2 h-2 rounded-full bg-bond-green animate-pulse-dot" />
          <span className="text-sm font-medium text-white">{walletLabel}</span>
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-text-muted hover:text-bond-red transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isConnecting || isPending}
      className="bg-bond-green text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(34,197,94,0.2)] whitespace-nowrap"
    >
      {isConnecting || isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

**Step 5: Verify dev server**

Run: `cd frontend-next && npm run dev`
Expected: Nav renders with Coppice logo, nav links, Connect Wallet button.

**Step 6: Commit**

```bash
git add frontend-next/providers.tsx frontend-next/app/layout.tsx frontend-next/components/
git commit -m "feat: add providers, layout, nav, and wallet button"
```

---

### Task 5: Port Hooks

**Files:**
- Create: `frontend-next/hooks/use-identity.ts`
- Create: `frontend-next/hooks/use-compliance.ts`
- Create: `frontend-next/hooks/use-hcs-audit.ts`
- Create: `frontend-next/hooks/use-hts.ts`

Port these from the existing frontend hooks, replacing ethers with viem. Reference the current `frontend/src/hooks/` files (which may have been modified by Plan 1).

**Step 1: Create use-identity.ts**

Uses `usePublicClient()` from wagmi for imperative sequential reads.

```typescript
// frontend-next/hooks/use-identity.ts
"use client";

import { usePublicClient } from "wagmi";
import { identityRegistryABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import type { Address } from "viem";

export function useIdentity() {
  const publicClient = usePublicClient();

  const isVerified = async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryABI,
        functionName: "isVerified",
        args: [address],
      });
    } catch {
      return false;
    }
  };

  const getCountry = async (address: Address): Promise<number> => {
    if (!publicClient) return 0;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryABI,
        functionName: "investorCountry",
        args: [address],
      });
    } catch {
      return 0;
    }
  };

  const isRegistered = async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryABI,
        functionName: "contains",
        args: [address],
      });
    } catch {
      return false;
    }
  };

  return { isVerified, getCountry, isRegistered };
}
```

**Step 2: Create use-compliance.ts**

```typescript
// frontend-next/hooks/use-compliance.ts
"use client";

import { usePublicClient } from "wagmi";
import { modularComplianceABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import type { Address } from "viem";

export function useCompliance() {
  const publicClient = usePublicClient();

  const canTransfer = async (from: Address, to: Address, amount: bigint): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.compliance,
        abi: modularComplianceABI,
        functionName: "canTransfer",
        args: [from, to, amount],
      });
    } catch {
      return false;
    }
  };

  return { canTransfer };
}
```

**Step 3: Create use-hcs-audit.ts**

Port from `frontend/src/hooks/useHCSAudit.ts`. This is pure fetch — no ethers or viem needed.

```typescript
// frontend-next/hooks/use-hcs-audit.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { MIRROR_NODE_URL, TOPIC_IDS } from "@/lib/constants";

export interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
  sequenceNumber: number;
  consensusTimestamp: string;
}

export function useHCSAudit(topicType: "audit" | "impact" = "audit") {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSequenceRef = useRef(0);

  const topicId = topicType === "audit" ? TOPIC_IDS.audit : TOPIC_IDS.impact;

  useEffect(() => {
    if (!topicId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMessages() {
      try {
        const url = `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100`;
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const newEvents: AuditEvent[] = [];

        for (const msg of data.messages || []) {
          if (msg.sequence_number <= lastSequenceRef.current) continue;
          try {
            const decoded = atob(msg.message);
            const parsed = JSON.parse(decoded);
            newEvents.push({
              ...parsed,
              sequenceNumber: msg.sequence_number,
              consensusTimestamp: msg.consensus_timestamp,
            });
          } catch {
            // Skip malformed messages
          }
        }

        if (newEvents.length > 0 && !cancelled) {
          lastSequenceRef.current = newEvents[newEvents.length - 1].sequenceNumber;
          setEvents((prev) => [...prev, ...newEvents]);
        }
      } catch {
        // Network error, retry on next poll
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [topicId]);

  return { events, loading };
}
```

**Step 4: Create use-hts.ts**

```typescript
// frontend-next/hooks/use-hts.ts
"use client";

import { useCallback } from "react";
import { MIRROR_NODE_URL, EUSD_TOKEN_ID } from "@/lib/constants";

export function useHTS() {
  const getEusdBalance = useCallback(async (evmAddress: string): Promise<number> => {
    if (!EUSD_TOKEN_ID || !evmAddress) return 0;
    try {
      const accountRes = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
      if (!accountRes.ok) return 0;
      const accountData = await accountRes.json();
      const accountId = accountData.account;

      const balRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
      );
      if (!balRes.ok) return 0;
      const balData = await balRes.json();

      const tokenEntry = balData.tokens?.find(
        (t: { token_id: string; balance: number }) => t.token_id === EUSD_TOKEN_ID
      );
      return tokenEntry ? tokenEntry.balance / 100 : 0;
    } catch {
      return 0;
    }
  }, []);

  return { getEusdBalance };
}
```

**Step 5: Commit**

```bash
git add frontend-next/hooks/
git commit -m "feat: port hooks (identity, compliance, HCS audit, HTS)"
```

---

### Task 6: Port Components

Port all 5 UI components from the old frontend. Reference `frontend/src/components/` (as modified by Plan 1). Replace ethers with viem. Use wagmi hooks.

**Files:**
- Create: `frontend-next/components/bond-details.tsx`
- Create: `frontend-next/components/compliance-status.tsx`
- Create: `frontend-next/components/transfer-flow.tsx`
- Create: `frontend-next/components/project-allocation.tsx`
- Create: `frontend-next/components/audit-event-feed.tsx`

**Step 1: Port each component**

For each component, read the current version from `frontend/src/components/`, then rewrite:
- Replace `import { ethers } from "ethers"` with viem imports (`formatEther`, `parseEther`, `zeroAddress`, etc.)
- Replace `useToken()` with wagmi's `useReadContract` or `useWriteContract`
- Replace `useWallet()` with wagmi's `useAccount()`
- Add `"use client"` directive at top
- No `any` types — use proper viem types

Key patterns:

**bond-details.tsx** — Uses `useReadContract` with `refetchInterval` for totalSupply and paused. No useState/useEffect needed.

**compliance-status.tsx** — Uses `useIdentity()` and `useCompliance()` hooks (imperative style) in a useEffect. Replace `ethers.ZeroAddress` with `zeroAddress`, `ethers.parseEther` with `parseEther`. Use `useAccount()` instead of `useWallet()`.

**transfer-flow.tsx** — Calls `/api/purchase` (backend). Uses `useIdentity()` and `useCompliance()` for steps 1-2. No direct contract writes. Use `useAccount()` for the connected address.

**project-allocation.tsx** — Uses `useHCSAudit("impact")`. No ethers dependency. Mostly JSX.

**audit-event-feed.tsx** — Uses `useHCSAudit("audit")`. No ethers dependency. Mostly JSX with filter buttons.

**Step 2: Verify build**

Run: `cd frontend-next && npm run build`

**Step 3: Commit**

```bash
git add frontend-next/components/
git commit -m "feat: port all UI components to viem+wagmi"
```

---

### Task 7: Port Pages

**Files:**
- Modify: `frontend-next/app/page.tsx` (Investor Portal)
- Create: `frontend-next/app/issue/page.tsx` (Issuer Dashboard)
- Create: `frontend-next/app/monitor/page.tsx` (Compliance Monitor)

**Step 1: Port Investor Portal (app/page.tsx)**

Read current `frontend/src/pages/InvestorPortal.tsx`. Rewrite as a `'use client'` page component using wagmi hooks:

- `useAccount()` instead of `useWallet()`
- `useReadContract` for CPC balance (with `refetchInterval: 10000`)
- `useHTS()` for eUSD balance (manual poll in useEffect)
- `formatEther` from viem

**Step 2: Port Issuer Dashboard (app/issue/page.tsx)**

Read current `frontend/src/pages/IssuerDashboard.tsx`. Key changes:
- `useAccount()` for connected address
- `useReadContract` for `isAgent` and `paused` checks
- `useWriteContract` for mint, freeze, pause operations
- `usePublicClient` for `waitForTransactionReceipt` after writes
- Replace `ethers.parseEther` with `parseEther`
- Role-based UI: check `isAgent` and show "Not Authorized" for non-agents
- Proceeds allocation calls `/api/allocate` instead of faking it
- Error messages: use `err.shortMessage` (viem) instead of `err.reason` (ethers)

**Step 3: Port Compliance Monitor (app/monitor/page.tsx)**

Read current `frontend/src/pages/ComplianceMonitor.tsx`. This page is mostly read-only (HCS events + stats). Minimal changes beyond import updates.

**Step 4: Verify all pages render**

Run: `cd frontend-next && npm run dev`
Check each route: `/`, `/issue`, `/monitor`

**Step 5: Commit**

```bash
git add frontend-next/app/
git commit -m "feat: port all three pages to Next.js"
```

---

### Task 8: Create API Routes

**Files:**
- Create: `frontend-next/app/api/purchase/route.ts`
- Create: `frontend-next/app/api/allocate/route.ts`
- Create: `frontend-next/app/api/health/route.ts`
- Create: `frontend-next/lib/hedera.ts` (shared server-side Hedera client utilities)

**Step 1: Create shared Hedera server utilities**

```typescript
// frontend-next/lib/hedera.ts
// Server-only module — do NOT import from client components.
import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";

export function getClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or DEPLOYER_PRIVATE_KEY");
  }

  const client = Client.forTestnet();
  const keyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringECDSA(keyHex)
  );
  return client;
}

export function getOperatorKey(): PrivateKey {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  const keyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  return PrivateKey.fromStringECDSA(keyHex);
}

export const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";
export const JSON_RPC_URL = process.env.NEXT_PUBLIC_HEDERA_JSON_RPC || "https://testnet.hashio.io/api";
```

**Step 2: Create purchase API route**

Port from `middleware/src/purchase-api.ts`. Use viem (not ethers) for the EVM mint call. Use `@hashgraph/sdk` for HTS transfer.

```typescript
// frontend-next/app/api/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getClient, getOperatorKey, MIRROR_NODE_URL, JSON_RPC_URL } from "@/lib/hedera";
import { tokenABI } from "@/lib/abis";
import { hederaTestnet } from "@/lib/wagmi";

// Build wallet map from env at module level (no hot imports)
function buildWalletKeys(): Map<string, { accountId: string; privateKey: string }> {
  const map = new Map<string, { accountId: string; privateKey: string }>();

  const wallets = [
    { envPrefix: "ALICE", accountIdEnv: "ALICE_ACCOUNT_ID" },
    { envPrefix: "DIANA", accountIdEnv: "DIANA_ACCOUNT_ID" },
    { envPrefix: "DEPLOYER", accountIdEnv: "HEDERA_ACCOUNT_ID" },
  ];

  for (const w of wallets) {
    const pk = process.env[`${w.envPrefix}_PRIVATE_KEY`];
    const accountId = process.env[w.accountIdEnv];
    if (pk && accountId) {
      const keyHex = pk.startsWith("0x") ? pk : `0x${pk}`;
      const account = privateKeyToAccount(keyHex as `0x${string}`);
      map.set(account.address.toLowerCase(), { accountId, privateKey: pk });
    }
  }

  return map;
}

const walletKeys = buildWalletKeys();

async function getEusdBalance(accountId: string): Promise<number> {
  const eusdTokenId = process.env.EUSD_TOKEN_ID;
  if (!eusdTokenId) return 0;
  try {
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${eusdTokenId}`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const entry = data.tokens?.find((t: { token_id: string }) => t.token_id === eusdTokenId);
    return entry ? entry.balance / 100 : 0;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { investorAddress, amount } = body;

  if (!investorAddress || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // 1. Resolve investor
    const walletInfo = walletKeys.get(investorAddress.toLowerCase());
    if (!walletInfo) {
      return NextResponse.json({ error: "Unknown wallet" }, { status: 400 });
    }

    // 2. Check eUSD balance
    const balance = await getEusdBalance(walletInfo.accountId);
    if (balance < amount) {
      return NextResponse.json({ error: `Insufficient eUSD: ${balance} < ${amount}` }, { status: 400 });
    }

    // 3. Transfer eUSD via HTS SDK
    const client = getClient();
    const eusdTokenId = TokenId.fromString(process.env.EUSD_TOKEN_ID!);
    const treasuryAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);

    const investorKey = PrivateKey.fromStringECDSA(
      walletInfo.privateKey.startsWith("0x") ? walletInfo.privateKey.slice(2) : walletInfo.privateKey
    );

    const eusdAmount = Math.round(amount * 100);

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(eusdTokenId, AccountId.fromString(walletInfo.accountId), -eusdAmount)
      .addTokenTransfer(eusdTokenId, treasuryAccountId, eusdAmount)
      .freezeWith(client)
      .sign(investorKey);

    const transferResult = await transferTx.execute(client);
    const transferReceipt = await transferResult.getReceipt(client);

    // 4. Mint CPC via viem
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY!;
    const deployerKeyHex = (deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`) as `0x${string}`;
    const deployerAccount = privateKeyToAccount(deployerKeyHex);

    const walletClient = createWalletClient({
      account: deployerAccount,
      chain: hederaTestnet,
      transport: http(JSON_RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http(JSON_RPC_URL),
    });

    const tokenAddress = process.env.TOKEN_ADDRESS as `0x${string}`;
    const { parseEther } = await import("viem"); // top-level import would be better but parseEther is a pure utility

    const mintHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: tokenABI,
      functionName: "mint",
      args: [investorAddress as `0x${string}`, parseEther(String(amount))],
    });

    const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });

    client.close();

    return NextResponse.json({
      success: true,
      eusdTxId: transferReceipt.transactionId?.toString(),
      mintTxHash: mintReceipt.transactionHash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**NOTE:** The `await import("viem")` on the parseEther line violates the no-hot-imports rule. Move `parseEther` to a top-level import from viem instead. The code sample shows it inline for readability but the implementer MUST use a top-level import.

**Step 3: Create allocate API route**

```typescript
// frontend-next/app/api/allocate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera";

export async function POST(request: NextRequest) {
  const { project, category, amount, currency } = await request.json();

  if (!project || !category || !amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const impactTopicId = process.env.IMPACT_TOPIC_ID;
  if (!impactTopicId) {
    return NextResponse.json({ error: "IMPACT_TOPIC_ID not configured" }, { status: 500 });
  }

  try {
    const client = getClient();
    const operatorKey = getOperatorKey();

    const payload = {
      type: "PROCEEDS_ALLOCATED",
      ts: Date.now(),
      data: { project, category, amount: String(amount), currency: currency || "USD" },
    };

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(impactTopicId))
      .setMessage(JSON.stringify(payload))
      .freezeWith(client)
      .sign(operatorKey);

    const result = await tx.execute(client);
    const receipt = await result.getReceipt(client);
    client.close();

    return NextResponse.json({ success: true, status: receipt.status.toString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Create health route**

```typescript
// frontend-next/app/api/health/route.ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
```

**Step 5: Test API routes**

Run: `cd frontend-next && npm run dev`
Run: `curl http://localhost:3000/api/health` — should return `{"status":"ok"}`

**Step 6: Commit**

```bash
git add frontend-next/app/api/ frontend-next/lib/hedera.ts
git commit -m "feat: add API routes for purchase, allocate, and health"
```

---

### Task 9: Apply Impeccable Design Skills

Now that the port is functional, use impeccable skills to improve quality.

**Step 1: Run `audit` skill**

Invoke: `@audit` on the frontend-next directory.
This generates a report of accessibility, performance, theming, and responsive issues.

**Step 2: Run `polish` skill**

Invoke: `@polish` to fix alignment, spacing, consistency.

**Step 3: Run `clarify` skill**

Invoke: `@clarify` to improve error messages, labels, microcopy.

**Step 4: Run `harden` skill**

Invoke: `@harden` to add error boundaries, handle text overflow, edge cases.

**Step 5: Run `animate` skill**

Invoke: `@animate` to add purposeful micro-interactions (step transitions, loading states).

**Step 6: Commit after each skill**

```bash
git add frontend-next/
git commit -m "style: apply impeccable audit findings"
# ... repeat for each skill
```

---

### Task 10: Port E2E Tests

**Files:**
- Modify: `e2e/playwright.config.ts` (point to Next.js dev server)
- Modify: `e2e/tests/*.spec.ts` (update if any selectors changed)

**Step 1: Update playwright config**

Change the `webServer` config to start Next.js:

```typescript
webServer: {
  command: "cd ../frontend-next && npm run dev",
  port: 3000,
  reuseExistingServer: !process.env.CI,
},
```

Update `baseURL` to `http://localhost:3000`.

**Step 2: Run E2E tests**

Run: `cd e2e && npx playwright test`

Fix any broken selectors. The component structure is the same, so most tests should pass. Common issues:
- Next.js hydration may change timing (increase timeouts if needed)
- API calls go to `/api/purchase` instead of `localhost:3001/api/purchase`

**Step 3: Commit**

```bash
git add e2e/
git commit -m "test: update E2E tests for Next.js frontend"
```

---

### Task 11: Swap Frontend Directories

**Step 1: Rename directories**

Run:
```bash
mv frontend frontend-old
mv frontend-next frontend
```

**Step 2: Update root package.json workspaces**

The workspace entry `"frontend"` stays the same since we just renamed the directory.

**Step 3: Update CLAUDE.md**

Update the Architecture section to reflect Next.js:
- `frontend/`: Next.js App Router + Tailwind CSS. wagmi/viem wallet integration.
- Remove mention of ethers.js
- Add API routes info
- Update commands section

**Step 4: Verify everything works**

Run: `cd frontend && npm run build`
Run: `cd e2e && npx playwright test`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: swap to Next.js frontend, archive old Vite SPA"
```

**Step 6: Delete old frontend (after confirming everything works)**

Run: `rm -rf frontend-old`

```bash
git rm -r frontend-old
git commit -m "chore: remove old Vite SPA frontend"
```

---

### Task 12: Vercel Deployment

**Step 1: Create vercel.json**

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install",
  "framework": "nextjs"
}
```

**Step 2: Configure environment variables in Vercel dashboard**

All `NEXT_PUBLIC_*` vars plus server-side vars (HEDERA_ACCOUNT_ID, private keys, etc.)

**Step 3: Deploy**

Run: `npx vercel --prod` (or link via Vercel dashboard)

**Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config for Next.js"
```

---

## Summary

| # | Task | Scope | Risk |
|---|------|-------|------|
| 1 | Scaffold Next.js | New project | Low |
| 2 | Tailwind theme | CSS | Low |
| 3 | Lib files (wagmi, ABIs, constants) | New files | Low |
| 4 | Providers + Layout + Nav | Core structure | Medium |
| 5 | Port hooks | 4 files | Low |
| 6 | Port components | 5 files | Medium |
| 7 | Port pages | 3 files | **High** — most complex |
| 8 | API routes | 4 files | **High** — server-side Hedera SDK |
| 9 | Impeccable skills | Design quality | Low risk, high impact |
| 10 | Port E2E tests | Test config | Medium |
| 11 | Swap directories | Repo structure | Low |
| 12 | Vercel deployment | DevOps | Low |

**Total new files:** ~25
**Files ported from old frontend:** ~15 (rewritten, not copied)
**Lines of ethers.js removed:** All of them
