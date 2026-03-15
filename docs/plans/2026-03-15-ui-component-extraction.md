# UI Component Extraction & CSS Consolidation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce repeated Tailwind class strings across the frontend by extracting global CSS utility classes and a small set of shared UI components, improving code readability without over-engineering.

**Architecture:** Add `@apply`-based utility classes to `globals.css` for the most-repeated patterns (cards, buttons, inputs, labels, spinners). Extract two small React components (`<Card>` and `<EmptyState>`) that wrap structural patterns appearing 5+ times. Adopt these across all 13 frontend source files. No new dependencies — no `cn()`, `clsx`, or UI library needed.

**Tech Stack:** Tailwind CSS v4 (`@apply` in `globals.css`), React 19, Next.js 16 App Router, TypeScript

---

## Background: What Was Analyzed

Every `.tsx` and `.css` file in `frontend/` was read in full. The key findings:

- **Card container** (`bg-surface-2 border border-border rounded-xl p-6 card-glow`) appears ~15 times across 10 files
- **Card heading** (`text-lg font-semibold text-white mb-4`) appears ~7 times
- **Page title** (`text-2xl font-semibold text-white`) appears ~3 times
- **Stat label** (`text-[11px] text-text-muted uppercase tracking-widest`) appears ~6 times
- **Input field** (90-char class string) appears ~9 times (already a JS variable in `issue/page.tsx`)
- **Primary button** (`bg-bond-green text-black ... rounded-lg ...`) appears ~4 times
- **Outline buttons** (danger/success/warning variants) appear ~8 times combined
- **Spinner** (`inline-block w-4 h-4 border-2 ... animate-spin`) appears ~3 times
- **Status message** (`text-xs` + conditional green/red) appears ~4 times in `issue/page.tsx` alone
- **Empty state card** (centered icon + heading + description) appears 3 times in `issue/page.tsx` + 1 in `error-boundary.tsx`

No `cn()` or `clsx()` utility exists. No CSS modules. All styling is inline Tailwind. Only two custom CSS classes exist today: `.card-glow` and `.animate-pulse-dot`.

## Scope Decisions

**In scope:**
- Global CSS classes in `globals.css` for the 10 most-repeated patterns
- `<Card>` wrapper component (structural, used 15+ times)
- `<EmptyState>` component (used 4 times, eliminates ~35 lines per extraction)
- Update all existing files to use the new classes/components
- Run `npm run lint` and `npm run build` and `npm run test:unit` after changes

**Out of scope (intentionally — not worth the complexity):**
- `<Button>` component — too many variants, CSS classes handle it better
- `<ListItem>`, `<IconBox>`, `<StatusIcon>`, `<CardHeader>` — only 2-3 uses each
- `cn()`/`clsx()` — only ~3 conditional class sites, template literals are fine
- `<StatCard>` for monitor page — only 1 file with 3 instances, CSS classes suffice

---

## Task 1: Add Global CSS Utility Classes

**Files:**
- Modify: `frontend/app/globals.css` (after line 69, before the `@media` block)

**Step 1: Add the utility classes to globals.css**

Add these classes after the `.animate-pulse-dot` block (line 69), before the `@media (prefers-reduced-motion)` block:

