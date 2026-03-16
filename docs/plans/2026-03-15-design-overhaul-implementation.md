# Design Overhaul: "Editorial Finance" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILLS (invoke in this order before ANY implementation):
>
> 1. `superpowers:executing-plans` — governs task-by-task execution with review checkpoints
> 2. `superpowers:using-superpowers` — before each task, check if any skill applies (even 1% chance)
>
> **Skill integration per task:**
> - Before writing CSS/animation code: invoke `/animate` skill if available, or `/polish` for spacing/typography refinement
> - Before layout changes: invoke `/bolder` skill to validate the change increases visual impact without AI-slop patterns
> - Before onboarding UX changes: invoke `/onboard` skill to validate the flow guides users toward action
> - Before any visual change: invoke `/critique` skill mentally — does this pass the "would someone believe AI made this?" test? If yes, rethink.
> - After each task group completes (typography, animation, layout, onboarding): invoke `/critique` on the changed files to validate before proceeding
>
> **Skill priority order:** Process skills (executing-plans, debugging) before implementation skills (animate, bolder, polish, onboard, critique).
>
> **Do NOT skip skill checks.** Even if a task seems simple, the skill may catch issues you'd miss. If an invoked skill turns out not to apply, that's fine — the cost of checking is low, the cost of shipping AI slop is high.

**Goal:** Transform the Coppice frontend from a forgettable card-grid dashboard into a distinctive, memorable interface that hackathon judges will screenshot.

**Architecture:** Pure CSS + Next.js font system changes. No new dependencies. All animations CSS-only with `cubic-bezier(0.16, 1, 0.3, 1)` easing. Font loading via `next/font/google`. Background atmosphere via pseudo-elements. Component structure unchanged.

**Tech Stack:** Next.js 16, Tailwind CSS v4, next/font/google (Instrument Serif, Bricolage Grotesque, Geist Mono)

**Branch base:** `worktree-demo-onboarding` — all file paths are relative to `frontend/`

**Design doc:** `docs/plans/2026-03-15-design-overhaul.md`

**Impeccable skills checkpoints:**
- After Tasks 1-2 (typography): Run `/critique` on layout.tsx + globals.css — does the font stack feel institutional and distinctive?
- After Tasks 3-4 (atmosphere + animation): Run `/critique` — does the background add depth without competing with typography? Do animations feel intentional?
- After Tasks 5-7 (layout restructuring): Run `/bolder` — did we break the card-grid monotony? Is the Bond Details hero treatment working?
- After Task 8 (compliance cascade): Run `/animate` + `/critique` — is this the hero moment? Would a judge screenshot it?
- After Task 10 (issuer grouping): Run `/critique` — does the section grouping reduce cognitive load?
- After Task 11 (detail fixes): Run `/polish` — are all the small fixes clean and consistent?
- After Task 12-13 (full test suite): Final `/critique` of the entire frontend — pass/fail on the full design.

---

### Task 1: Typography — Font Loading

**Files:**
- Modify: `frontend/app/layout.tsx`

**Step 1: Add font imports and CSS variable application**

Add three font imports from `next/font/google` and apply them as CSS variables on `<html>`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Instrument_Serif, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { getConfig } from "@/lib/wagmi";
import { Providers } from "@/providers";
import { Nav } from "@/components/nav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
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
  title: "Coppice — Green Bond Tokenization",
  description: "ERC-3643 compliant green bond tokenization on Hedera",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en" className={`${instrumentSerif.variable} ${bricolageGrotesque.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-surface text-text flex flex-col">
        <Providers initialState={initialState}>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full" role="main">
            {children}
          </main>
          <footer className="border-t border-border/50 py-4" role="contentinfo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-text-muted">
              <a href="https://erc3643.info/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                ERC-3643 Compliant Green Bonds on Hedera
              </a>
              <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-bond-green animate-pulse-dot" />
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

