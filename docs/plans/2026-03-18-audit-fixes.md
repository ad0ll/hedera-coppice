# Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 23 audit issues (C1-C2, H1-H6, M1-M9, L1-L4, L7) plus 4 longer-term items (error boundaries, loading skeletons, env-var addresses, server-side address derivation) while keeping all 104 unit tests and 67 E2E tests passing.

**Architecture:** Seven work packages, ordered so foundation pieces (shared components, contrast fixes) land first, then accessibility semantics, theming, responsive layout, performance, error resilience, and finally the API security refactor. Each WP is independently committable.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, ethers v6, Zod, vitest, Playwright

---

## WP1: ProgressBar Component + Contrast Fixes (C1, C2, item 10)

Creates a shared `<ProgressBar>` component with ARIA attrs, replaces 5 hand-rolled progress bars, and fixes all low-contrast text.

### Task 1.1: Create ProgressBar component

**Files:**
- Create: `frontend/components/ui/progress-bar.tsx`

**Step 1: Create the component**

```tsx
interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: "green" | "amber";
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max,
  label,
  color = "green",
  size = "md",
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = color === "green" ? "bg-bond-green" : "bg-bond-amber";
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`w-full ${height} bg-surface-3 rounded-full overflow-hidden`}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | head -5`

**Step 3: Commit**

```
git add frontend/components/ui/progress-bar.tsx
git commit -m "feat: add shared ProgressBar component with ARIA progressbar role"
```

### Task 1.2: Replace progress bars in spt-status.tsx

**Files:**
- Modify: `frontend/components/guardian/spt-status.tsx`

**Step 1: Replace compact variant bar (lines 30-35)**

Replace:
```tsx
<div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-700 ${met ? "bg-bond-green" : "bg-bond-amber"}`}
    style={{ width: `${progress}%` }}
  />
</div>
```

With:
```tsx
<ProgressBar
  value={totalVerified}
  max={target}
  label="SPT Progress"
  color={met ? "green" : "amber"}
  size="sm"
/>
```

**Step 2: Replace full variant bar (lines 62-66)**

Replace:
```tsx
<div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-700 ${met ? "bg-bond-green" : "bg-bond-amber"}`}
    style={{ width: `${progress}%` }}
  />
</div>
```

With:
```tsx
<ProgressBar
  value={totalVerified}
  max={target}
  label="Sustainability Performance Target progress"
  color={met ? "green" : "amber"}
/>
```

Add import: `import { ProgressBar } from "@/components/ui/progress-bar";`

Remove the now-unused `progress` variable only if not used elsewhere (it IS still used in the `{progress.toFixed(1)}%` text on line 69 of the full variant, so keep it).

### Task 1.3: Replace progress bar in allocation-bar.tsx

**Files:**
- Modify: `frontend/components/guardian/allocation-bar.tsx`

**Step 1: Replace bar (lines 24-29)**

Replace:
```tsx
<div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
  <div
    className="h-full bg-bond-green rounded-full transition-all duration-700"
    style={{ width: `${percent}%` }}
  />
</div>
```

With:
```tsx
<ProgressBar
  value={allocated}
  max={total}
  label="Use of proceeds allocation"
/>
```

Add import: `import { ProgressBar } from "@/components/ui/progress-bar";`

### Task 1.4: Replace progress bars in project-allocation.tsx

**Files:**
- Modify: `frontend/components/project-allocation.tsx`

**Step 1: Replace category bars (lines 49-53)**

Replace:
```tsx
<div className="h-2 bg-surface-3 rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
    style={{ width: `${pct}%` }}
  />
</div>
```

With:
```tsx
<ProgressBar
  value={total}
  max={grandTotal}
  label={`${category} allocation`}
/>
```

Add import: `import { ProgressBar } from "@/components/ui/progress-bar";`

Note: This replaces the category-colored bars with green bars. The category colors in `CATEGORY_COLORS` were unused visual differentiation. The ProgressBar's ARIA semantics are more important. If category-specific colors are needed, extend ProgressBar's `color` prop later (YAGNI for now).

### Task 1.5: Replace progress bar in impact-summary.tsx

**Files:**
- Modify: `frontend/components/guardian/impact-summary.tsx`

The `impact-summary.tsx` already uses `<SptStatus variant="compact">` which was fixed in Task 1.2. No additional changes needed. Verify by reading the file.

### Task 1.6: Fix all low-contrast text

**Files:**
- Modify: `frontend/components/ui/step-progress.tsx`
- Modify: `frontend/components/compliance-status.tsx`
- Modify: `frontend/components/audit-event-feed.tsx`
- Modify: `frontend/components/issuer-activity-feed.tsx`
- Modify: `frontend/components/guardian/guardian-events.tsx`

**Step 1: Fix step-progress.tsx line 34**

Replace `"text-text-muted/40"` with `"text-text-muted"` (pending steps).

**Step 2: Fix compliance-status.tsx line 489**

Replace `"text-text-muted/40"` with `"text-text-muted"` (pending onboard steps).