```css
/* ── Shared UI classes ────────────────────────── */

/* Card surfaces */
.card {
  @apply bg-surface-2 border border-border rounded-xl p-6 card-glow;
}
.card-flush {
  @apply bg-surface-2 border border-border rounded-xl overflow-hidden card-glow;
}

/* Typography */
.page-title {
  @apply text-2xl font-semibold text-white;
}
.card-title {
  @apply text-lg font-semibold text-white mb-4;
}
.stat-label {
  @apply text-[11px] text-text-muted uppercase tracking-widest;
}

/* Form inputs */
.input {
  @apply w-full bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-white text-sm
    placeholder:text-text-muted/60
    focus:outline-none focus:border-bond-green/40 focus:ring-1 focus:ring-bond-green/20
    transition-colors;
}

/* Buttons — NOTE: @apply cannot chain custom classes, so base styles are inlined in each variant */
.btn-primary {
  @apply py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40
    bg-bond-green text-black hover:bg-bond-green/90 transition-all
    shadow-[0_0_12px_rgba(34,197,94,0.15)];
}
.btn-outline-green {
  @apply py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors
    bg-bond-green/15 text-bond-green border border-bond-green/20 hover:bg-bond-green/25;
}
.btn-outline-red {
  @apply py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors
    bg-bond-red/15 text-bond-red border border-bond-red/20 hover:bg-bond-red/25;
}
.btn-outline-amber {
  @apply py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors
    bg-bond-amber/15 text-bond-amber border border-bond-amber/20 hover:bg-bond-amber/25;
}

/* Spinner */
.spinner {
  @apply inline-block w-4 h-4 border-2 border-text-muted/40 border-t-text-muted rounded-full animate-spin;
}
.spinner-amber {
  @apply inline-block w-4 h-4 border-2 border-bond-amber/40 border-t-bond-amber rounded-full animate-spin;
}

/* Status message (success/error feedback) */
.status-msg-success {
  @apply text-xs text-bond-green;
}
.status-msg-error {
  @apply text-xs text-bond-red;
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds. If `@apply` with custom theme colors causes issues in Tailwind v4, we'll need to use the raw CSS properties instead (fallback noted in Step 2a below).

**Step 2a: Fallback if @apply doesn't resolve custom theme colors**

Tailwind v4 may not support `@apply` with `@theme`-defined colors. If the build fails, replace `@apply` classes with raw CSS using `var()` references. For example:

```css
.card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem; /* rounded-xl */
  padding: 1.5rem; /* p-6 */
}
```

If this fallback is needed, apply it to all classes. The card-glow hover effect is already raw CSS, so this approach is consistent with the existing codebase.

**Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "style: add shared utility CSS classes for cards, buttons, inputs, typography"
```

---

## Task 2: Create Card Component

**Files:**
- Create: `frontend/components/ui/card.tsx`

**Step 1: Create the Card component**

```tsx
interface CardProps {
  children: React.ReactNode;
  /** Use "flush" for cards with custom header sections (no padding, overflow-hidden) */
  flush?: boolean;
  className?: string;
}

export function Card({ children, flush, className = "" }: CardProps) {
  return (
    <div className={`${flush ? "card-flush" : "card"} ${className}`}>
      {children}
    </div>
  );
}
```

No `"use client"` needed — this is a pure markup wrapper with no hooks or browser APIs.

**Step 2: Verify it compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/components/ui/card.tsx
git commit -m "feat: add Card component wrapper"
```

---

## Task 3: Create EmptyState Component

**Files:**
- Create: `frontend/components/ui/empty-state.tsx`

This pattern appears in `issue/page.tsx` (lines 116-126, 138-150) and `error-boundary.tsx` (lines 27-44). All share: centered card, icon, heading, description text, optional action.

**Step 1: Create the EmptyState component**

```tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Optional action button or other content below the description */
  action?: ReactNode;
  /** Additional wrapper classes (e.g. "min-h-screen flex items-center justify-center p-8") */
  wrapperClassName?: string;
}

export function EmptyState({ icon, title, description, action, wrapperClassName }: EmptyStateProps) {
  const card = (
    <div className="card p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-3 flex items-center justify-center">
        {icon}
      </div>
      <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
      <p className="text-text-muted text-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{card}</div>;
  }

  return card;
}
```

No `"use client"` needed — pure markup.

Note: The "not authorized" empty state in `issue/page.tsx` uses `bg-bond-red/10` for its icon container instead of `bg-surface-3`. We'll handle that by passing a styled icon that includes its own container coloring, OR we add an optional `iconBgClassName` prop. To keep it simple, we'll let the caller wrap the SVG in a colored container — the `icon` prop already accepts ReactNode.

Actually, looking more carefully, the icon background color varies:
- "Connect wallet" state: `bg-surface-3` (neutral)
- "Not authorized" state: `bg-bond-red/10` (danger)
- Error boundary: `bg-bond-red/10` (danger)

Let's add a simple `variant` prop:

```tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Controls the icon container background color */
  variant?: "default" | "danger";
  action?: ReactNode;
  wrapperClassName?: string;
}