Key changes from current file:
- Lines 4: Add font imports (replacing nothing — new import line)
- Lines 6-22: Add font configuration objects (new code)
- Line 38: Add CSS variable classes to `<html>` element
- Lines 46-48: Footer text size `text-xs` → `text-sm`, add green pulse dot to Hedera Testnet link, remove "(Chain 296)" text

**Step 2: Verify build compiles**

Run: `npm run build` from repo root
Expected: Build succeeds. Fonts will be downloaded and self-hosted automatically by next/font.

**Step 3: Commit**

```
git add frontend/app/layout.tsx
git commit -m "feat(frontend): add Instrument Serif, Bricolage Grotesque, Geist Mono fonts"
```

---

### Task 2: Typography — CSS Foundation

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Update body font, typography classes, and stat-label**

Replace the body font-family, update `.page-title` to use display font, update `.stat-label` sizing, and add `.font-display` utility. Also add the `.card-static` variant (no hover glow).

Changes to `globals.css`:

1. **Line 21** — Replace body font-family:
```css
body {
  font-family: var(--font-body), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--color-surface);
}
```

2. **Lines 83-91** — Replace typography classes:
```css
/* Typography */
.page-title {
  font-family: var(--font-display), "Instrument Serif", Georgia, serif;
  @apply text-3xl text-white;
}
.card-title {
  @apply text-lg font-semibold text-white mb-4;
}
.stat-label {
  @apply text-xs text-text-muted uppercase tracking-wider;
}
```

3. **After the `.card-flush:hover` block (after line 80)** — Add static card variant:
```css
.card-static {
  @apply bg-surface-2 border border-border rounded-xl p-6;
}
```

4. **Add font utility class** (after the typography section):
```css
.font-display {
  font-family: var(--font-display), "Instrument Serif", Georgia, serif;
}
.font-mono {
  font-family: var(--font-mono), "Geist Mono", ui-monospace, monospace;
}
```

**Step 2: Verify build**

Run: `npm run build` from repo root
Expected: Build succeeds.

**Step 3: Commit**

```
git add frontend/app/globals.css
git commit -m "feat(frontend): update typography system — Bricolage body, Instrument Serif display, Geist Mono data"
```

---

### Task 3: Background Atmosphere

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Add vignette and noise grain pseudo-elements**

Add after the `body { ... }` block (after line 25):

```css
/* Background atmosphere — vignette + noise grain */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
  z-index: 50;
}

body::after {
  content: "";
  position: fixed;
  inset: 0;
  opacity: 0.02;
  pointer-events: none;
  z-index: 50;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}
```

Note: z-index 50 with `pointer-events: none` ensures these overlay on top of content visually but don't block interaction. The noise SVG is inlined as a data URL to avoid an extra network request.

**Step 2: Verify the vignette doesn't block the sticky nav or modals**

Run: `npm run dev` in frontend, visually check that:
- Nav is still clickable (pointer-events: none on pseudo-elements)
- Wallet connect button works
- Scroll works normally
- Vignette is visible but subtle at screen edges

**Step 3: Commit**

```
git add frontend/app/globals.css
git commit -m "feat(frontend): add background vignette and noise grain for depth"
```

---

### Task 4: Animation System — CSS Keyframes

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Add animation keyframes and utility classes**

Add before the reduced-motion media query (before line 137):