**Step 3: Fix audit-event-feed.tsx lines 101-102**

Replace:
```tsx
<span className="text-text-muted/50">{k}:</span>{" "}
<span className="text-white/70 font-mono">{v}</span>
```

With:
```tsx
<span className="text-text-muted">{k}:</span>{" "}
<span className="text-white font-mono">{v}</span>
```

**Step 4: Fix issuer-activity-feed.tsx line 58**

Replace `"text-[11px] text-text-muted/60 shrink-0"` with `"text-[11px] text-text-muted shrink-0"`.

**Step 5: Fix guardian-events.tsx line 131**

Replace `"text-[10px] text-text-muted/60 mt-1 font-mono"` with `"text-[10px] text-text-muted mt-1 font-mono"`.

### Task 1.7: Run tests, lint, build

**Step 1: Run all checks**

Run: `npm run lint` from repo root
Run: `npm run build` from repo root
Run: `npm run test:unit` from repo root

Expected: All pass (no tests reference opacity values directly).

**Step 2: Commit**

```
git add -A
git commit -m "fix(a11y): replace hand-rolled progress bars with ARIA-compliant ProgressBar, fix low-contrast text"
```

---

## WP2: Accessibility Semantics (H1, H3, M1-M4, L1-L2)

### Task 2.1: Add tab semantics to monitor page (H1)

**Files:**
- Modify: `frontend/app/monitor/page.tsx`

**Step 1: Add ARIA tab roles to the tab toggle (lines 38-55)**

Replace:
```tsx
<div className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
  <button
    onClick={() => setTab("onchain")}
    className={`px-4 py-2 text-sm rounded-md transition-colors ${
      tab === "onchain" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
    }`}
  >
    On-Chain Events
  </button>
  <button
    onClick={() => setTab("guardian")}
    className={`px-4 py-2 text-sm rounded-md transition-colors ${
      tab === "guardian" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
    }`}
  >
    Guardian Verification
  </button>
</div>
```

With:
```tsx
<div role="tablist" aria-label="Event source" className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
  <button
    role="tab"
    aria-selected={tab === "onchain"}
    aria-controls="panel-onchain"
    onClick={() => setTab("onchain")}
    className={`px-4 py-2 text-sm rounded-md transition-colors ${
      tab === "onchain" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
    }`}
  >
    On-Chain Events
  </button>
  <button
    role="tab"
    aria-selected={tab === "guardian"}
    aria-controls="panel-guardian"
    onClick={() => setTab("guardian")}
    className={`px-4 py-2 text-sm rounded-md transition-colors ${
      tab === "guardian" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
    }`}
  >
    Guardian Verification
  </button>
</div>
```

**Step 2: Add tabpanel role to tab content (line 57-63)**

Replace:
```tsx
<div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
  {tab === "onchain" ? (
    <AuditEventFeed topicType="audit" />
  ) : (
    <GuardianEvents />
  )}
</div>
```

With:
```tsx
<div
  id={`panel-${tab}`}
  role="tabpanel"
  aria-label={tab === "onchain" ? "On-Chain Events" : "Guardian Verification"}
  className="animate-entrance"
  style={{ "--index": 3 } as React.CSSProperties}
>
  {tab === "onchain" ? (
    <AuditEventFeed topicType="audit" />
  ) : (
    <GuardianEvents />
  )}
</div>
```

### Task 2.2: Add filter button group semantics to audit-event-feed (M1)

**Files:**
- Modify: `frontend/components/audit-event-feed.tsx`

**Step 1: Add role="group" and aria-pressed to filter buttons (lines 55-69)**

Replace:
```tsx
<div className="flex gap-1.5 px-6 py-3 border-b border-border/30 flex-wrap">
  {eventTypes.map((type) => (
    <button
      key={type}
      onClick={() => setFilter(type)}
      className={`text-xs px-3 py-2 min-h-[44px] min-w-[44px] rounded-md transition-colors ${
        filter === type
          ? "bg-surface-3 text-white border border-border/50"
          : "text-text-muted hover:text-white hover:bg-surface-3/50"
      }`}
    >
      {type}
    </button>
  ))}
</div>
```

With:
```tsx
<div role="group" aria-label="Filter by event type" className="flex gap-1.5 px-6 py-3 border-b border-border/30 flex-wrap">
  {eventTypes.map((type) => (
    <button
      key={type}
      aria-pressed={filter === type}
      onClick={() => setFilter(type)}
      className={`text-xs px-3 py-2 min-h-[44px] min-w-[44px] rounded-md transition-colors ${
        filter === type
          ? "bg-surface-3 text-white border border-border/50"
          : "text-text-muted hover:text-white hover:bg-surface-3/50"
      }`}
    >
      {type}
    </button>
  ))}
</div>
```

### Task 2.3: Add aria-atomic to compliance-status live region (M2)

**Files:**
- Modify: `frontend/components/compliance-status.tsx`

**Step 1: Add aria-atomic to onboarding steps live region (line 460)**

