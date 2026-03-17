# Five Pages + E2E Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the 5-page app (Invest, Coupons, Impact, Issuer, Compliance), add coupon distribution API, fix E2E tests, and clean up shortcuts from the ATS migration.

**Architecture:** Two new pages (`/coupons`, `/impact`) following existing patterns (hooks + React Query + ethers v6 contract reads). Coupons page reads coupon data from the ATS bond contract and distribution history from LCCF. Impact page is stubbed with mock data (Guardian integration deferred). Issuer page gets coupon management controls. Nav updated to 5 tabs. E2E wallet mock is already compatible with AtsContext — just need to update stale comments and verify tests pass. All new pages get unit tests and E2E tests.

**Tech Stack:** Next.js 16 App Router, ethers v6, TanStack React Query, Tailwind CSS v4, vitest, Playwright

---

## Task 1: Update Nav to 5 Tabs

**Files:**
- Modify: `frontend/components/nav.tsx`
- Test: `frontend/__tests__/components/nav.test.tsx` (create)

**Step 1: Write the failing test**

Create `frontend/__tests__/components/nav.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock the wallet button
vi.mock("@/components/wallet-button", () => ({
  WalletButton: () => <button>Mock Wallet</button>,
}));

// Mock the ATS context
vi.mock("@/contexts/ats-context", () => ({
  useConnection: () => ({ address: undefined, isConnected: false }),
  useAts: () => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import { Nav } from "@/components/nav";

describe("Nav", () => {
  it("renders all 5 navigation links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Invest" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coupons" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impact" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Issuer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compliance" })).toBeInTheDocument();
  });

  it("links to correct paths", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Coupons" })).toHaveAttribute("href", "/coupons");
    expect(screen.getByRole("link", { name: "Impact" })).toHaveAttribute("href", "/impact");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/components/nav.test.tsx`
Expected: FAIL — only 3 links exist (Invest, Issuer, Compliance)

**Step 3: Update nav.tsx**

In `frontend/components/nav.tsx`, add Coupons and Impact links in both desktop and mobile nav:

Desktop nav (inside `<div className="hidden sm:flex gap-1">`):
```tsx
<Link href="/" className={navLinkClass("/")}>Invest</Link>
<Link href="/coupons" className={navLinkClass("/coupons")}>Coupons</Link>
<Link href="/impact" className={navLinkClass("/impact")}>Impact</Link>
<Link href="/issue" className={navLinkClass("/issue")}>Issuer</Link>
<Link href="/monitor" className={navLinkClass("/monitor")}>Compliance</Link>
```

Mobile nav (the array in the hamburger menu):
```tsx
{[
  { href: "/", label: "Invest" },
  { href: "/coupons", label: "Coupons" },
  { href: "/impact", label: "Impact" },
  { href: "/issue", label: "Issuer" },
  { href: "/monitor", label: "Compliance" },
].map(({ href, label }) => {
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/components/nav.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/components/nav.tsx frontend/__tests__/components/nav.test.tsx
git commit -m "feat: add Coupons and Impact tabs to navigation"
```

---

## Task 2: Create Coupon Bond Hook

**Files:**
- Create: `frontend/hooks/use-coupons.ts`
- Test: `frontend/__tests__/hooks/use-coupons.test.ts` (create)

**Step 1: Write the failing test**