```css
/* ── Animation system ─────────────────────────── */

/* Staggered entrance — cards and sections fade-in + slide-up */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-entrance {
  opacity: 0;
  animation: fade-in-up 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--index, 0) * 80ms);
}

/* Compliance check row flash — green or red highlight on resolve */
@keyframes check-flash-green {
  from { background-color: rgba(34, 197, 94, 0.08); }
  to { background-color: transparent; }
}
@keyframes check-flash-red {
  from { background-color: rgba(239, 68, 68, 0.08); }
  to { background-color: transparent; }
}

.animate-check-pass {
  animation: check-flash-green 600ms ease-out;
}
.animate-check-fail {
  animation: check-flash-red 600ms ease-out;
}

/* Status icon slide-in from left */
@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-icon-enter {
  animation: slide-in-left 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Badge pop-in — scale + fade for the Eligible/Not Eligible badge */
@keyframes badge-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-badge-enter {
  animation: badge-enter 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Event feed item entrance — slide down */
@keyframes slide-in-down {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-feed-enter {
  animation: slide-in-down 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* New event highlight — green flash that fades */
@keyframes event-highlight {
  from { background-color: rgba(34, 197, 94, 0.06); }
  to { background-color: transparent; }
}

.animate-event-new {
  animation: event-highlight 1.5s ease-out;
}
```

**Step 2: Update the reduced-motion media query**

Replace the existing reduced-motion block to properly handle the new animations:

```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .animate-entrance {
    opacity: 1;
    animation: none;
  }
}
```

**Step 3: Verify build**

Run: `npm run build` from repo root
Expected: Build succeeds.

**Step 4: Commit**

```
git add frontend/app/globals.css
git commit -m "feat(frontend): add animation keyframes — entrance, compliance cascade, feed, badge"
```

---

### Task 5: Bond Details — Hero Treatment

**Files:**
- Modify: `frontend/components/bond-details.tsx`

**Step 1: Apply Instrument Serif to bond name, increase spacing**

```tsx
"use client";

import { useTokenRead } from "@/hooks/use-token";
import { BOND_DETAILS } from "@/lib/constants";
import { formatEther } from "viem";

export function BondDetails() {
  const { totalSupply, paused } = useTokenRead();

  const supply = totalSupply.data != null
    ? Number(formatEther(totalSupply.data)).toLocaleString("en-US")
    : "--";
  const isPaused = paused.data ?? null;

  return (
    <div className="card-flush">
      <div className="bg-gradient-to-r from-bond-green/8 to-transparent px-6 py-6 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bond-green/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl text-white">{BOND_DETAILS.name}</h1>
            <p className="text-xs text-text-muted">{BOND_DETAILS.issuer}</p>
          </div>
        </div>
        {isPaused !== null && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPaused ? "bg-bond-red/15 text-bond-red" : "bg-bond-green/15 text-bond-green"}`}>
            {isPaused ? "Paused" : "Active"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-6">
        <div>
          <p className="stat-label mb-1">Symbol</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.symbol}</p>
        </div>
        <div>
          <p className="stat-label mb-1">Coupon Rate</p>
          <p className="text-lg font-mono font-semibold text-bond-green">{BOND_DETAILS.couponRate}</p>
        </div>
        <div>
          <p className="stat-label mb-1">Maturity</p>
          <p className="text-lg font-mono font-semibold text-white">{BOND_DETAILS.maturity}</p>
        </div>
        <div>
          <p className="stat-label mb-1">Total Supply</p>
          <p className="text-lg font-mono font-semibold text-white">{supply} <span className="text-xs text-text-muted font-normal">CPC</span></p>
        </div>
      </div>
    </div>
  );
}
```

Changes from current:
- Line 18: `py-4` → `py-6` (more breathing room in header)
- Line 21: `w-9 h-9` → `w-10 h-10` (slightly larger icon)
- Line 27: `text-lg font-semibold` → `font-display text-2xl` (Instrument Serif, larger)
- Line 37: `py-5` → `py-6` (more breathing room in stats)

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Commit**

```
git add frontend/components/bond-details.tsx
git commit -m "feat(frontend): bond details hero treatment — Instrument Serif heading, increased spacing"
```

---

### Task 6: Monitor Page — Stat Bar Redesign

**Files:**
- Modify: `frontend/app/monitor/page.tsx`

**Step 1: Replace card grid with single-surface stat bar**

```tsx
"use client";

