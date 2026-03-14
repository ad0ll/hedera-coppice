# Frontend Rebuild Design

**Date:** 2026-03-14
**Status:** Approved

## Goal

Port the Coppice frontend from Vite SPA (React + react-router-dom + ethers.js) to Next.js App Router (wagmi + viem). Absorb the middleware purchase API into Next.js API routes. Apply impeccable design skills for quality. Keep the current visual identity.

## Architecture

### Next.js 15 App Router

```
frontend/
  app/
    layout.tsx            Server component: metadata, fonts, <Providers> wrapper
    page.tsx              'use client' — Investor Portal
    issue/page.tsx        'use client' — Issuer Dashboard
    monitor/page.tsx      'use client' — Compliance Monitor
    api/
      purchase/route.ts   POST: eUSD transfer (HTS SDK) + CPC mint (viem)
      allocate/route.ts   POST: submit PROCEEDS_ALLOCATED to HCS impact topic
      health/route.ts     GET: health check
  components/
    bond-details.tsx
    compliance-status.tsx
    transfer-flow.tsx
    project-allocation.tsx
    audit-event-feed.tsx
    wallet-button.tsx
    nav.tsx
  lib/
    wagmi.ts              wagmi config + Hedera testnet chain definition
    abis.ts               Typed contract ABIs (as const, no any)
    constants.ts          Addresses, topic IDs, demo wallets, bond details
  hooks/
    use-identity.ts       usePublicClient + imperative readContract
    use-compliance.ts     usePublicClient + imperative readContract
    use-hcs-audit.ts      fetch-based Mirror Node polling (no ethers)
    use-hts.ts            fetch-based Mirror Node balance queries (no ethers)
  providers.tsx           'use client': WagmiProvider + QueryClientProvider
```

### Key Decisions

1. **All pages are `'use client'`** — they depend on wallet state. Optimize later.
2. **`layout.tsx` is a server component** — renders HTML shell, metadata, wraps children in `<Providers>`.
3. **API routes replace Express** — `@hashgraph/sdk` for HTS transfers, viem for EVM mint calls. No ethers anywhere.
4. **Event-logger stays as standalone** — it's a long-running daemon, not a request handler.
5. **wagmi replaces manual WalletProvider** — `useAccount`, `useConnect`, `useDisconnect` replace custom state management.
6. **Declarative reads where possible** — `useReadContract` with `refetchInterval` for polling (totalSupply, paused, balances).
7. **Imperative reads for sequential logic** — `usePublicClient` + `readContract` for ComplianceStatus's 4-step sequential checks.

### API Route: /api/purchase

Server-side logic (runs on Vercel as serverless function):
1. Validate request (investorAddress, amount)
2. Resolve investor's Hedera account ID via Mirror Node
3. Check eUSD balance via Mirror Node
4. Transfer eUSD from investor to treasury via `@hashgraph/sdk` `TransferTransaction` (signed with investor's demo key from env)
5. Mint CPC tokens to investor via viem `walletClient.writeContract` using deployer key
6. Return success with tx IDs

### API Route: /api/allocate

Server-side logic:
1. Validate request (project, category, amount)
2. Submit `PROCEEDS_ALLOCATED` JSON to HCS impact topic via `@hashgraph/sdk` `TopicMessageSubmitTransaction`
3. Return success

## Visual Design

Keep the current visual identity:
- Dark theme with custom surface colors (#0a0c10, #12151f, #1c2030)
- bond-green (#22c55e), bond-red, bond-amber accent colors
- Card glow hover effects, glassmorphism nav, pulse animations
- Institutional/fintech aesthetic

Use impeccable skills to improve quality without changing the look:
1. `audit` — identify accessibility, performance, responsive issues
2. `polish` — fix spacing, alignment, consistency
3. `clarify` — improve error messages, labels, microcopy
4. `harden` — error boundaries, text overflow, edge cases
5. `animate` — purposeful micro-interactions

## Testing

- **Playwright E2E** — port existing 18 tests to work with Next.js dev server
- **Vitest** — unit tests for hooks and utility functions
- Configure E2E to run against real testnet (per CLAUDE.md standards)

## Deployment

- **Vercel** — native Next.js deployment
- API routes run as serverless functions (no separate middleware process)
- Environment variables in Vercel dashboard
- Single deployment = frontend + API

## What This Replaces

| Before | After |
|--------|-------|
| Vite SPA | Next.js App Router |
| react-router-dom | File-based routing |
| ethers.js | viem + wagmi |
| Manual WalletProvider | wagmi useAccount/useConnect |
| Manual useEffect polling | useReadContract with refetchInterval |
| Express purchase-api (middleware) | Next.js API route /api/purchase |
| Express allocate endpoint | Next.js API route /api/allocate |
| Separate processes (frontend + middleware) | Single Next.js process |