export function EmptyState({ icon, title, description, variant = "default", action, wrapperClassName }: EmptyStateProps) {
  const iconBg = variant === "danger" ? "bg-bond-red/10" : "bg-surface-3";

  const card = (
    <div className="card p-12 text-center">
      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
      <p className="text-text-muted text-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{card}</div>;
  }

  return card;
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/components/ui/empty-state.tsx
git commit -m "feat: add EmptyState component for connect/auth/error screens"
```

---

## Task 4: Adopt New Classes in issue/page.tsx

This is the largest file (267 lines) and benefits the most from these changes. It has 4 card containers, 5 buttons, 7 inputs, 4 status messages, and 3 empty states.

**Files:**
- Modify: `frontend/app/issue/page.tsx`

**Step 1: Update imports and empty states**

Add import at top:
```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
```

Replace lines 115-150 (the three early-return blocks) with:

```tsx
  if (!address) {
    return (
      <EmptyState
        icon={<svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
        title="Issuer Dashboard"
        description="Connect your issuer wallet to manage the bond."
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
        variant="danger"
        icon={<svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        title="Not Authorized"
        description="Only the bond issuer can access this dashboard."
      />
    );
  }
```

**Step 2: Remove the `inputClass` variable and update form fields**

Delete line 152 (the `const inputClass = ...` declaration).

Replace every `className={inputClass}` with `className="input"`.

There are 4 instances:
- Line 164: `<input ... className={inputClass} />` → `className="input"`
- Line 167: `<input ... className={inputClass} />` → `className="input"`
- Line 186: `<input ... className={inputClass} />` → `className="input"`
- Line 241: `<select ... className={inputClass}>` → `className="input"`
- Line 250: `<input ... className={inputClass} />` → `className="input"`

**Step 3: Update card containers**

Replace each `<div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">` with `<Card>` (and its closing `</div>` with `</Card>`).

There are 4 instances at lines 160, 182, 209, 234.

**Step 4: Update card headings**

Replace each `<h3 className="text-lg font-semibold text-white mb-4">` with `<h3 className="card-title">`.

There are 4 instances at lines 161, 183, 210, 235.

**Step 5: Update page title**

Replace `<h1 className="text-2xl font-semibold text-white">` with `<h1 className="page-title">`.

**Step 6: Update buttons**

- Mint button (line 170): Replace the full className with `className="w-full btn-primary"`
- Freeze button (line 191): Replace with `className="flex-1 btn-outline-red"`
- Unfreeze button (line 196): Replace with `className="flex-1 btn-outline-green"`
- Pause toggle button (lines 219-223): Replace with:
  ```tsx
  className={`w-full ${isPaused ? "btn-outline-green" : "btn-outline-red"}`}
  ```
- Allocate button (line 252): Replace with `className="w-full btn-outline-amber"`

**Step 7: Update status messages**

Replace the 4 conditional status message patterns. Each looks like:
```tsx
{mintStatus && (
  <p className={`text-xs ${mintStatus.type === "success" ? "text-bond-green" : "text-bond-red"}`}>
    {mintStatus.msg}
  </p>
)}
```

Replace with:
```tsx
{mintStatus && (
  <p className={mintStatus.type === "success" ? "status-msg-success" : "status-msg-error"}>
    {mintStatus.msg}
  </p>
)}
```

Do this for all 4: `mintStatus` (line 173), `freezeStatus` (line 200), `pauseStatus` (line 226), `proceedsStatus` (line 255).

Note: The `pauseStatus` one also has `mt-2` — keep that: `className={\`mt-2 ${...}\`}`.

**Step 8: Verify**

Run: `cd frontend && npm run build && npm run lint && npm run test:unit`
Expected: All pass. No functional changes — purely cosmetic refactor.

**Step 9: Commit**

```bash
git add frontend/app/issue/page.tsx
git commit -m "refactor: adopt shared CSS classes and components in issuer dashboard"
```

---

## Task 5: Adopt New Classes in Investor Portal (page.tsx)

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1: Update imports**

Add:
```tsx
import { Card } from "@/components/ui/card";
```

**Step 2: Replace card container (line 54)**

Replace `<div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">` with `<Card>` (and closing `</div>` → `</Card>`).

**Step 3: Update card heading (line 55)**

Replace `<h3 className="text-lg font-semibold text-white mb-4">` with `<h3 className="card-title">`.

**Step 4: Update stat labels (lines 61, 66)**

Replace `text-[11px] text-text-muted uppercase tracking-widest mb-1` with `stat-label mb-1`.

**Step 5: Verify**

Run: `cd frontend && npm run build && npm run lint`
Expected: Pass.

**Step 6: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "refactor: adopt shared CSS classes in investor portal"
```

---

## Task 6: Adopt New Classes in Monitor Page

**Files:**
- Modify: `frontend/app/monitor/page.tsx`

**Step 1: Update page title (line 14)**

Replace `<h1 className="text-2xl font-semibold text-white">` with `<h1 className="page-title">`.

**Step 2: Update metric card containers (lines 17, 28, 39)**

Replace each `<div className="bg-surface-2 border border-border rounded-xl p-5 card-glow">` with `<div className="card p-5">`.

Note: These use `p-5` not the default `p-6`, so we use the CSS class directly with an override rather than the `<Card>` component.

**Step 3: Update stat labels (lines 19, 30, 41)**

Replace `text-[11px] text-text-muted uppercase tracking-widest` with `stat-label`.

**Step 4: Verify**

Run: `cd frontend && npm run build && npm run lint`
Expected: Pass.

**Step 5: Commit**

```bash
git add frontend/app/monitor/page.tsx
git commit -m "refactor: adopt shared CSS classes in compliance monitor"
```

---

## Task 7: Adopt New Classes in Components

Update all 8 component files. This task covers each one.

**Files:**
- Modify: `frontend/components/bond-details.tsx`
- Modify: `frontend/components/compliance-status.tsx`
- Modify: `frontend/components/transfer-flow.tsx`
- Modify: `frontend/components/audit-event-feed.tsx`
- Modify: `frontend/components/project-allocation.tsx`
- Modify: `frontend/components/error-boundary.tsx`
- Modify: `frontend/components/wallet-button.tsx`

### 7a: bond-details.tsx

- Line 16: Replace `<div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">` with `<div className="card-flush">`
- Line 27: Replace `text-lg font-semibold text-white` with `card-title mb-0` (this heading has no `mb-4` in the original since it's in a header row, so we override margin)
  - Actually this heading is inside a flex row so `mb-4` would be wrong. Use: `<h1 className="text-lg font-semibold text-white">` — keep as-is since it's in a different context (flex header, not standalone heading). Only update the stat labels.
- Lines 39, 43, 47, 51: Replace `text-[11px] text-text-muted uppercase tracking-widest mb-1` with `stat-label mb-1`

### 7b: compliance-status.tsx

- Line 124: Replace `<div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">` with `<div className="card">`
- Line 125: Replace `<h3 className="text-lg font-semibold text-white mb-3">` with `<h3 className="card-title mb-3">`
  - Note this one uses `mb-3` not `mb-4`, so we override: `card-title mb-3` (the `mb-4` from `card-title` will be overridden by the later `mb-3` in the cascade... actually `@apply` produces flat utilities, so we need to be careful here).
  - Simpler: just keep it as `<h3 className="card-title">` and accept the `mb-4` (visually negligible 4px difference), OR keep the original class string for this specific heading. Let's keep `card-title` since 1px difference is negligible.
- Line 135: Replace `<div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">` with `<div className="card-flush">`
- Line 139: Replace `<h3 className="text-lg font-semibold text-white">` with `<h3 className="text-lg font-semibold text-white">` — keep as-is (this heading is inside a flex header with no bottom margin)
- Line 157: Replace `<span className="inline-block w-4 h-4 border-2 border-text-muted/40 border-t-text-muted rounded-full animate-spin"` with `<span className="spinner"`

### 7c: transfer-flow.tsx

- Line 132: Replace `<div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">` with `<div className="card">`
- Line 133: Replace heading with `<h3 className="card-title">`
- Line 151: Replace the long input className with `className="input flex-1"`
  - Note: original has `flex-1` and `disabled:opacity-40` in addition. `disabled:opacity-40` isn't in our `.input` class — add it. Actually, looking at the original: `flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-bond-green/40 focus:ring-1 focus:ring-bond-green/20 disabled:opacity-40 transition-colors`. Our `.input` class doesn't include `disabled:opacity-40` — we should add it to the `.input` class definition in Task 1. Update Task 1's `.input` to include `disabled:opacity-40`. Also, the original has `flex-1` instead of `w-full`. Use: `className="input flex-1"` and override `w-full` won't matter since `flex-1` controls sizing in a flex container.
- Line 156: Replace button className with `className="btn-primary px-6"`
- Line 177: Replace spinner with `className="spinner-amber"`

### 7d: audit-event-feed.tsx

- Lines 34, 50: Replace `<div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">` with `<div className="card">`
- Lines 35, 51: Replace heading with `<h3 className="card-title">`
- Line 55: Replace spinner with `<span className="spinner" aria-hidden="true" />`
- Line 63: Replace `<div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">` with `<div className="card-flush">`

### 7e: project-allocation.tsx

- Line 41: Replace `<div className="bg-surface-2 border border-border rounded-xl p-6">` with `<div className="card">`
  - Note: This card does NOT have `card-glow`. But our `.card` class includes it. Either: accept the glow (it's subtle and consistent), or use the raw classes. Let's accept the glow — it makes the page consistent.
- Line 42: Replace heading with `<h3 className="card-title">`

### 7f: error-boundary.tsx

- Import `EmptyState` at top:
  ```tsx
  import { EmptyState } from "@/components/ui/empty-state";
  ```
- Replace lines 27-44 (the error render) with:
  ```tsx
  <EmptyState
    variant="danger"
    icon={<svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
    title="Something went wrong"
    description={this.state.error?.message || "An unexpected error occurred. Try reloading the page."}
    action={
      <button onClick={() => window.location.reload()} className="btn-primary px-6">
        Reload Page
      </button>
    }
    wrapperClassName="min-h-screen bg-surface flex items-center justify-center p-8"
  />
  ```
  Keep the `role="alert" aria-live="assertive"` — add these to the outer wrapper. Actually, the EmptyState component doesn't support arbitrary attributes on the wrapper. Two options:
  1. Wrap EmptyState in a div with those attrs
  2. Keep the manual markup for error-boundary since it's a class component with unique needs

  Let's go with option 1 — wrap it:
  ```tsx
  <div role="alert" aria-live="assertive">
    <EmptyState ... />
  </div>
  ```

  Note: `EmptyState`'s `description` prop is typed as `string`, but `error-boundary.tsx` needs to pass a potentially-undefined value. The `||` fallback already produces a string, so this is fine.

### 7g: wallet-button.tsx

- Line 42: Replace the connect button className with `className="btn-primary px-4 py-2 shadow-[0_0_12px_rgba(34,197,94,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"`
  - This button has unique focus-visible styling (white outline instead of green) and unique padding (`px-4 py-2` instead of `py-2.5`). The `.btn-primary` class gives us the base, but we need overrides. Since there are so many overrides, it may be cleaner to keep the original classes here. **Decision: keep as-is** — this button is unique enough that forcing it into the shared class hurts readability.

**Step 2: Verify everything compiles and tests pass**

Run from repo root: `npm run build && npm run lint && npm run test:unit`
Expected: All pass.

**Step 3: Commit**

```bash
git add frontend/components/
git commit -m "refactor: adopt shared CSS classes and EmptyState across all components"
```

---

## Task 8: Update .input Class to Include disabled:opacity-40

This was identified during Task 7c — the input in `transfer-flow.tsx` has `disabled:opacity-40` which our `.input` class should include since inputs can be disabled.

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Update the .input class**

Change the `.input` definition to add `disabled:opacity-40`:

```css
.input {
  @apply w-full bg-surface-3 border border-border rounded-lg px-4 py-2.5 text-white text-sm
    placeholder:text-text-muted/60
    focus:outline-none focus:border-bond-green/40 focus:ring-1 focus:ring-bond-green/20
    disabled:opacity-40
    transition-colors;
}
```

**Step 2: Verify**

Run: `cd frontend && npm run build`
Expected: Pass.

**Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "fix: add disabled state to .input utility class"
```

**Note:** This task should actually be done as part of Task 1 (add it to the initial class definition). Listing it separately for visibility — when executing, fold it into Task 1.

---

## Task 9: Visual Regression Check

**Files:** None (manual verification)

**Step 1: Start the dev server**

Run: `cd frontend && npm run dev`

**Step 2: Check each page visually**

Open in browser and verify:
1. `http://localhost:3000/` — Investor portal: cards render correctly, stat labels styled, portfolio section intact
2. `http://localhost:3000/issue` — Issuer dashboard: empty states look correct (connect wallet, not authorized), form inputs styled, buttons have correct colors
3. `http://localhost:3000/monitor` — Compliance monitor: metric cards styled, stat labels correct

**Step 3: Check with wallet connected**

Connect a demo wallet and verify:
- Compliance checks render with spinners
- Purchase flow input and button are styled
- Issue page forms and buttons work visually

**Step 4: Run E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All 43 tests pass. If any fail due to selector changes (unlikely since we didn't change structure), investigate.

**Step 5: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: visual regression fixes from CSS consolidation"
```

---

## Task 10: Final Build Verification and Cleanup

**Step 1: Full build from repo root**

Run: `npm run build && npm run lint && npm run test:unit`
Expected: All pass.

**Step 2: Check for any remaining long className strings**

Search for any className strings longer than 80 characters that could benefit from the new classes:

Run: `grep -rn 'className="[^"]\{80,\}' frontend/ --include='*.tsx'`

Review results — if any are patterns we've already extracted, update them. If they're unique one-offs, leave them.

**Step 3: Final commit**

```bash
git add -A
git commit -m "refactor: complete UI CSS consolidation"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `frontend/app/globals.css` | +~50 lines of utility CSS classes |
| `frontend/components/ui/card.tsx` | New file (~12 lines) |
| `frontend/components/ui/empty-state.tsx` | New file (~30 lines) |
| `frontend/app/issue/page.tsx` | Adopt Card, EmptyState, CSS classes (~40 lines shorter) |
| `frontend/app/page.tsx` | Adopt Card, CSS classes (~5 lines shorter) |
| `frontend/app/monitor/page.tsx` | Adopt CSS classes (~10 lines shorter) |
| `frontend/components/bond-details.tsx` | Adopt card-flush, stat-label |
| `frontend/components/compliance-status.tsx` | Adopt card, card-flush, card-title, spinner |
| `frontend/components/transfer-flow.tsx` | Adopt card, card-title, input, btn-primary, spinner-amber |
| `frontend/components/audit-event-feed.tsx` | Adopt card, card-flush, card-title, spinner |
| `frontend/components/project-allocation.tsx` | Adopt card, card-title |
| `frontend/components/error-boundary.tsx` | Adopt EmptyState, btn-primary |
| `frontend/components/wallet-button.tsx` | No changes (unique enough to keep inline) |
| `frontend/components/nav.tsx` | No changes (already uses its own `navLinkClass` helper) |