import { AuditEventFeed } from "@/components/audit-event-feed";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { APPROVAL_EVENTS, RESTRICTION_EVENTS } from "@/lib/event-types";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");

  const approvals = events.filter((e) => APPROVAL_EVENTS.has(e.type)).length;
  const restrictions = events.filter((e) => RESTRICTION_EVENTS.has(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>Compliance Monitor</h1>

      <div className="bg-surface-2 border border-border rounded-xl flex divide-x divide-border animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
        <div className="flex-1 px-6 py-5">
          <p className="stat-label mb-2">Total Events</p>
          <p className="font-display text-3xl text-white">{events.length}</p>
        </div>
        <div className="flex-1 px-6 py-5">
          <p className="stat-label mb-2">Approvals</p>
          <p className="font-display text-3xl text-bond-green">{approvals}</p>
        </div>
        <div className="flex-1 px-6 py-5">
          <p className="stat-label mb-2">Restrictions</p>
          <p className="font-display text-3xl text-bond-red">{restrictions}</p>
        </div>
      </div>

      <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
        <AuditEventFeed topicType="audit" />
      </div>
    </div>
  );
}
```

Changes from current:
- Removed three separate `.card` divs with individual SVG icons
- Single `bg-surface-2` surface with `divide-x divide-border` for internal dividers
- Numbers use `font-display text-3xl` (Instrument Serif) instead of `font-mono font-semibold`
- Added `animate-entrance` with `--index` stagger on title, stat bar, and feed
- Removed icon containers (the stat bar is dense and data-forward — icons added visual noise)

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Commit**

```
git add frontend/app/monitor/page.tsx
git commit -m "feat(frontend): monitor page stat bar redesign — single surface, Instrument Serif numbers"
```

---

### Task 7: Investor Page — Layout + Disconnected State + Entrance Animation

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1: Restructure layout, add entrance animations, improve disconnected state**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { formatBalance } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { EmptyState } from "@/components/ui/empty-state";
import { useTokenBalance } from "@/hooks/use-token";
import { useHTS } from "@/hooks/use-hts";

export default function InvestorPortal() {
  const { address } = useConnection();
  const { data: cpcBalanceRaw } = useTokenBalance(address);
  const { getEusdBalance } = useHTS();
  const [eligible, setEligible] = useState(false);
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  const cpcBalance = cpcBalanceRaw != null ? formatBalance(cpcBalanceRaw) : "--";

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      const eusd = await getEusdBalance(address);
      if (!cancelled) {
        setEusdBalance(eusd.toLocaleString("en-US", { minimumFractionDigits: 2 }));
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, getEusdBalance]);

  const displayEusdBalance = address ? eusdBalance : "--";

  return (
    <div className="space-y-6">
      <div className="animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>
        <BondDetails />
      </div>

      <div className="border-b border-border/30 my-2" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
            <ComplianceStatus onEligibilityChange={setEligible} />
          </div>
          {address && (
            <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
              <TransferFlow enabled={eligible} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
            {!address ? (
              <EmptyState
                icon={<svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>}
                title="Portfolio"
                description="Connect a wallet to check eligibility and invest in Coppice Green Bonds."
              />
            ) : (
              <div className="card-static">
                <h3 className="card-title">Portfolio</h3>
                <div className="space-y-3">
                  <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                    <p className="stat-label mb-1">CPC Balance</p>
                    <p className="text-2xl font-mono font-semibold text-white">{cpcBalance}</p>
                    <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
                  </div>
                  <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                    <p className="stat-label mb-1">eUSD Balance</p>
                    <p className="text-2xl font-mono font-semibold text-bond-green">{displayEusdBalance}</p>
                    <p className="text-xs text-text-muted mt-1">Coppice USD (HTS)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Changes from current:
- Added `EmptyState` import (line 9)
- Removed `Card` import (replaced with `card-static` class directly)
- Added `animate-entrance` with `--index` stagger on BondDetails, ComplianceStatus, TransferFlow, Portfolio
- Added section divider `border-b border-border/30` between BondDetails and the grid
- TransferFlow hidden when wallet not connected (`{address && ...}`)
- Portfolio: disconnected state now uses `EmptyState` with wallet icon instead of plain text
- Portfolio: connected state uses `card-static` (no hover glow) instead of `Card`

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Commit**

```
git add frontend/app/page.tsx
git commit -m "feat(frontend): investor page — entrance animations, section divider, improved disconnected state"
```

---

### Task 8: Compliance Status — Cascade Animation + Disconnected Skeleton + Onboarding Fixes

**Files:**
- Modify: `frontend/components/compliance-status.tsx`

This is the largest and most important change. The compliance cascade is the hero moment.

**Step 1: Add minimum display time, cascade animation classes, disconnected skeleton, and onboarding UX fixes**

Key changes to `compliance-status.tsx`:

1. **Disconnected state (lines 206-213)**: Replace plain text with skeleton check items:

```tsx
if (!address) {
  return (
    <div className="card-flush">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
      </div>
      <div className="px-6 py-4 space-y-1">
        {["Identity Registered", "KYC / AML / Accredited", "Jurisdiction Check", "Compliance Module"].map((label) => (
          <div key={label} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0 opacity-40">
            <div className="w-5 h-5 rounded-full bg-surface-3" />
            <span className="text-sm text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

2. **Minimum display time for check cascade**: Add a helper function at the top of the component (after the state declarations):

```tsx
// Minimum display time per check so the cascade animation is visible
const minDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
```

Then in the `runChecks` function, after setting each check result, add `await minDelay(300)`:

After `setChecks([...results])` on line 77 (first check resolves), add:
```tsx
await minDelay(300);
```

3. **Flash animation on check rows**: Add state to track which checks just resolved:

```tsx
const [flashIndex, setFlashIndex] = useState<{ index: number; status: "pass" | "fail" } | null>(null);
```

When a check resolves, set the flash index briefly:

After updating each `results[N]`, before `setChecks`, call:
```tsx
setFlashIndex({ index: N, status: results[N].status });
setTimeout(() => setFlashIndex(null), 600);
```

In the render, apply animation class to the check row:
```tsx
<div key={check.label} className={`flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 rounded-lg ${
  flashIndex?.index === i && flashIndex.status === "pass" ? "animate-check-pass" :
  flashIndex?.index === i && flashIndex.status === "fail" ? "animate-check-fail" : ""
}`}>
```

And wrap the status icon in the animation class:
```tsx
<div className="w-5 h-5 flex items-center justify-center">
  {check.status === "loading" ? (
    <Spinner aria-label="Checking" />
  ) : check.status === "pass" ? (
    <span className="animate-icon-enter"><CheckIcon className="w-5 h-5 text-bond-green" /></span>
  ) : (
    <span className="animate-icon-enter"><XIcon className="w-5 h-5 text-bond-red" /></span>
  )}
</div>
```

4. **Badge entrance animation**: On the eligibility badge (line 225-229):
```tsx
{allDone && (
  <span className={`animate-badge-enter text-xs px-3 py-1 rounded-full font-medium ${
    eligible ? "bg-bond-green/15 text-bond-green" : "bg-bond-red/15 text-bond-red"
  }`}>
    {eligible ? "Eligible to Invest" : "Not Eligible"}
  </span>
)}
```

5. **Compliance header gradient transition**: Add CSS transition to the header div:
```tsx
<div className={`px-6 py-4 border-b border-border/50 flex items-center justify-between transition-[background] duration-400 ${
  allDone && eligible ? "bg-gradient-to-r from-bond-green/8 to-transparent" : allDone ? "bg-gradient-to-r from-bond-red/8 to-transparent" : ""
}`}>
```

6. **Onboarding section** (lines 259-351) — three changes:

a. Add left border accent + amber background:
```tsx
<div className="px-6 py-6 border-t border-border/50 border-l-2 border-l-bond-amber bg-bond-amber/5">
```

b. Change "Register Identity" button from `btn-outline-amber` to `btn-primary`:
```tsx
<button
  onClick={handleOnboard}
  disabled={onboarding}
  className="btn-primary px-4 whitespace-nowrap disabled:cursor-not-allowed"
>
  {onboarding ? "Registering..." : "Register Identity"}
</button>
```

c. Replace the success state (lines 321-349) with collapsible tx details:

```tsx
{onboardResult && (
  <div className="bg-surface-3/50 rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2">
      <CheckIcon className="w-5 h-5 text-bond-green" />
      <p className="text-sm text-bond-green font-medium">You're now eligible to invest in Coppice Green Bonds</p>
    </div>
    <p className="text-xs text-text-muted pl-7">
      Your compliance checks are updating above. Once complete, scroll down to purchase.
    </p>
    <details className="pl-7">
      <summary className="text-xs text-text-muted cursor-pointer hover:text-white transition-colors">
        View on-chain transaction details
      </summary>
      <div className="mt-2 space-y-1">
        <a
          href={`https://hashscan.io/testnet/contract/${onboardResult.identityAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-bond-green hover:text-bond-green/80 underline underline-offset-2 block"
        >
          Identity contract on HashScan
        </a>
        {Object.entries(onboardResult.transactions).map(([label, hash]) => (
          <a
            key={label}
            href={`https://hashscan.io/testnet/transaction/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/70 hover:text-white underline underline-offset-2 block"
            title={hash}
          >
            {formatTxLabel(label)}: {hash.slice(0, 10)}...{hash.slice(-6)}
          </a>
        ))}
      </div>
    </details>
  </div>
)}
```

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Run existing tests**

Run: `npm run test:unit` from repo root
Expected: All tests pass.

**Step 4: Commit**

```
git add frontend/components/compliance-status.tsx
git commit -m "feat(frontend): compliance cascade animation, skeleton disconnected state, onboarding UX fixes"
```

---

### Task 9: Audit Event Feed — Link Contrast + Feed Animation

**Files:**
- Modify: `frontend/components/audit-event-feed.tsx`

**Step 1: Fix HashScan link contrast and add feed entrance animation**

Changes:
1. Line 97: `text-bond-green/50` → `text-bond-green` and add external-link icon + title attribute
2. Add `animate-feed-enter animate-event-new` to each event row

Updated event row (lines 84-112):

```tsx
{sorted.map((event) => (
  <div key={event.sequenceNumber} className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0 animate-feed-enter animate-event-new">
    <span className={`text-[11px] px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGE_CLASSES[event.type] || "bg-surface-3 text-text-muted"}`}>
      {event.type}
    </span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{formatTimestamp(event.consensusTimestamp || event.ts)}</span>
        {event.tx && (
          <a
            href={`https://hashscan.io/testnet/transaction/${event.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-bond-green hover:text-bond-green/80 font-mono transition-colors inline-flex items-center gap-1"
            title={event.tx}
          >
            {event.tx.slice(0, 10)}...
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        )}
      </div>
      <div className="text-xs text-text-muted mt-0.5">
        {Object.entries(event.data || {}).map(([k, v]) => (
          <span key={k} className="mr-3">
            <span className="text-text-muted/50">{k}:</span>{" "}
            <span className="text-white/70 font-mono">{v}</span>
          </span>
        ))}
      </div>
    </div>
  </div>
))}
```

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Commit**

```
git add frontend/components/audit-event-feed.tsx
git commit -m "feat(frontend): HashScan links full contrast with external-link icon, feed entrance animation"
```

---

### Task 10: Issuer Page — Section Grouping

**Files:**
- Modify: `frontend/app/issue/page.tsx`

**Step 1: Add section headers and entrance animations**

Wrap the return JSX (starting at line 147) with section headers and stagger:

```tsx
return (
  <div className="space-y-6">
    <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>Issuer Dashboard</h1>

    <div className="space-y-6">
      <p className="stat-label animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>Token Operations</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
          <Card>
            <h3 className="card-title">Mint Tokens</h3>
            {/* ... mint form content unchanged ... */}
          </Card>
        </div>
        <div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
          <Card>
            <h3 className="card-title">Allocate Proceeds</h3>
            {/* ... proceeds form content unchanged ... */}
          </Card>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      <p className="stat-label animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>Risk Controls</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-entrance" style={{ "--index": 5 } as React.CSSProperties}>
          <Card>
            <h3 className="card-title">Freeze / Unfreeze Wallet</h3>
            {/* ... freeze form content unchanged ... */}
          </Card>
        </div>
        <div className="animate-entrance" style={{ "--index": 6 } as React.CSSProperties}>
          <Card>
            <h3 className="card-title">Token Pause Control</h3>
            {/* ... pause form content unchanged ... */}
          </Card>
        </div>
      </div>
    </div>

    <div className="animate-entrance" style={{ "--index": 7 } as React.CSSProperties}>
      <ProjectAllocation />
    </div>
  </div>
);
```

Key changes:
- Added section labels "Token Operations" and "Risk Controls" using `stat-label` class
- Reordered cards: Mint + Allocate (positive actions) first, Freeze + Pause (risk controls) second
- Added `animate-entrance` with incremental `--index` on every section/card
- Form content inside each Card is unchanged

**Step 2: Verify build**

Run: `npm run build` from repo root

**Step 3: Commit**

```
git add frontend/app/issue/page.tsx
git commit -m "feat(frontend): issuer page section grouping — Token Operations vs Risk Controls"
```

---

### Task 11: Category Color Fix + Card Variant

**Files:**
- Modify: `frontend/lib/event-types.ts`
- Modify: `frontend/app/globals.css` (add teal color if not in theme)

**Step 1: Add teal to theme colors**

In `globals.css` `@theme` block, add:
```css
--color-bond-teal: #14b8a6;
```

**Step 2: Update Green Buildings category color**

In `frontend/lib/event-types.ts`, line 55:
```tsx
"Green Buildings": "bg-bond-teal",
```

**Step 3: Verify build**

Run: `npm run build` from repo root

**Step 4: Commit**

```
git add frontend/lib/event-types.ts frontend/app/globals.css
git commit -m "fix(frontend): distinct teal color for Green Buildings category, resolves green-on-green"
```

---

### Task 12: Run Full Test Suite + Lint

**Step 1: Run lint**

Run: `npm run lint` from repo root
Expected: No new lint errors.

**Step 2: Run unit tests**

Run: `npm run test:unit` from repo root
Expected: All 40 tests pass.

**Step 3: Run build**

Run: `npm run build` from repo root
Expected: Clean build.

**Step 4: Visual verification**

Run: `npm run dev` in frontend directory
Manually verify:
- Fonts load correctly (Instrument Serif on page titles + bond name, Bricolage Grotesque on body, Geist Mono on data)
- Background vignette + noise visible but subtle
- Card entrance animations play on page load
- Compliance checks animate with flash + icon slide
- Eligibility badge pops in after cascade
- Monitor stat bar renders as single surface with dividers
- Issuer page has section headers
- HashScan links are readable (full green, external icon)
- Category colors are distinct (teal for Green Buildings)
- Footer shows green pulse dot
- Mobile layout still works
- Reduced motion: animations are subtle/absent

**Step 5: Commit any fixes from visual review**

If visual review reveals issues, fix and commit individually.

---

### Task 13: E2E Test Verification

**Step 1: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All 43 tests pass. The design changes are visual-only — no component APIs, data flow, or accessibility attributes changed.

If any tests break:
- Check if tests assert on specific text sizes or class names (unlikely but possible)
- Check if the stat bar layout change on monitor page affects any selectors
- Fix and commit

**Step 2: Final commit**

```
git add -A
git commit -m "test: verify all E2E tests pass after design overhaul"
```
