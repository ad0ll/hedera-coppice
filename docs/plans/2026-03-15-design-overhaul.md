# Design Overhaul: "Editorial Finance"

Date: 2026-03-15
Status: Design approved, pending implementation plan
Branch base: worktree-demo-onboarding

## Context

Hackathon deadline March 23. Judges spend 2-3 minutes per project. The current frontend is functional but forgettable — card-grid monotony, Inter everywhere, flat background, zero animation. This overhaul makes Coppice visually distinctive and memorable while preserving all existing functionality.

## Design Direction

**Tone**: Restrained editorial. Institutional finance meets sustainability. Think annual report typography with modern dashboard precision.

**Hero moment**: The compliance check cascade resolving to "Eligible to Invest" — this is the product's unique value proposition made visible and is the single thing a judge will screenshot.

**What does NOT change**: Component architecture, data flow, hooks, API routes, accessibility patterns (focus-visible, aria-live, sr-only), color semantics (green=pass, red=fail, amber=pending), dark-only theme, mobile breakpoints.

## 1. Typography System

### Font Stack

| Role | Font | Usage |
|------|------|-------|
| Display/Heading | Instrument Serif (Regular only) | Page titles, bond name, hero stat values (24px+) |
| Body/UI | Bricolage Grotesque (variable, 200-800) | Nav, buttons, labels, form text, card titles, stat labels |
| Data/Monospace | Geist Mono (variable) | Balances, addresses, percentages, timestamps, tx hashes |

All loaded via `next/font/google` for zero layout shift.

### Hierarchy

| Element | Current | New |
|---------|---------|-----|
| Page title | text-2xl font-semibold Inter | text-3xl Instrument Serif (size provides weight contrast, no bold needed) |
| Card title | text-lg font-semibold Inter | text-lg font-semibold Bricolage Grotesque |
| Stat label | text-[11px] uppercase tracking-widest Inter | text-xs uppercase tracking-wider Bricolage Grotesque |
| Body text | text-sm Inter | text-sm Bricolage Grotesque |
| Data values | font-mono (system) | Geist Mono |

### Implementation

- Add font imports to `frontend/app/layout.tsx`
- Apply via CSS variables (`--font-display`, `--font-body`, `--font-mono`)
- Update `globals.css` body font-family
- Update `.page-title` to use display font class
- Update `.stat-label` to `text-xs tracking-wider`

## 2. Background Atmosphere

### Treatment

- **Vignette**: `body::before` with `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)`, `position: fixed`, `pointer-events: none`, `z-index: 0`
- **Noise grain**: `body::after` with SVG `feTurbulence` filter at 2% opacity (reduced from original 3% per critique — serif typography needs cleaner background)
- **No green accent radial** — dropped per critique. Background provides depth only, not color. Green stays purely semantic.

### Why these values

- Vignette draws eye to center content area, creates depth without decoration
- Noise breaks the flat digital surface at a subliminal level — you feel it more than see it
- Both are `position: fixed` + `pointer-events: none` so they don't affect layout or interaction

## 3. Animation System

All CSS-only. No animation library dependency.

### Easing

`cubic-bezier(0.16, 1, 0.3, 1)` everywhere — the Linear/Vercel deceleration curve. Fast entry, smooth settle. Never bounce, never elastic.

### Staggered Entrance (page load)

- Cards and sections: `opacity: 0; transform: translateY(12px)` initial state
- Animate to `opacity: 1; transform: translateY(0)` over 500ms
- Stagger via `--index` CSS custom property: `animation-delay: calc(var(--index) * 80ms)`
- Applied to direct children of page content containers

### Hero Moment: Compliance Cascade

This is the single most important animation in the app.

1. Each compliance check row starts with a subtle pending state (muted, spinner)
2. When a check resolves, the row gets a brief flash highlight:
   - Pass: green at 8% opacity, 600ms fade-out
   - Fail: red at 8% opacity, 600ms fade-out
3. Status icon (checkmark/X) slides in from left over 200ms
4. After all checks resolve, 200ms dramatic pause before the final "Eligible/Not Eligible" badge appears
5. Badge entrance: scale from 0.95 + fade-in over 300ms
6. If eligible: compliance header gradient transitions smoothly from neutral to green (CSS transition on background, 400ms)

Minimum display time per check: 300ms. Even if RPC returns instantly, each check holds for 300ms so the cascade is visible and dramatic.

### Event Feed

- New events: slide down from top with 350ms entrance
- Brief green highlight on new item (1.5s fade-out) to draw attention
- Feed should auto-scroll to top when new events arrive during active viewing

### Purchase Step Transitions

- Step status icon swaps animate (fade crossfade, 200ms)
- Active step has amber pulse (existing `animate-pulse-dot`)

### Reduced Motion

- `prefers-reduced-motion: reduce`: All spatial transforms removed (no translateY, no scale). Opacity fades preserved at reduced duration (100ms). Stagger delays zeroed. Compliance cascade still shows state changes but without spatial motion.

## 4. Layout Restructuring

### Investor Page (`page.tsx`)

**Current**: BondDetails card → 3-column grid (ComplianceStatus + TransferFlow | Portfolio)