Create `frontend/__tests__/hooks/use-coupons.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// Mock ethers
vi.mock("ethers", () => {
  const mockContract = {
    getCouponCount: vi.fn().mockResolvedValue(2n),
    getCoupon: vi.fn().mockImplementation((id: bigint) => {
      const now = Math.floor(Date.now() / 1000);
      if (id === 0n) {
        return Promise.resolve({
          coupon: {
            recordDate: BigInt(now - 86400),
            executionDate: BigInt(now - 43200),
            startDate: BigInt(now - 90 * 86400),
            endDate: BigInt(now - 86400),
            fixingDate: BigInt(now - 86400),
            rate: 425n,
            rateDecimals: 4,
            rateStatus: 1,
          },
          snapshotId: 1n,
        });
      }
      return Promise.resolve({
        coupon: {
          recordDate: BigInt(now + 86400 * 170),
          executionDate: BigInt(now + 86400 * 180),
          startDate: BigInt(now),
          endDate: BigInt(now + 86400 * 180),
          fixingDate: BigInt(now + 86400 * 170),
          rate: 425n,
          rateDecimals: 4,
          rateStatus: 1,
        },
        snapshotId: 0n,
      });
    }),
  };
  return {
    ethers: {
      JsonRpcProvider: vi.fn().mockReturnValue({}),
      Contract: vi.fn().mockReturnValue(mockContract),
    },
  };
});

import { useCoupons } from "@/hooks/use-coupons";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCoupons", () => {
  it("returns coupon data from the bond contract", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(2);
  });

  it("formats rate as percentage string", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // rate=425 / 10^4 = 0.0425 = 4.25%
    expect(result.current.data![0].rateDisplay).toBe("4.25%");
  });

  it("identifies past vs upcoming coupons", async () => {
    const { result } = renderHook(() => useCoupons(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data![0].status).toBe("paid");
    expect(result.current.data![1].status).toBe("upcoming");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/hooks/use-coupons.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the hook**

Create `frontend/hooks/use-coupons.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { JSON_RPC_URL, CPC_SECURITY_ID } from "@/lib/constants";

const BOND_ABI = [
  "function getCouponCount() view returns (uint256)",
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
];

export interface CouponInfo {
  id: number;
  recordDate: number;
  executionDate: number;
  startDate: number;
  endDate: number;
  rate: number;
  rateDecimals: number;
  rateDisplay: string;
  snapshotId: number;
  status: "upcoming" | "record" | "executable" | "paid";
  periodDays: number;
}