The line reads:
```tsx
<div className="px-6 py-4 border-t border-border/50 border-l-2 border-l-bond-amber bg-bond-amber/5" aria-live="polite">
```

Add `aria-atomic="true"`:
```tsx
<div className="px-6 py-4 border-t border-border/50 border-l-2 border-l-bond-amber bg-bond-amber/5" aria-live="polite" aria-atomic="true">
```

### Task 2.4: Add aria-label to HashScan link icon in holders-table (M3)

**Files:**
- Modify: `frontend/components/holders-table.tsx`

**Step 1: Add aria-label to the icon-only external link (lines 81-89)**

The link already has `title="View on HashScan"`. Add `aria-label`:

Replace:
```tsx
<a
  href={`https://hashscan.io/testnet/account/${h.address}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-text-muted hover:text-bond-green transition-colors"
  title="View on HashScan"
>
  <ExternalLinkIcon />
</a>
```

With:
```tsx
<a
  href={`https://hashscan.io/testnet/account/${h.address}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-text-muted hover:text-bond-green transition-colors"
  aria-label="View on HashScan"
>
  <ExternalLinkIcon />
</a>
```

### Task 2.5: Add minimum touch target size to Guardian links (M4)

**Files:**
- Modify: `frontend/components/guardian/guardian-events.tsx`

**Step 1: Add padding to IPFS/HashScan links (lines 136-139)**

Replace:
```tsx
<div className="flex flex-col gap-1 shrink-0">
  <a href={ipfsUrl(event.evidence.hash)} target="_blank" rel="noopener noreferrer"
    className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">IPFS</a>
  <a href={hashScanUrl(event.evidence.topicId, event.evidence.messageId)} target="_blank" rel="noopener noreferrer"
    className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">HashScan</a>
</div>
```

With:
```tsx
<div className="flex flex-col gap-1 shrink-0">
  <a href={ipfsUrl(event.evidence.hash)} target="_blank" rel="noopener noreferrer"
    className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors px-1.5 py-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">IPFS</a>
  <a href={hashScanUrl(event.evidence.topicId, event.evidence.messageId)} target="_blank" rel="noopener noreferrer"
    className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors px-1.5 py-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">HashScan</a>
</div>
```

### Task 2.6: Fix heading hierarchy in issue page (H3)

**Files:**
- Modify: `frontend/app/issue/page.tsx`

The issue page has `<h1>` "Issuer Dashboard" at line 261, then jumps to `<h3>` inside the operation cards. Since these headings are inside `<Card>` components (which are visually cards, not document sections), and `card-title` class is applied to `<h3>` tags, the fix is to change the operation card headings from `<h3>` to `<h2>`:

**Step 1: Change all `<h3 className="card-title">` to `<h2 className="card-title">` in the following components:**

Note: These are inside child components, so the fix is in the components themselves:

- `frontend/components/holders-table.tsx` lines 18, 31 — `<h3>` to `<h2>`
- `frontend/components/audit-event-feed.tsx` lines 20, 34, 48 — `<h3>` to `<h2>`
- `frontend/components/issuer-activity-feed.tsx` line 36 — `<h3>` to `<h2>`
- `frontend/components/project-allocation.tsx` line 22 — `<h3>` to `<h2>`
- `frontend/components/compliance-status.tsx` lines 340, 364 — `<h3>` to `<h2>`
- `frontend/components/transfer-flow.tsx` line 137 — `<h3>` to `<h2>`

**Step 2: Fix loading state card class in issue page line 214**

Replace `<div className="card p-12 text-center">` with `<div className="card-static p-12 text-center">` — loading states shouldn't have hover glow.

### Task 2.7: Add aria-hidden to decorative SVGs (L1)

**Files:**
- Modify: `frontend/components/bond-details.tsx`
- Modify: `frontend/app/coupons/page.tsx`

**Step 1: bond-details.tsx line 22 — add aria-hidden to bond icon SVG**

Replace:
```tsx
<svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
```

With:
```tsx
<svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
```

**Step 2: coupons/page.tsx lines 76-88 and 109-121 — add aria-hidden to decorative SVGs**

Both SVGs in the error and empty states already wrap `EmptyState` which uses the SVG as the `icon` prop. Add `aria-hidden="true"` to both `<svg>` elements:

Line 76:
```tsx
<svg
  className="w-6 h-6 text-bond-red"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth="1.5"
  aria-hidden="true"
>
```

Line 109:
```tsx
<svg
  className="w-6 h-6 text-text-muted"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth="1.5"
  aria-hidden="true"
>
```

### Task 2.8: Add role="alert" to impact page error (L2)

**Files:**
- Modify: `frontend/app/impact/page.tsx`

**Step 1: Add role="alert" to Guardian error message (lines 83-91)**

Replace:
```tsx
<div
  className="card-static border-bond-amber/30 animate-entrance"
  style={{ "--index": 2 } as React.CSSProperties}
>
```

With:
```tsx
<div
  role="alert"
  className="card-static border-bond-amber/30 animate-entrance"
  style={{ "--index": 2 } as React.CSSProperties}
>
```

### Task 2.9: Run tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

Expected: All pass.

```
git add -A
git commit -m "fix(a11y): tab semantics, heading hierarchy, ARIA labels, aria-hidden decorative SVGs"
```

---

## WP3: Theming Fixes (H4, M5, M9)

### Task 3.1: Fix z-index overlap on body overlays (H4)

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Lower body::before z-index from 50 to 1 (line 35)**

Replace: `z-index: 50;` with `z-index: 1;` in `body::before`.

**Step 2: Lower body::after z-index from 50 to 1 (line 44)**

Replace: `z-index: 50;` with `z-index: 1;` in `body::after`.

The nav uses Tailwind's `z-50` which is `z-index: 50`. Setting the decorative overlays to `z-index: 1` ensures they never compete with interactive elements.

### Task 3.2: Replace off-palette blue color in guardian-events (M5)

**Files:**
- Modify: `frontend/components/guardian/guardian-events.tsx`

**Step 1: Replace line 83 blue color with bond-teal**

Replace:
```tsx
mrv: "bg-blue-500/15 text-blue-400",
```

With:
```tsx
mrv: "bg-bond-teal/15 text-bond-teal",
```

`bond-teal` (#14b8a6) is already in the design system and semantically fits MRV reports (environmental/data).

### Task 3.3: Fix loading card hover glow on issuer page (M9)

Already addressed in Task 2.6, Step 2 (changed `.card` to `.card-static` for the loading state). No additional work.

### Task 3.4: Run tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

```
git add -A
git commit -m "fix(theme): lower decorative overlay z-index, replace off-palette blue with bond-teal"
```

---

## WP4: Responsive Design Fixes (H2, H5, H6, M6-M8, L4)

### Task 4.1: Add overflow-x-auto to holders table for mobile (H2)

**Files:**
- Modify: `frontend/components/holders-table.tsx`

The table already has `overflow-x-auto` on its wrapper div (line 40). **No change needed** -- verified by re-reading. The scrollable wrapper handles mobile.

### Task 4.2: Improve portfolio balance section for narrow screens (H5)

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1: Replace flex+divide-x with responsive grid (lines 83-97)**

Replace:
```tsx
<div className="bg-surface-2 border-y border-border full-bleed">
  <div className="max-w-7xl mx-auto flex divide-x divide-border">
    <div className="flex-1 py-5 pr-6">
```

With:
```tsx
<div className="bg-surface-2 border-y border-border full-bleed">
  <div className="max-w-7xl mx-auto grid grid-cols-2 divide-x divide-border">
    <div className="py-5 pr-6">
```

And change the second cell:
```tsx
<div className="flex-1 py-5 pl-6">
```

To:
```tsx
<div className="py-5 pl-6">
```

This uses a proper 2-column grid which won't break at narrow widths.

### Task 4.3: Fix mobile nav touch target and gap (H6)

**Files:**
- Modify: `frontend/components/nav.tsx`

**Step 1: Increase hamburger padding from p-2 to p-2.5 (line 46)**

Replace: `className="sm:hidden p-2 rounded-lg` with `className="sm:hidden p-2.5 rounded-lg`

This increases the touch target from ~36px to ~44px.

**Step 2: Change mobile menu gap from gap-2 to gap-1 and allow wrapping (line 64)**

Replace:
```tsx
<div className="px-4 py-3 flex gap-2">
```

With:
```tsx
<div className="px-4 py-3 flex flex-wrap gap-1">
```

### Task 4.4: Responsive grid gaps (M6)

**Files:**
- Modify: `frontend/components/bond-details.tsx`
- Modify: `frontend/app/coupons/page.tsx`
- Modify: `frontend/app/impact/page.tsx`

**Step 1: bond-details.tsx line 37**

Replace: `gap-8` with `gap-4 sm:gap-8`

**Step 2: coupons/page.tsx line 146**

Replace: `gap-8` with `gap-4 sm:gap-8` in the summary banner grid.

**Step 3: impact/page.tsx line 69**

Replace: `gap-8` with `gap-4 sm:gap-8` in the metrics banner grid.

### Task 4.5: Responsive empty-state padding (M7)

**Files:**
- Modify: `frontend/components/ui/empty-state.tsx`

**Step 1: Change p-12 to responsive padding (line 19)**

Replace: `<div className={\`card p-12 text-center ${className}\`}>` with `<div className={\`card p-6 sm:p-12 text-center ${className}\`}>`

### Task 4.6: Fix issuer page grid breakpoint (M8)

**Files:**
- Modify: `frontend/app/issue/page.tsx`

**Step 1: Change lg:grid-cols-2 to md:grid-cols-2 (line 288)**

Replace: `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` with `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`

### Task 4.7: Fix monitor page stats for narrow screens (L4)

**Files:**
- Modify: `frontend/app/monitor/page.tsx`

**Step 1: Change stats from flex+divide-x to responsive grid (lines 20-35)**

Replace:
```tsx
<div className="bg-surface-2 border-y border-border full-bleed animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
  <div className="max-w-7xl mx-auto flex divide-x divide-border">
    <div className="flex-1 py-6 pr-6">
      <p className="stat-label mb-2">Total Events</p>
      <p className="font-display text-5xl text-white">{events.length}</p>
    </div>
    <div className="flex-1 py-6 px-6">
      <p className="stat-label mb-2">Approvals</p>
      <p className="font-display text-5xl text-bond-green">{approvals}</p>
    </div>
    <div className="flex-1 py-6 pl-6">
      <p className="stat-label mb-2">Restrictions</p>
      <p className="font-display text-5xl text-bond-red">{restrictions}</p>
    </div>
  </div>
</div>
```

With:
```tsx
<div className="bg-surface-2 border-y border-border full-bleed animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
  <div className="max-w-7xl mx-auto grid grid-cols-3 divide-x divide-border">
    <div className="py-6 pr-4 sm:pr-6">
      <p className="stat-label mb-2">Total Events</p>
      <p className="font-display text-3xl sm:text-5xl text-white">{events.length}</p>
    </div>
    <div className="py-6 px-4 sm:px-6">
      <p className="stat-label mb-2">Approvals</p>
      <p className="font-display text-3xl sm:text-5xl text-bond-green">{approvals}</p>
    </div>
    <div className="py-6 pl-4 sm:pl-6">
      <p className="stat-label mb-2">Restrictions</p>
      <p className="font-display text-3xl sm:text-5xl text-bond-red">{restrictions}</p>
    </div>
  </div>
</div>
```

### Task 4.8: Fix issuer stats for narrow screens

**Files:**
- Modify: `frontend/components/issuer-stats.tsx`

**Step 1: Change grid breakpoint and add responsive text (line 20)**

Replace:
```tsx
<div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
```

With:
```tsx
<div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
```

### Task 4.9: Run tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

```
git add -A
git commit -m "fix(responsive): grid layouts, touch targets, responsive gaps and padding"
```

---

## WP5: Performance (L7)

### Task 5.1: Add will-change to entrance animation

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Add will-change to .animate-entrance (line 180)**

Replace:
```css
.animate-entrance {
  opacity: 0;
  animation: fade-in-up 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--index, 0) * 80ms);
}
```

With:
```css
.animate-entrance {
  opacity: 0;
  will-change: transform, opacity;
  animation: fade-in-up 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--index, 0) * 80ms);
}
```

Note: `will-change` hints the browser to promote the element to its own compositor layer for the duration of the animation, avoiding layout repaints. It's automatically cleared after the `forwards` fill completes.

### Task 5.2: Run tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

```
git add -A
git commit -m "perf: add will-change hint to entrance animations"
```

---

## WP6: Error Boundaries + Loading Skeletons (items 2, 11)

### Task 6.1: Create SectionErrorBoundary component

**Files:**
- Create: `frontend/components/section-error-boundary.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  section: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-static border-bond-red/20 text-center py-8" role="alert">
          <p className="text-sm text-bond-red mb-1">Failed to load {this.props.section}</p>
          <p className="text-xs text-text-muted">This section encountered an error. Other sections continue to work.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-xs text-bond-green hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Task 6.2: Wrap RPC/Guardian-calling sections with error boundaries

**Files:**
- Modify: `frontend/app/page.tsx` (Invest page)
- Modify: `frontend/app/issue/page.tsx` (Issuer page)
- Modify: `frontend/app/impact/page.tsx` (Impact page)
- Modify: `frontend/app/monitor/page.tsx` (Compliance Monitor page)
- Modify: `frontend/app/coupons/page.tsx` (Coupons page)

**Step 1: Invest page — wrap ImpactSummary, ComplianceStatus, TransferFlow**

Add import: `import { SectionErrorBoundary } from "@/components/section-error-boundary";`

Wrap `<ImpactSummary>` in `<SectionErrorBoundary section="impact summary">`.
Wrap `<ComplianceStatus>` in `<SectionErrorBoundary section="compliance checks">`.
Wrap `<TransferFlow>` in `<SectionErrorBoundary section="purchase flow">`.

**Step 2: Issue page — wrap IssuerStats, HoldersTable, operation cards**

Add import and wrap `<IssuerStats>` in `<SectionErrorBoundary section="issuer stats">`.
Wrap `<HoldersTable>` in `<SectionErrorBoundary section="token holders">`.

**Step 3: Impact page — wrap SptStatus+AllocationBar grid**

Add import and wrap the SPT/Allocation grid in `<SectionErrorBoundary section="impact data">`.

**Step 4: Monitor page — wrap tab content**

Add import and wrap the tabpanel content in `<SectionErrorBoundary section="event feed">`.

**Step 5: Coupons page — wrap the coupon list section**

Add import and wrap the `<section>` containing coupon periods in `<SectionErrorBoundary section="coupon schedule">`.

### Task 6.3: Add loading skeleton to issuer stats

**Files:**
- Modify: `frontend/components/issuer-stats.tsx`

**Step 1: Add skeleton variant when data is loading**

The IssuerStats component receives `totalSupply` which is `undefined` during loading. Currently shows `"--"`. That's fine for the stat value, but the component could also show a loading skeleton. However, re-reading the component, the `"--"` pattern is already adequate for data not yet loaded. The existing behavior is consistent with the rest of the app. **Skip this skeleton** — it's cosmetically fine.

### Task 6.4: Run tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

```
git add -A
git commit -m "fix: add per-section error boundaries for RPC/Guardian-calling components"
```

---

## WP7: Address Derivation from Signatures + Env Var Addresses (items 5, 7)

This is the largest WP. It removes the untrusted `investorAddress`/`signerAddress`/`address` fields from 5 API route schemas and instead derives the caller's address from the signed message. It also moves remaining hard-coded addresses to env vars.

### Task 7.1: Add recoverAuthAddress to auth.ts

**Files:**
- Modify: `frontend/lib/auth.ts`

**Step 1: Add new function**

After the existing `verifyAuth` function, add:

```typescript
/**
 * Server-side: recover the signer's address from an EIP-191 signature.
 * Validates timestamp freshness (same rules as verifyAuth).
 * Returns the checksummed recovered address.
 */
export function recoverAuthAddress(
  message: string,
  signature: string,
): string {
  validateTimestamp(message);
  return ethers.verifyMessage(message, signature);
}
```

### Task 7.2: Add recoverAddressOrError to api-helpers.ts

**Files:**
- Modify: `frontend/lib/api-helpers.ts`

**Step 1: Add new function and keep old one for backwards compat during migration**

Add import of `recoverAuthAddress` from auth.ts, then add:

```typescript
/**
 * Recover the signer address from a signed message, or return a 401 response.
 * Returns the checksummed address on success.
 */
export function recoverAddressOrError(
  message: string,
  signature: string,
): { address: string } | { error: NextResponse } {
  try {
    const address = recoverAuthAddress(message, signature);
    return { address };
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return { error: NextResponse.json({ error: msg }, { status: 401 }) };
  }
}
```

Update import line to include `recoverAuthAddress`:
```typescript
import { verifyAuth, recoverAuthAddress } from "@/lib/auth";
```

### Task 7.3: Migrate purchase route

**Files:**
- Modify: `frontend/app/api/purchase/route.ts`

**Step 1: Remove investorAddress from schema**

Replace:
```typescript
const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

With:
```typescript
const purchaseBodySchema = z.object({
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Replace auth flow in POST handler**

Replace:
```typescript
const { investorAddress, amount, message, signature } = bodyResult.data;
const investor = ethers.getAddress(investorAddress);
const authError = await verifyAuthOrError(message, signature, investor);
if (authError) return authError;
```

With:
```typescript
const { amount, message, signature } = bodyResult.data;
const authResult = recoverAddressOrError(message, signature);
if ("error" in authResult) return authResult.error;
const investor = authResult.address;
```

Update imports: replace `verifyAuthOrError` with `recoverAddressOrError` in the import from `@/lib/api-helpers`.

### Task 7.4: Migrate onboard route

**Files:**
- Modify: `frontend/app/api/onboard/route.ts`

**Step 1: Remove investorAddress from schema**

Replace:
```typescript
const onboardBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  country: z.number().int().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

With:
```typescript
const onboardBodySchema = z.object({
  country: z.number().int().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Replace auth flow**

Replace:
```typescript
const { investorAddress, country, message, signature } = bodyResult.data;
const addrResult = normalizeAddress(investorAddress);
if ("error" in addrResult) return addrResult.error;
const investor = addrResult.address;
const authError = await verifyAuthOrError(message, signature, investor);
if (authError) return authError;
```

With:
```typescript
const { country, message, signature } = bodyResult.data;
const authResult = recoverAddressOrError(message, signature);
if ("error" in authResult) return authResult.error;
const investor = authResult.address;
```

Update imports: add `recoverAddressOrError` from `@/lib/api-helpers`, remove `verifyAuthOrError` if no longer used, remove `normalizeAddress` if no longer used.

### Task 7.5: Migrate allocate route

**Files:**
- Modify: `frontend/app/api/issuer/allocate/route.ts`

**Step 1: Remove signerAddress from schema**

Replace:
```typescript
const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  signerAddress: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

With:
```typescript
const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Replace auth flow**

Replace:
```typescript
const { project, category, amount, currency, signerAddress, message: authMessage, signature } = bodyResult.data;
const authError = await verifyAuthOrError(authMessage, signature, signerAddress);
if (authError) return authError;
```

With:
```typescript
const { project, category, amount, currency, message: authMessage, signature } = bodyResult.data;
const authResult = recoverAddressOrError(authMessage, signature);
if ("error" in authResult) return authResult.error;
```

Update imports: replace `verifyAuthOrError` with `recoverAddressOrError`.

### Task 7.6: Migrate distribute-coupon route

**Files:**
- Modify: `frontend/app/api/issuer/distribute-coupon/route.ts`

**Step 1: Remove address from schema**

Replace:
```typescript
const distributeBodySchema = z.object({
  couponId: z.number().int().nonnegative(),
  address: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

With:
```typescript
const distributeBodySchema = z.object({
  couponId: z.number().int().nonnegative(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Replace auth flow**

Replace:
```typescript
const { couponId, address, message: authMessage, signature } = bodyResult.data;
const signerAddress = ethers.getAddress(address);
const authError = await verifyAuthOrError(authMessage, signature, signerAddress);
if (authError) return authError;
```

With:
```typescript
const { couponId, message: authMessage, signature } = bodyResult.data;
const authResult = recoverAddressOrError(authMessage, signature);
if ("error" in authResult) return authResult.error;
```

Update imports: replace `verifyAuthOrError` with `recoverAddressOrError`.

### Task 7.7: Migrate grant-agent-role route

**Files:**
- Modify: `frontend/app/api/demo/grant-agent-role/route.ts`

**Step 1: Remove investorAddress from schema**

Replace:
```typescript
const bodySchema = z.object({
  investorAddress: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

With:
```typescript
const bodySchema = z.object({
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
```

**Step 2: Replace auth flow**

Replace:
```typescript
const { investorAddress, message, signature } = bodyResult.data;
const addrResult = normalizeAddress(investorAddress);
if ("error" in addrResult) return addrResult.error;
const address = addrResult.address;
const authError = await verifyAuthOrError(message, signature, address);
if (authError) return authError;
```

With:
```typescript
const { message, signature } = bodyResult.data;
const authResult = recoverAddressOrError(message, signature);
if ("error" in authResult) return authResult.error;
const address = authResult.address;
```

Update imports: replace `verifyAuthOrError, normalizeAddress` with `recoverAddressOrError`.

### Task 7.8: Update frontend callers (remove address from request bodies)

**Files:**
- Modify: `frontend/components/transfer-flow.tsx`
- Modify: `frontend/components/compliance-status.tsx`
- Modify: `frontend/app/issue/page.tsx`

**Step 1: transfer-flow.tsx — remove investorAddress from purchase body (line 108)**

Replace:
```typescript
body: JSON.stringify({
  investorAddress: address,
  amount: Number(amount),
  message,
  signature,
}),
```

With:
```typescript
body: JSON.stringify({
  amount: Number(amount),
  message,
  signature,
}),
```

**Step 2: compliance-status.tsx — remove investorAddress from onboard body (line 233)**

Replace:
```typescript
body: JSON.stringify({
  investorAddress: address,
  country: selectedCountry,
  message,
  signature,
}),
```

With:
```typescript
body: JSON.stringify({
  country: selectedCountry,
  message,
  signature,
}),
```

**Step 3: issue/page.tsx — remove investorAddress from grant-agent-role body (line 85)**

Replace:
```typescript
body: JSON.stringify({ investorAddress: address, message, signature }),
```

With:
```typescript
body: JSON.stringify({ message, signature }),
```

**Step 4: issue/page.tsx — remove signerAddress from allocate body (line 156)**

Replace:
```typescript
body: JSON.stringify({
  project,
  category,
  amount: Number(proceedsAmount),
  currency: "USD",
  signerAddress: address,
  message: authMessage,
  signature,
}),
```

With:
```typescript
body: JSON.stringify({
  project,
  category,
  amount: Number(proceedsAmount),
  currency: "USD",
  message: authMessage,
  signature,
}),
```

**Step 5: issue/page.tsx — remove address from distribute-coupon body (line 185)**

Replace:
```typescript
body: JSON.stringify({
  couponId: selectedCouponId,
  address,
  message: authMessage,
  signature,
}),
```

With:
```typescript
body: JSON.stringify({
  couponId: selectedCouponId,
  message: authMessage,
  signature,
}),
```

### Task 7.9: Update unit tests for auth changes

**Files:**
- Modify: `frontend/__tests__/api/purchase.test.ts`
- Modify: `frontend/__tests__/api/onboard.test.ts`
- Modify: `frontend/__tests__/api/allocate.test.ts`
- Modify: `frontend/__tests__/api/distribute-coupon.test.ts`
- Modify: `frontend/__tests__/api/grant-agent-role.test.ts`

The tests currently mock `verifyAuth` to accept all signatures. The new flow uses `recoverAuthAddress` which calls `ethers.verifyMessage()` directly. We need to mock `recoverAuthAddress` instead.

**Step 1: Update all 5 test files — change auth mock**

In each test file, replace:
```typescript
const mockVerifyAuth = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));
```

With:
```typescript
const FAKE_RECOVERED_ADDRESS = "<use the test file's fake address constant>";
const mockRecoverAuthAddress = vi.fn().mockReturnValue(FAKE_RECOVERED_ADDRESS);
vi.mock("@/lib/auth", () => ({
  recoverAuthAddress: (...args: unknown[]) => mockRecoverAuthAddress(...args),
}));
```

Use the appropriate address constant for each test file:
- **purchase.test.ts**: `FAKE_ALICE_ADDR` = `"0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762"`
- **onboard.test.ts**: `FAKE_INVESTOR` = `"0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762"`
- **allocate.test.ts**: `"0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE"` (the signer)
- **distribute-coupon.test.ts**: `FAKE_ADDR` = `"0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762"`
- **grant-agent-role.test.ts**: `FAKE_ADDRESS` = `"0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762"`

**Step 2: Update request bodies in test helpers — remove address fields**

In each test file's `makeRequest`/`validBody` helpers, remove the address field:

- **purchase.test.ts**: Remove `investorAddress` from all `makeRequest()` calls. Tests that previously checked `"rejects missing investorAddress"` should be changed to test other validation (amount missing, etc.) or removed if redundant.

- **onboard.test.ts**: Remove `investorAddress` from all `makeRequest()` calls. Tests like "rejects missing investorAddress" and "rejects invalid investor address" should be removed since the address now comes from the signature.

- **allocate.test.ts**: Remove `signerAddress` from `validBody()`. Update "rejects missing auth fields" test to only check for `message`/`signature`.

- **distribute-coupon.test.ts**: Remove `address` from `validBody()`. Update "rejects missing address" test to be "rejects missing message".

- **grant-agent-role.test.ts**: Remove `investorAddress` from all `makeRequest()` calls. Remove "rejects missing investorAddress" and "rejects invalid address" tests.

**Step 3: Update auth rejection tests**

For tests that check `"rejects invalid signature"` / `"rejects when verifyAuth throws"`, change the mock to throw:

Replace:
```typescript
mockVerifyAuth.mockRejectedValueOnce(new Error("Invalid signature"));
```

With:
```typescript
mockRecoverAuthAddress.mockImplementationOnce(() => { throw new Error("Invalid signature"); });
```

**Step 4: Run tests**

Run: `npm run test:unit` from repo root

Fix any failures by adjusting test expectations for the new schema (no address fields in request bodies).

### Task 7.10: Move hard-coded addresses to env vars

**Files:**
- Modify: `frontend/lib/constants.ts`
- Modify: `frontend/.env.local.example`
- Modify: `frontend/.env` (if exists)

**Step 1: Update constants.ts — ATS_RESOLVER and ATS_FACTORY**

Replace:
```typescript
export const ATS_RESOLVER = "0.0.7707874";
export const ATS_FACTORY = "0.0.7708432";
```

With:
```typescript
export const ATS_RESOLVER = process.env.NEXT_PUBLIC_ATS_RESOLVER || "0.0.7707874";
export const ATS_FACTORY = process.env.NEXT_PUBLIC_ATS_FACTORY || "0.0.7708432";
```

**Step 2: Update constants.ts — EUSD_EVM_ADDRESS**

Replace:
```typescript
export const EUSD_EVM_ADDRESS: string = "0x00000000000000000000000000000000007D5999";
```

With:
```typescript
export const EUSD_EVM_ADDRESS: string =
  process.env.NEXT_PUBLIC_EUSD_EVM_ADDRESS || "0x00000000000000000000000000000000007D5999";
```

**Step 3: Update .env.local.example**

Add to the "Public" section:
```
NEXT_PUBLIC_ATS_RESOLVER=0.0.7707874
NEXT_PUBLIC_ATS_FACTORY=0.0.7708432
NEXT_PUBLIC_EUSD_EVM_ADDRESS=0x00000000000000000000000000000000007D5999
```

**Step 4: Update .env if it exists — add the same values**

### Task 7.11: Clean up verifyAuthOrError if unused

**Files:**
- Modify: `frontend/lib/api-helpers.ts`

After migrating all 5 routes, check if `verifyAuthOrError` is still imported anywhere. If not, remove it and the `verifyAuth` import.

Run: `grep -r "verifyAuthOrError" frontend/app frontend/lib --include="*.ts" --include="*.tsx"`

If no results: remove `verifyAuthOrError` and the `verifyAuth` import from `api-helpers.ts`.

Similarly check if `verifyAuth` is imported anywhere. If only used in `api-helpers.ts` and that usage was removed, it's fine to leave it in `auth.ts` since `recoverAuthAddress` lives alongside it.

### Task 7.12: Final tests, lint, build, commit

Run: `npm run lint && npm run build && npm run test:unit` from repo root

Expected: All pass.

```
git add -A
git commit -m "security: derive address from EIP-191 signature server-side, move hard-coded addresses to env vars"
```

---

## Verification

After all WPs are committed:

1. Run full test suite: `npm run lint && npm run build && npm run test:unit`
2. Run E2E tests locally: `cd e2e && npx playwright test`
3. Manual smoke test on `http://localhost:3000`:
   - Verify vignette/grain overlays don't block nav clicks
   - Verify progress bars have ARIA attrs (inspect with browser DevTools > Accessibility tab)
   - Verify monitor page tabs announce correctly to screen reader
   - Verify mobile layout doesn't overflow at 320px viewport
   - Verify guardian events use teal instead of blue for MRV badges
   - Verify purchase/onboard flows still work with signature-derived addresses