**New**:
- BondDetails: Full-width, more vertical breathing room (py-8 instead of p-6), heading in Instrument Serif at text-3xl. Still card-flush style but feels like a hero section due to typography scale.
- Visual section break: 1px border-b at 30% opacity between status zone and action zone, with extra vertical margin (my-8)
- ComplianceStatus + Portfolio in left 2/3, TransferFlow in right 1/3 (swap from current layout — compliance is the hero, purchase is the action)
- Or keep current layout if compliance + purchase being together in the main column serves the demo flow better. Evaluate during implementation.

### Monitor Page (`monitor/page.tsx`)

**Current**: 3 stat cards in a grid → event feed card below

**New**: Single full-width surface bar with internal dividers.
- One `bg-surface-2` bar with `flex items-center divide-x divide-border`
- Each stat: number in Instrument Serif at text-3xl/4xl, label below in stat-label style
- Left border accent per stat: green for Approvals, red for Restrictions, muted for Total
- Feels like a Bloomberg terminal header — dense, data-forward, not cardlike
- Event feed below unchanged structurally but with feed animation

### Issuer Page (`issue/page.tsx`)

**Current**: 2x2 card grid (Mint, Freeze, Pause, Allocate)

**New**: Same 2x2 grid but with semantic grouping:
- Top row labeled "Token Operations" (muted section header): Mint + Allocate (positive actions)
- Bottom row labeled "Risk Controls" (muted section header): Freeze + Pause (restrictive actions)
- Section headers are `stat-label` style text, not cards — just organizational labels

## 5. Onboarding UX Fixes

### Demo Onboarding Visibility

- Left border accent: `border-l-2 border-bond-amber` on the onboarding section
- "Register Identity" button: Change from `btn-outline-amber` to `btn-primary` (green, prominent)
- Section gets its own subtle background differentiation (`bg-bond-amber/5`)

### Success State

- Lead with celebration: "You're now eligible to invest in Coppice Green Bonds"
- Clear next-step CTA: "Scroll down to purchase" or similar directional guidance
- Transaction hashes: Collapsed by default into an expandable "View on-chain details" section
- Each tx hash is a HashScan link

### State Transition

- Compliance header gradient: CSS `transition: background 400ms ease` so red-to-green shift is smooth
- After onboarding success, the onboarding section shows a compact "completed" state (green checkmark + "Identity registered") instead of the full form
- `runChecksRef.current?.()` fires and checks re-resolve with the cascade animation playing again — this time all going green, which is the hero moment payoff

## 6. Disconnected State (Investor Page)

**Current**: BondDetails shown (good). Compliance and Portfolio show plain "Connect wallet" text.

**New**:
- BondDetails: Always shown (no change)
- Compliance Status: Show grayed-out/skeleton check items — "Identity", "KYC Claim", "Jurisdiction", "Compliance Module" — all in a neutral/disabled state. This previews what will be checked and communicates the product's value before connection.
- Portfolio: EmptyState component with wallet icon, "Connect a wallet to check eligibility and invest", and a "Connect Wallet" button as CTA action
- Transfer Flow: Hidden entirely until wallet connected (no point showing purchase form to disconnected user)

## 7. Detail Fixes

### HashScan Links (audit-event-feed.tsx)

- Increase from `text-bond-green/50` to `text-bond-green` (full opacity)
- Add external-link icon suffix (small, inline SVG)
- Add `title` attribute with full transaction hash

### Category Colors (event-types.ts)

Replace "Green Buildings" color:
- Current: `bg-bond-green/70` (indistinguishable from Renewable Energy's `bg-bond-green`)
- New: `bg-teal-500` (`#14b8a6`) — distinct hue, not just opacity variation

### Card Hover Glow

- Remove hover glow from static/display-only cards (Portfolio, Bond Details)
- Keep hover glow only on interactive cards (forms, clickable items)
- Consider simplifying glow to just `border-color` shift (no box-shadow) since background atmosphere now provides depth

### Footer

- Increase from `text-xs` to `text-sm`
- Add small network icon or green pulse dot before "Hedera Testnet" to indicate live connection
- Show block height or "Live" indicator if feasible (stretch goal)

## 8. Files Changed

### Core changes (high confidence):
- `frontend/app/layout.tsx` — font imports, CSS variable application
- `frontend/app/globals.css` — font families, background pseudo-elements, animation keyframes, typography classes, stat-label update
- `frontend/app/page.tsx` — layout restructure, disconnected state, section break
- `frontend/app/monitor/page.tsx` — stat bar redesign
- `frontend/app/issue/page.tsx` — section grouping labels
- `frontend/components/compliance-status.tsx` — cascade animation, onboarding UX fixes, skeleton disconnected state, minimum check display time
- `frontend/components/audit-event-feed.tsx` — HashScan link contrast, feed entrance animation
- `frontend/components/transfer-flow.tsx` — step transition animation
- `frontend/components/bond-details.tsx` — Instrument Serif heading, spacing increase
- `frontend/components/project-allocation.tsx` — teal category color
- `frontend/lib/event-types.ts` — update Green Buildings color constant

### Possible changes (evaluate during implementation):
- `frontend/components/ui/card.tsx` — interactive vs static hover variant
- `frontend/components/ui/empty-state.tsx` — possible CTA button support enhancement
- `frontend/components/wallet-button.tsx` — no changes expected
- `frontend/components/nav.tsx` — font family update (inherits from body)
