# Frontend Viem Port

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ethers.js with viem + wagmi in the frontend. This gives us type-safe contract reads/writes, automatic caching, React hooks for contract interaction, and native EIP-1193 wallet management (eliminating our manual WalletProvider).

**Architecture:** Install `viem` and `wagmi` + `@tanstack/react-query`. Replace the manual `WalletProvider` with wagmi's `WagmiProvider` + `QueryClientProvider`. Replace `useToken`, `useIdentity`, `useCompliance` hooks with wagmi's `useReadContract` / `useWriteContract`. Replace `useHTS` with direct `fetch` (already using REST API — no ethers dependency). Keep `useHCSAudit` as-is (already using fetch). Import ABIs from `contracts/exports/abis.ts` (created in Plan 2).

**Tech Stack:** viem, wagmi v2, @tanstack/react-query, React 19, Vite 8

**Typecasting rule:** Do not typecast (`as any`, `as Type`) unless explicitly instructed. If a typecast is absolutely unavoidable, include a clear comment explaining why. Prefer fixing the underlying type issue instead. The `as Address` casts in this plan's code samples are placeholders where the implementer should prefer narrowing via conditional checks (e.g., `if (!account) return` before using `account`).

**Dependencies on Plan 2:** This plan imports ABIs from `contracts/exports/abis.ts`. If Plan 2 hasn't been executed yet, create the ABIs locally in the frontend (same content, just in `frontend/src/lib/abis.ts`).

**IMPORTANT — Pre-execution review:** The low-hanging fruit plan (Plan 1) modifies several frontend files including `TransferFlow.tsx`, `IssuerDashboard.tsx`, `BondDetails.tsx`, `ComplianceStatus.tsx`, `constants.ts`, and hooks (`useToken.ts`, `useIdentity.ts`, `useCompliance.ts`). Before starting this plan, re-read all frontend source files and revise any task steps that conflict with changes made by Plan 1. The provider singleton (`frontend/src/lib/provider.ts`) created in Plan 1 will be deleted by this plan since wagmi replaces it.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install viem, wagmi, and tanstack query**

Run:
```bash
cd frontend && npm install viem wagmi @tanstack/react-query
```

**Step 2: Remove ethers**

Run:
```bash
cd frontend && npm uninstall ethers
```

**Step 3: Verify package.json looks correct**

Expected new deps: `viem`, `wagmi`, `@tanstack/react-query`
Expected removed: `ethers`

**Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: swap ethers for viem+wagmi in frontend"
```

---

### Task 2: Create Wagmi Config + ABIs

**Files:**
- Create: `frontend/src/lib/wagmi.ts`
- Create: `frontend/src/lib/abis.ts` (if not importing from contracts workspace)
- Modify: `frontend/src/lib/contracts.ts` (delete or replace)
- Modify: `frontend/src/lib/provider.ts` (delete — replaced by wagmi)

**Step 1: Create ABIs file**

Use the typed ABI format (`as const`) for full type inference with viem.

```typescript
// frontend/src/lib/abis.ts
export const TokenABI = [
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

export const IdentityRegistryABI = [
  { type: "function", name: "isVerified", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "identity", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "investorCountry", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "uint16" }], stateMutability: "view" },
  { type: "function", name: "contains", inputs: [{ name: "addr", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

export const ModularComplianceABI = [
  { type: "function", name: "canTransfer", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;
```

**Step 2: Create wagmi config**

```typescript
// frontend/src/lib/wagmi.ts
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_HEDERA_JSON_RPC || "https://testnet.hashio.io/api"],
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
```

**Step 3: Delete old files**

Delete `frontend/src/lib/contracts.ts` and `frontend/src/lib/provider.ts` — they're replaced by the wagmi config and ABIs.

**Step 4: Update constants.ts**

Remove `JSON_RPC_URL` (now in wagmi config). Keep everything else:

```typescript
// frontend/src/lib/constants.ts
export const HEDERA_CHAIN_ID = 296;
export const MIRROR_NODE_URL = import.meta.env.VITE_HEDERA_MIRROR_NODE || "https://testnet.mirrornode.hedera.com";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const CONTRACT_ADDRESSES = {
  token: (import.meta.env.VITE_TOKEN_ADDRESS || "") as `0x${string}`,
  identityRegistry: (import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || "") as `0x${string}`,
  compliance: (import.meta.env.VITE_COMPLIANCE_ADDRESS || "") as `0x${string}`,
};

export const TOPIC_IDS = {
  audit: import.meta.env.VITE_AUDIT_TOPIC_ID || "",
  impact: import.meta.env.VITE_IMPACT_TOPIC_ID || "",
};

export const EUSD_TOKEN_ID = import.meta.env.VITE_EUSD_TOKEN_ID || "";

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

**Step 5: Commit**

```bash
git add frontend/src/lib/
git rm frontend/src/lib/contracts.ts frontend/src/lib/provider.ts
git commit -m "feat: add wagmi config and typed ABIs"
```

---

### Task 3: Replace WalletProvider with Wagmi

**Files:**
- Modify: `frontend/src/providers/WalletProvider.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Rewrite WalletProvider**

The current WalletProvider manually manages account, provider, signer state and MetaMask event listeners. Wagmi handles all of this automatically via `useAccount`, `useConnect`, `useDisconnect`.

We'll keep the `WalletProvider` component name and `useWallet` hook for minimal downstream churn, but implement them with wagmi internally.

```typescript
// frontend/src/providers/WalletProvider.tsx
import { createContext, useContext, type ReactNode } from "react";
import { WagmiProvider, useAccount, useConnect, useDisconnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import { DEMO_WALLETS } from "../lib/constants";

const queryClient = new QueryClient();

interface WalletContextType {
  account: `0x${string}` | null;
  chainId: number | undefined;
  walletLabel: string;
  connect: () => void;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  chainId: undefined,
  walletLabel: "",
  connect: () => {},
  disconnect: () => {},
  isConnecting: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

function WalletContextBridge({ children }: { children: ReactNode }) {
  const { address, chainId, isConnecting: accountConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const account = address ?? null;
  const walletLabel = account
    ? DEMO_WALLETS[account.toLowerCase()]?.label || `${account.slice(0, 6)}...${account.slice(-4)}`
    : "";

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === "injected");
    if (injected) {
      connect({ connector: injected });
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        walletLabel,
        connect: handleConnect,
        disconnect,
        isConnecting: accountConnecting || isPending,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletContextBridge>{children}</WalletContextBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**Note:** The old WalletProvider had `provider` and `signer` in the context. These are no longer needed — wagmi handles transaction signing internally via `useWriteContract`. Any component that used `signer` directly will be rewritten in subsequent tasks.

**Step 2: Update App.tsx**

No changes needed to `App.tsx` — it already wraps with `<WalletProvider>` and uses `useWallet()` in `WalletButton`. The interface is compatible.

**Step 3: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`

There will be errors from hooks that still import ethers. That's expected — we fix those in the next tasks.

**Step 4: Commit (may not build yet)**

```bash
git add frontend/src/providers/WalletProvider.tsx
git commit -m "refactor: replace manual WalletProvider with wagmi"
```

---

### Task 4: Rewrite useToken Hook

**Files:**
- Modify: `frontend/src/hooks/useToken.ts`

**Step 1: Rewrite with wagmi hooks**

```typescript
// frontend/src/hooks/useToken.ts
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { TokenABI } from "../lib/abis";
import { CONTRACT_ADDRESSES } from "../lib/constants";
import { useWallet } from "../providers/WalletProvider";

const tokenAddress = CONTRACT_ADDRESSES.token;

export function useTokenRead() {
  const totalSupply = useReadContract({
    address: tokenAddress,
    abi: TokenABI,
    functionName: "totalSupply",
    query: { refetchInterval: 10000 },
  });

  const paused = useReadContract({
    address: tokenAddress,
    abi: TokenABI,
    functionName: "paused",
    query: { refetchInterval: 10000 },
  });

  return { totalSupply, paused };
}

export function useTokenBalance(address: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: TokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

export function useIsAgent(address: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: TokenABI,
    functionName: "isAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTokenWrite() {
  const { writeContractAsync, isPending } = useWriteContract();

  const mint = async (to: Address, amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: TokenABI,
      functionName: "mint",
      args: [to, amount],
    });
    return hash;
  };

  const pause = async () => {
    return writeContractAsync({
      address: tokenAddress,
      abi: TokenABI,
      functionName: "pause",
    });
  };

  const unpause = async () => {
    return writeContractAsync({
      address: tokenAddress,
      abi: TokenABI,
      functionName: "unpause",
    });
  };

  const setAddressFrozen = async (addr: Address, freeze: boolean) => {
    return writeContractAsync({
      address: tokenAddress,
      abi: TokenABI,
      functionName: "setAddressFrozen",
      args: [addr, freeze],
    });
  };

  const transfer = async (to: Address, amount: bigint) => {
    return writeContractAsync({
      address: tokenAddress,
      abi: TokenABI,
      functionName: "transfer",
      args: [to, amount],
    });
  };

  return { mint, pause, unpause, setAddressFrozen, transfer, loading: isPending };
}
```

**Key changes from ethers version:**
- No manual `JsonRpcProvider` — wagmi handles the transport
- `useReadContract` replaces manual `readContract.balanceOf()` calls
- `refetchInterval: 10000` replaces our manual `setInterval` polling
- `useWriteContract` replaces `getTokenContract(signer).mint()` pattern
- Separate `useTokenRead`, `useTokenBalance`, `useIsAgent`, `useTokenWrite` hooks instead of one monolithic `useToken`

**Step 2: Commit**

```bash
git add frontend/src/hooks/useToken.ts
git commit -m "refactor: rewrite useToken with wagmi hooks"
```

---

### Task 5: Rewrite useIdentity and useCompliance Hooks

**Files:**
- Modify: `frontend/src/hooks/useIdentity.ts`
- Modify: `frontend/src/hooks/useCompliance.ts`

**Step 1: Rewrite useIdentity**

```typescript
// frontend/src/hooks/useIdentity.ts
import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { IdentityRegistryABI } from "../lib/abis";
import { CONTRACT_ADDRESSES } from "../lib/constants";

export function useIdentity() {
  const publicClient = usePublicClient();

  const isVerified = async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: IdentityRegistryABI,
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
        abi: IdentityRegistryABI,
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
        abi: IdentityRegistryABI,
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

**Note:** We use `usePublicClient()` + manual `readContract` calls instead of `useReadContract` because ComplianceStatus runs checks sequentially (4 calls with conditional logic between them). The declarative `useReadContract` hook can't express this sequential flow. This is the right pattern for imperative multi-step operations.

**Step 2: Rewrite useCompliance**

```typescript
// frontend/src/hooks/useCompliance.ts
import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { ModularComplianceABI } from "../lib/abis";
import { CONTRACT_ADDRESSES } from "../lib/constants";

export function useCompliance() {
  const publicClient = usePublicClient();

  const canTransfer = async (from: Address, to: Address, amount: bigint): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.compliance,
        abi: ModularComplianceABI,
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

**Step 3: Commit**

```bash
git add frontend/src/hooks/useIdentity.ts frontend/src/hooks/useCompliance.ts
git commit -m "refactor: rewrite useIdentity and useCompliance with viem"
```

---

### Task 6: Update All Components

Now update every component that imports ethers or the old hooks.

**Files:**
- Modify: `frontend/src/components/BondDetails.tsx`
- Modify: `frontend/src/components/ComplianceStatus.tsx`
- Modify: `frontend/src/components/TransferFlow.tsx`
- Modify: `frontend/src/pages/InvestorPortal.tsx`
- Modify: `frontend/src/pages/IssuerDashboard.tsx`

**Step 1: Update BondDetails.tsx**

Replace ethers imports with wagmi hooks. The old component used `useToken().totalSupply()` and `useToken().paused()` in a useEffect. With wagmi, these are declarative:

```typescript
// frontend/src/components/BondDetails.tsx
import { useTokenRead } from "../hooks/useToken";
import { BOND_DETAILS } from "../lib/constants";
import { formatEther } from "viem";

export function BondDetails() {
  const { totalSupply, paused } = useTokenRead();

  const supply = totalSupply.data != null
    ? Number(formatEther(totalSupply.data)).toLocaleString("en-US")
    : "--";
  const isPaused = paused.data ?? null;

  return (
    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">
      {/* ... keep entire JSX as-is, just use `supply` and `isPaused` variables ... */}
      {/* The JSX doesn't change — only data sourcing changed */}
      <div className="bg-gradient-to-r from-bond-green/8 to-transparent px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-bond-green/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{BOND_DETAILS.name}</h1>
            <p className="text-xs text-text-muted">{BOND_DETAILS.issuer}</p>
          </div>
        </div>
        {isPaused !== null && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPaused ? "bg-bond-red/15 text-bond-red" : "bg-bond-green/15 text-bond-green"}`}>
            {isPaused ? "Paused" : "Active"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-5">
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Symbol</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.symbol}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Coupon Rate</p>
          <p className="text-lg font-mono font-semibold text-bond-green">{BOND_DETAILS.couponRate}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Maturity</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.maturity}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Total Supply</p>
          <p className="text-lg font-mono font-semibold text-white">{supply} <span className="text-xs text-text-muted font-normal">CPC</span></p>
        </div>
      </div>
    </div>
  );
}
```

No more `useState`, `useEffect`, or manual polling — wagmi's `refetchInterval` handles it.

**Step 2: Update ComplianceStatus.tsx**

Replace `import { ethers } from "ethers"` with `import { zeroAddress, parseEther, type Address } from "viem"`. The sequential check logic stays the same — we use the imperative `useIdentity()` and `useCompliance()` hooks.

Key replacements:
- `ethers.ZeroAddress` → `zeroAddress`
- `ethers.parseEther("1")` → `parseEther("1")`
- `account!` type → `account as Address`

**Step 3: Update TransferFlow.tsx**

Already mostly updated in Plan 1 (Task 4) to call the backend API. Just remove any remaining ethers imports:
- Remove `import { ethers } from "ethers"` — replace `ethers.ZeroAddress` with `zeroAddress` and `ethers.parseEther` with `parseEther`
- The `useToken` import is already removed (Plan 1 Task 4 removes it since mint is now backend-side)

**Step 4: Update InvestorPortal.tsx**

Replace balance fetching with wagmi hooks:

```typescript
// frontend/src/pages/InvestorPortal.tsx
import { BondDetails } from "../components/BondDetails";
import { ComplianceStatus } from "../components/ComplianceStatus";
import { TransferFlow } from "../components/TransferFlow";
import { useWallet } from "../providers/WalletProvider";
import { useTokenBalance } from "../hooks/useToken";
import { useHTS } from "../hooks/useHTS";
import { useState } from "react";
import { formatEther, type Address } from "viem";

export function InvestorPortal() {
  const { account } = useWallet();
  const [eligible, setEligible] = useState(false);
  const { data: cpcBalanceRaw } = useTokenBalance(account as Address | undefined);
  const { getEusdBalance } = useHTS();
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  const cpcBalance = cpcBalanceRaw != null
    ? Number(formatEther(cpcBalanceRaw)).toLocaleString("en-US")
    : "--";

  // eUSD still uses Mirror Node REST (useHTS hook) — poll manually
  useState(() => {
    if (!account) return;
    const load = async () => {
      const eusd = await getEusdBalance(account);
      setEusdBalance(eusd.toLocaleString("en-US", { minimumFractionDigits: 2 }));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  });

  // ... rest of JSX stays the same
}
```

Wait — the above uses `useState` for an effect, which is wrong. Use `useEffect`:

```typescript
import { useState, useEffect } from "react";
// ...

useEffect(() => {
  if (!account) {
    setEusdBalance("--");
    return;
  }
  const load = async () => {
    const eusd = await getEusdBalance(account);
    setEusdBalance(eusd.toLocaleString("en-US", { minimumFractionDigits: 2 }));
  };
  load();
  const interval = setInterval(load, 10000);
  return () => clearInterval(interval);
}, [account]);
```

CPC balance polling is now handled by wagmi's `refetchInterval: 10000` in `useTokenBalance`. No manual effect needed.

**Step 5: Update IssuerDashboard.tsx**

Replace ethers imports. The write functions (mint, pause, etc.) use `useTokenWrite()`:

Key changes:
- `import { ethers } from "ethers"` → `import { parseEther, type Address } from "viem"`
- `const { mint, pause, unpause, paused, setAddressFrozen, isAgent, loading } = useToken()` → split into `useTokenRead()`, `useTokenWrite()`, `useIsAgent(account)`
- `ethers.parseEther(mintAmount)` → `parseEther(mintAmount)`
- `await mint(mintTo, ...)` stays the same shape, but now returns a tx hash, need to wait for receipt

The write functions from `useTokenWrite` return tx hashes. To wait for confirmation, use wagmi's `useWaitForTransactionReceipt` or just `publicClient.waitForTransactionReceipt`.

For simplicity in the dashboard (where we show success/error immediately after tx), keep the imperative pattern:

```typescript
const publicClient = usePublicClient();

async function handleMint() {
  if (!mintTo || !mintAmount) return;
  setMintStatus(null);
  try {
    const hash = await mint(mintTo as Address, parseEther(mintAmount));
    await publicClient!.waitForTransactionReceipt({ hash });
    setMintStatus({ type: "success", msg: `Minted ${mintAmount} CPC to ${mintTo.slice(0, 10)}...` });
    setMintTo("");
    setMintAmount("");
  } catch (err: any) {
    setMintStatus({ type: "error", msg: err.shortMessage || err.message?.slice(0, 80) || "Mint failed" });
  }
}
```

Note: viem errors use `err.shortMessage` instead of `err.reason`.

**Step 6: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 7: Commit**

```bash
git add frontend/src/
git commit -m "refactor: port all frontend components to viem+wagmi"
```

---

### Task 7: Update useHTS Hook

**Files:**
- Modify: `frontend/src/hooks/useHTS.ts`

This hook already uses `fetch` for Mirror Node REST calls — no ethers dependency. Just remove the unused state:

```typescript
// frontend/src/hooks/useHTS.ts
import { useCallback } from "react";
import { MIRROR_NODE_URL, EUSD_TOKEN_ID } from "../lib/constants";

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

      const tokenEntry = balData.tokens?.find((t: any) => t.token_id === EUSD_TOKEN_ID);
      return tokenEntry ? tokenEntry.balance / 100 : 0;
    } catch {
      return 0;
    }
  }, []);

  return { getEusdBalance };
}
```

Removed: `useState(false)` for `loading` and the `setLoading` calls — they were unused downstream anyway.

**Step 1: Commit**

```bash
git add frontend/src/hooks/useHTS.ts
git commit -m "refactor: clean up useHTS hook (remove unused loading state)"
```

---

### Task 8: Update E2E Wallet Mock

**Files:**
- Modify: `e2e/fixtures/wallet-mock.ts`

The E2E wallet mock injects a fake `window.ethereum` EIP-1193 provider. Since wagmi also uses EIP-1193, the mock should still work — it responds to `eth_requestAccounts`, `eth_chainId`, `eth_call`, and `eth_sendTransaction`.

However, wagmi may call additional methods. Test first:

**Step 1: Run E2E tests without changes**

Run: `cd e2e && npx playwright test`

If tests pass, the mock is compatible. If they fail, check which RPC methods wagmi calls that the mock doesn't handle, and add them.

Common additional methods wagmi may call:
- `wallet_switchEthereumChain` — mock should respond with success
- `eth_getBalance` — mock can return "0x0"
- `eth_blockNumber` — mock can return a recent block

**Step 2: Fix any mock gaps and commit**

```bash
git add e2e/fixtures/wallet-mock.ts
git commit -m "fix: update E2E wallet mock for wagmi compatibility"
```

---

### Task 9: Final Verification + Cleanup

**Step 1: Verify no ethers references remain in frontend**

Run: `grep -r "from \"ethers\"" frontend/src/` — should return nothing
Run: `grep -r "from 'ethers'" frontend/src/` — should return nothing

**Step 2: Verify build**

Run: `cd frontend && npx tsc -b && npx vite build`
Expected: 0 errors

**Step 3: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All pass

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: finalize frontend viem migration"
```

---

## Summary

| # | Task | Scope | Risk |
|---|------|-------|------|
| 1 | Install deps | Config | Low |
| 2 | Wagmi config + ABIs | New files | Low |
| 3 | WalletProvider → wagmi | 1 file | Medium — context shape change |
| 4 | useToken → wagmi hooks | 1 file | Medium — API shape change |
| 5 | useIdentity/useCompliance → viem | 2 files | Low — same imperative pattern |
| 6 | Update all components | 5 files | **High** — most code changes |
| 7 | Clean useHTS | 1 file | Trivial |
| 8 | E2E mock updates | 1 file | Medium — wagmi may need different mock responses |
| 9 | Verification | Tests | Low |

**Breaking changes to watch for:**
- `account` type changes from `string | null` to `` `0x${string}` | null `` — may need casts in some places
- `useToken()` splits into `useTokenRead()`, `useTokenBalance()`, `useIsAgent()`, `useTokenWrite()` — all consumers must be updated
- Error messages change from `err.reason` to `err.shortMessage` (viem pattern)
- `signer` is removed from WalletProvider context — any code using `signer` directly must switch to wagmi write hooks