function getCouponStatus(coupon: { recordDate: number; executionDate: number }): CouponInfo["status"] {
  const now = Math.floor(Date.now() / 1000);
  if (now < coupon.recordDate) return "upcoming";
  if (now < coupon.executionDate) return "record";
  // If past execution date, consider it paid (or at least executable)
  return "paid";
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons", CPC_SECURITY_ID],
    queryFn: async (): Promise<CouponInfo[]> => {
      const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
      const bond = new ethers.Contract(CPC_SECURITY_ID, BOND_ABI, provider);

      const count = await bond.getCouponCount();
      const countNum = Number(count);
      if (countNum === 0) return [];

      const coupons: CouponInfo[] = [];
      for (let i = 0; i < countNum; i++) {
        const registered = await bond.getCoupon(i);
        const c = registered.coupon;
        const rate = Number(c.rate);
        const rateDecimals = Number(c.rateDecimals);
        const rateValue = rate / 10 ** rateDecimals;
        const rateDisplay = `${(rateValue * 100).toFixed(rateDecimals > 2 ? rateDecimals - 2 : 2)}%`;

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
          rateDisplay,
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
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/hooks/use-coupons.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/hooks/use-coupons.ts frontend/__tests__/hooks/use-coupons.test.ts
git commit -m "feat: add useCoupons hook for reading bond coupon data"
```

---

## Task 3: Create Distribute Coupon API Route

**Files:**
- Create: `frontend/app/api/issuer/distribute-coupon/route.ts`
- Test: `frontend/__tests__/api/distribute-coupon.test.ts` (create)

**Step 1: Write the failing test**

Create `frontend/__tests__/api/distribute-coupon.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock deployer module
const mockWait = vi.fn().mockResolvedValue({ hash: "0xabc", status: 1 });
const mockExecuteDistribution = vi.fn().mockResolvedValue({ wait: mockWait });
const mockTakeSnapshot = vi.fn().mockResolvedValue({ wait: mockWait });
const mockGetCoupon = vi.fn().mockResolvedValue({
  coupon: {
    recordDate: BigInt(Math.floor(Date.now() / 1000) - 3600),
    executionDate: BigInt(Math.floor(Date.now() / 1000) - 1800),
    startDate: 0n,
    endDate: 0n,
    fixingDate: 0n,
    rate: 425n,
    rateDecimals: 4,
    rateStatus: 1,
  },
  snapshotId: 1n,
});

vi.mock("ethers", () => ({
  ethers: {
    Contract: vi.fn().mockReturnValue({
      getCoupon: mockGetCoupon,
      takeSnapshot: mockTakeSnapshot,
      executeDistribution: mockExecuteDistribution,
    }),
    Wallet: vi.fn().mockReturnValue({
      address: "0xdeployer",
    }),
    JsonRpcProvider: vi.fn(),
    Interface: vi.fn().mockReturnValue({
      parseLog: vi.fn().mockReturnValue(null),
    }),
  },
}));

vi.mock("@/lib/deployer", () => ({
  getDeployerWallet: vi.fn().mockReturnValue({
    address: "0xdeployer",
  }),
  getServerProvider: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyAuthSignature: vi.fn().mockResolvedValue(true),
}));

import { POST } from "@/app/api/issuer/distribute-coupon/route";

describe("POST /api/issuer/distribute-coupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing couponId", async () => {
    const req = new Request("http://localhost/api/issuer/distribute-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "0xabc", signature: "0xsig" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful distribution", async () => {
    const req = new Request("http://localhost/api/issuer/distribute-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        couponId: 0,
        address: "0xdeployer",
        signature: "0xvalidsig",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/api/distribute-coupon.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the API route**

Create `frontend/app/api/issuer/distribute-coupon/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { getDeployerWallet } from "@/lib/deployer";
import { verifyAuthSignature } from "@/lib/auth";

const requestSchema = z.object({
  couponId: z.number().int().min(0),
  address: z.string().min(1),
  signature: z.string().min(1),
});

const CPC_ADDRESS = process.env.NEXT_PUBLIC_CPC_SECURITY_ID!;
const LCCF_ADDRESS = process.env.LIFECYCLE_CASH_FLOW_ADDRESS!;

const BOND_ABI = [
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
  "function takeSnapshot() returns (uint256)",
];

const LCCF_ABI = [
  "function executeDistribution(address asset, uint256 distributionID, uint256 pageIndex, uint256 pageLength) returns (address[], address[], uint256[], bool)",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { couponId, address, signature } = parsed.data;

    // Verify auth
    const isValid = await verifyAuthSignature(address, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const wallet = getDeployerWallet();
    const bond = new ethers.Contract(CPC_ADDRESS, BOND_ABI, wallet);
    const lccf = new ethers.Contract(LCCF_ADDRESS, LCCF_ABI, wallet);

    // Check coupon state
    const registered = await bond.getCoupon(couponId);
    const now = Math.floor(Date.now() / 1000);

    if (now < Number(registered.coupon.executionDate)) {
      return NextResponse.json(
        { error: "Coupon execution date has not been reached" },
        { status: 400 }
      );
    }

    // If snapshot hasn't been taken yet, take it
    if (registered.snapshotId === 0n) {
      const snapshotTx = await bond.takeSnapshot({ gasLimit: 3_000_000 });
      await snapshotTx.wait();
    }

    // Execute distribution
    const tx = await lccf.executeDistribution(
      CPC_ADDRESS,
      couponId,
      0,   // pageIndex
      100, // pageLength
      { gasLimit: 10_000_000 }
    );
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      status: receipt.status === 1 ? "success" : "failed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Distribution failed";
    console.error("distribute-coupon error:", message);
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/api/distribute-coupon.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/api/issuer/distribute-coupon/route.ts frontend/__tests__/api/distribute-coupon.test.ts
git commit -m "feat: add distribute-coupon API route for LCCF payouts"
```

---

## Task 4: Build Coupons Page

**Files:**
- Create: `frontend/app/coupons/page.tsx`
- Test: `frontend/__tests__/pages/coupons.test.tsx` (create)

**Step 1: Write the failing test**

Create `frontend/__tests__/pages/coupons.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

vi.mock("@/contexts/ats-context", () => ({
  useConnection: () => ({ address: "0xalice", isConnected: true }),
  useAts: () => ({
    address: "0xalice",
    isConnected: true,
    isConnecting: false,
    provider: null,
    signer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-coupons", () => ({
  useCoupons: () => ({
    data: [
      {
        id: 0,
        recordDate: Math.floor(Date.now() / 1000) - 86400,
        executionDate: Math.floor(Date.now() / 1000) - 43200,
        startDate: Math.floor(Date.now() / 1000) - 180 * 86400,
        endDate: Math.floor(Date.now() / 1000) - 86400,
        rate: 425,
        rateDecimals: 4,
        rateDisplay: "4.25%",
        snapshotId: 1,
        status: "paid" as const,
        periodDays: 180,
      },
      {
        id: 1,
        recordDate: Math.floor(Date.now() / 1000) + 170 * 86400,
        executionDate: Math.floor(Date.now() / 1000) + 180 * 86400,
        startDate: Math.floor(Date.now() / 1000),
        endDate: Math.floor(Date.now() / 1000) + 180 * 86400,
        rate: 425,
        rateDecimals: 4,
        rateDisplay: "4.25%",
        snapshotId: 0,
        status: "upcoming" as const,
        periodDays: 180,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-token", () => ({
  useTokenBalance: () => ({ data: 1000000000000000000000n }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

import CouponsPage from "@/app/coupons/page";

describe("Coupons Page", () => {
  it("renders the page title", () => {
    render(createElement(CouponsPage), { wrapper });
    expect(screen.getByText("Coupon Schedule")).toBeInTheDocument();
  });

  it("displays coupon rate", () => {
    render(createElement(CouponsPage), { wrapper });
    expect(screen.getAllByText("4.25%").length).toBeGreaterThan(0);
  });

  it("shows coupon status badges", () => {
    render(createElement(CouponsPage), { wrapper });
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("shows yield summary section", () => {
    render(createElement(CouponsPage), { wrapper });
    expect(screen.getByText("Yield Summary")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/pages/coupons.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement the Coupons page**

Create `frontend/app/coupons/page.tsx`. This page should:

- Show a "Yield Summary" banner (full-bleed, like bond-details) with: annual rate, next coupon date, estimated annual yield based on connected wallet's CPC balance
- Show a coupon schedule table: one row per coupon from the bond contract, with columns: Period (start–end dates), Rate, Status badge (Upcoming/Record/Executable/Paid), Record Date, Execution Date
- Use the `useCoupons()` hook for data
- Use `useTokenBalance(address)` to calculate estimated yield
- Follow existing styling: `card-flush` for the banner, `card` for the table, `animate-entrance` with `--index` stagger, `stat-label` for labels, `font-mono` for data values
- Show EmptyState with WalletIcon if not connected (consistent with Invest page)

The page should be roughly 150-200 lines. Use the BondDetails component as a reference for the banner layout, and the HoldersTable component as a reference for the table layout.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/pages/coupons.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/coupons/page.tsx frontend/__tests__/pages/coupons.test.tsx
git commit -m "feat: add Coupons page with schedule and yield summary"
```

---

## Task 5: Build Impact Page (Stubbed)

**Files:**
- Create: `frontend/app/impact/page.tsx`
- Test: `frontend/__tests__/pages/impact.test.tsx` (create)

**Step 1: Write the failing test**

Create `frontend/__tests__/pages/impact.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/contexts/ats-context", () => ({
  useConnection: () => ({ address: undefined, isConnected: false }),
}));

import ImpactPage from "@/app/impact/page";

describe("Impact Page", () => {
  it("renders the page title", () => {
    render(<ImpactPage />);
    expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
  });

  it("displays key impact metrics", () => {
    render(<ImpactPage />);
    expect(screen.getByText("tCO₂e Avoided")).toBeInTheDocument();
    expect(screen.getByText("Clean Energy Generated")).toBeInTheDocument();
    expect(screen.getByText("Projects Funded")).toBeInTheDocument();
  });

  it("shows ICMA alignment section", () => {
    render(<ImpactPage />);
    expect(screen.getByText("ICMA Green Bond Principles")).toBeInTheDocument();
  });

  it("shows Guardian integration note", () => {
    render(<ImpactPage />);
    expect(screen.getByText(/Hedera Guardian/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/pages/impact.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement the Impact page**

Create `frontend/app/impact/page.tsx`. This is a **stubbed page with mock data** (Guardian integration deferred). It should:

- Show a full-bleed banner with 4 impact metrics: tCO₂e Avoided (12,450), Clean Energy Generated (28.4 GWh), Renewable Capacity (15.2 MW), Projects Funded (7)
- Show a "Project Portfolio" section with mock project cards: each card has project name, category (Solar, Wind, Energy Storage), location, capacity, and status
- Show an "ICMA Green Bond Principles" section with the 4 core components (Use of Proceeds, Project Evaluation & Selection, Management of Proceeds, Reporting) as checklist items with green checkmarks
- Show a "Data Source" card noting that real-time MRV data will come from Hedera Guardian system
- Use mock data arrays defined at top of file — NO API calls needed
- Follow existing styling patterns exactly: `card-flush`, `card`, `animate-entrance`, `stat-label`, status badges

The page should be ~200 lines. All data is hardcoded mock data.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/pages/impact.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/impact/page.tsx frontend/__tests__/pages/impact.test.tsx
git commit -m "feat: add Impact page with mock environmental metrics"
```

---

## Task 6: Add Coupon Controls to Issuer Page

**Files:**
- Modify: `frontend/app/issue/page.tsx`
- Test: Existing issuer tests cover role gating; add a focused test for coupon UI

**Step 1: Write the failing test**

Create `frontend/__tests__/pages/issuer-coupons.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

vi.mock("@/contexts/ats-context", () => ({
  useConnection: () => ({ address: "0xdeployer", isConnected: true }),
  useAts: () => ({
    address: "0xdeployer",
    isConnected: true,
    isConnecting: false,
    provider: null,
    signer: { signMessage: vi.fn().mockResolvedValue("0xsig") },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-token", () => ({
  useTokenRead: () => ({
    totalSupply: 100000000000000000000000n,
    paused: false,
    isLoading: false,
  }),
  useTokenBalance: () => ({ data: 0n }),
  useIsAgent: () => ({ data: true, isLoading: false }),
  useIsFrozen: () => ({ data: false }),
  useTokenOwner: () => ({ data: "0xdeployer" }),
  useTokenWrite: () => ({
    mint: vi.fn(),
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-hcs-audit", () => ({
  useHCSAudit: () => ({ events: [], isLoading: false }),
}));

vi.mock("@/hooks/use-holders", () => ({
  useHolders: () => ({ holders: [], isLoading: false }),
}));

vi.mock("@/hooks/use-coupons", () => ({
  useCoupons: () => ({
    data: [
      {
        id: 0,
        rateDisplay: "4.25%",
        status: "paid",
        periodDays: 180,
        startDate: Math.floor(Date.now() / 1000) - 180 * 86400,
        endDate: Math.floor(Date.now() / 1000),
        executionDate: Math.floor(Date.now() / 1000) - 86400,
        recordDate: Math.floor(Date.now() / 1000) - 2 * 86400,
        snapshotId: 1,
        rate: 425,
        rateDecimals: 4,
      },
    ],
    isLoading: false,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

import IssuerPage from "@/app/issue/page";

describe("Issuer Page - Coupon Controls", () => {
  it("shows coupon management section", () => {
    render(createElement(IssuerPage), { wrapper });
    expect(screen.getByText("Coupon Management")).toBeInTheDocument();
  });

  it("shows distribute button for eligible coupons", () => {
    render(createElement(IssuerPage), { wrapper });
    expect(screen.getByRole("button", { name: /distribute/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/pages/issuer-coupons.test.tsx`
Expected: FAIL — no "Coupon Management" text in issuer page

**Step 3: Add coupon management card to issue/page.tsx**

Add a new card section to the issuer page (after the existing 2x2 grid of operations). This card should:

- Title: "Coupon Management"
- List coupons from `useCoupons()` hook with: rate, period, status badge
- "Distribute" button for coupons past execution date (calls `/api/issuer/distribute-coupon`)
- Status feedback: loading spinner during distribution, success/error message after
- Uses the same card styling as existing operation cards

The implementation should add `useCoupons` import and a new section to the existing page. Do NOT rewrite the entire page — just add the coupon management card.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/pages/issuer-coupons.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/issue/page.tsx frontend/__tests__/pages/issuer-coupons.test.tsx
git commit -m "feat: add coupon management controls to Issuer page"
```

---

## Task 7: Fix Stale Memory and Address References

**Files:**
- Modify: `memory/MEMORY.md` (fix stale CPC address in Completed section)
- Modify: `e2e/tests/full-demo-flow.spec.ts` (remove stale wagmi comment)

**Step 1: Fix MEMORY.md**

In the "Completed" section, update:
```
- CPC bond deployed at `0x8B7284908BF8BC87CDF7Fc421f79B8973A669766` (account `0.0.8252742`)
```
to:
```
- CPC bond deployed at `0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9` (account `0.0.8254921`)
```

**Step 2: Fix stale wagmi comment in full-demo-flow.spec.ts**

In `e2e/tests/full-demo-flow.spec.ts`, line ~21, change:
```ts
// wagmi persists connection state, so disconnect first then re-inject with Deployer key
```
to:
```ts
// Disconnect first then re-inject with Deployer key
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add e2e/tests/full-demo-flow.spec.ts
git commit -m "fix: update stale references (wagmi comment, memory addresses)"
```

---

## Task 8: Run and Fix E2E Tests

**Files:**
- Possibly modify: multiple E2E test files and frontend components
- This task is investigative — run the full suite and fix what breaks

**Step 1: Start the frontend dev server**

Run: `cd frontend && npx next dev --port 3100`
(Keep running in background)

**Step 2: Run the full E2E suite**

Run: `cd e2e && npx playwright test --reporter=list`

**Step 3: Analyze failures**

The wallet mock injects `window.ethereum` which is compatible with `AtsContext`. Expected passing tests:
- investor-portal (bond details display, compliance checks)
- accessibility (landmarks, keyboard nav)
- mobile (responsive layout)
- compliance-monitor (HCS events)
- faucet (eUSD claim flow)

Potentially failing tests:
- write-operations (uses `readContract()` helper which may reference old ABI)
- issuer-dashboard (may reference old UI elements)
- full-demo-flow (multi-wallet flow)

**Step 4: Fix each failing test**

For each failure, determine:
1. Is it a test expectation that needs updating (UI text changed)?
2. Is it a frontend bug introduced by migration?
3. Is it a wallet mock issue?

Fix accordingly. Do NOT just skip or disable tests.

**Step 5: Verify all tests pass**

Run: `cd e2e && npx playwright test --reporter=list`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "fix: update E2E tests for ATS migration"
```

---

## Task 9: Add E2E Tests for New Pages

**Files:**
- Create: `e2e/tests/coupons-page.spec.ts`
- Create: `e2e/tests/impact-page.spec.ts`

**Step 1: Write Coupons page E2E test**

Create `e2e/tests/coupons-page.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Coupons Page", () => {
  test("should display coupon schedule", async ({ page }) => {
    await page.goto("/coupons");
    await expect(page.getByText("Coupon Schedule")).toBeVisible();
    await expect(page.getByText("Yield Summary")).toBeVisible();
  });

  test("should show coupon rate", async ({ page }) => {
    await page.goto("/coupons");
    await expect(page.getByText("4.25%")).toBeVisible({ timeout: 15000 });
  });

  test("should navigate from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Coupons" }).click();
    await expect(page).toHaveURL("/coupons");
    await expect(page.getByText("Coupon Schedule")).toBeVisible();
  });
});
```

**Step 2: Write Impact page E2E test**

Create `e2e/tests/impact-page.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Impact Page", () => {
  test("should display environmental metrics", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
    await expect(page.getByText("tCO₂e Avoided")).toBeVisible();
    await expect(page.getByText("Clean Energy Generated")).toBeVisible();
  });

  test("should show ICMA principles", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("ICMA Green Bond Principles")).toBeVisible();
  });

  test("should navigate from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Impact" }).click();
    await expect(page).toHaveURL("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
  });
});
```

**Step 3: Run new E2E tests**

Run: `cd e2e && npx playwright test coupons-page impact-page --reporter=list`
Expected: All PASS

**Step 4: Run full suite to confirm no regressions**

Run: `cd e2e && npx playwright test --reporter=list`
Expected: All PASS

**Step 5: Commit**

```bash
git add e2e/tests/coupons-page.spec.ts e2e/tests/impact-page.spec.ts
git commit -m "test: add E2E tests for Coupons and Impact pages"
```

---

## Task 10: Final Verification

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All PASS (should be ~80+ tests now)

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS — all 5 pages in build output:
- `/` (Invest)
- `/coupons` (Coupons)
- `/impact` (Impact)
- `/issue` (Issuer)
- `/monitor` (Compliance)

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test --reporter=list`
Expected: All PASS

**Step 5: Manual smoke test**

Start dev server: `cd frontend && npm run dev`
Visit each page in browser, verify:
- Nav shows all 5 tabs and highlights active tab
- Coupons page loads coupon data from contract
- Impact page shows mock metrics
- Issuer page shows coupon management card
- All existing functionality still works

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final adjustments from smoke testing"
```
