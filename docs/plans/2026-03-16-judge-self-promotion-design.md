# Judge Self-Promotion to Issuer — Design

**Goal:** Let hackathon judges promote themselves to the agent role so they can use the issuer dashboard with direct wallet signing.

**Context:** The issuer page already uses direct wallet signing (wagmi `writeContractAsync`) for mint, pause, freeze, and unfreeze. The only backend-mediated issuer operation is Allocate Proceeds (requires Hedera SDK for HCS). The blocker is that `token.addAgent()` is owner-only, so judges can't self-promote without a backend endpoint.

## Architecture

New API route `/api/demo/grant-agent-role` calls `token.addAgent(address)` with the deployer key. The issuer page replaces the "Not Authorized" empty state with a demo promote UI. Once promoted, judges interact with the token contract directly from their browser wallet.

## Components

### 1. API Route — `/api/demo/grant-agent-role`

- **Method:** POST
- **Auth:** EIP-191 signed message (same pattern as onboard/purchase)
- **Schema:** `{ investorAddress, message, signature }` (Zod validated)
- **Flow:**
  1. Verify wallet signature
  2. Check `token.isAgent(address)` — return 409 if already an agent
  3. Call `token.addAgent(address)` via deployer wallet client
  4. Return `{ success: true, txHash }`
- **~40 lines**, follows existing route patterns

### 2. Issuer Page Changes

**"Not Authorized" state becomes demo promote UI:**
- Amber-styled demo banner (issuer page only, not global): "Demo mode — In production, agent roles are managed by the token owner. This self-service promotion is for hackathon evaluation only."
- "Become an Issuer" button (btn-primary)
- On click: sign auth message -> POST `/api/demo/grant-agent-role` -> on success, invalidate `useIsAgent` query -> dashboard unlocks
- Loading + error states

**Allocate Proceeds card:**
- Hidden for promoted agents (only visible when connected address matches token owner)
- Use `useTokenOwner()` hook to read `token.owner()` for the comparison

### 3. New Hook — `useTokenOwner()`

- `useReadContract` calling `token.owner()` — returns the deployer address
- Used by issuer page to conditionally show/hide the Allocate Proceeds card

## Files Changed

| File | Change |
|---|---|
| `frontend/app/api/demo/grant-agent-role/route.ts` | New — API route |
| `frontend/app/issue/page.tsx` | Replace empty state, hide Allocate for non-owner |
| `frontend/hooks/use-token.ts` | Add `useTokenOwner()` hook |

## Not Changed

- Token write hooks (already direct wallet signing)
- Purchase route (investor flow, unrelated)
- Allocate route (stays deployer-only)
- Onboard route (investor flow, unrelated)
- Auth/deployer libs (reused as-is)
