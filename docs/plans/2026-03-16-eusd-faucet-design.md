# eUSD Demo Faucet Design

## Purpose

Hackathon judges and any user connecting a fresh MetaMask wallet have no way to obtain eUSD to test the bond purchase flow. This faucet provides a zero-friction way to get test eUSD directly from the Invest page.

## Design Decisions

- **No auth, no rate limits, no caps.** Testnet faucet for a hackathon demo.
- **Mint on demand.** eUSD is `TokenSupplyType.Infinite` with deployer holding `supplyKey`. The API mints fresh eUSD per request rather than drawing from a finite treasury.
- **Fixed amount:** 1,000 eUSD per claim. Simple, no input field.
- **Auto-detect association.** Fresh wallets need HTS token association before receiving eUSD. The button handles this transparently — one click, association (if needed) then claim.
- **Inline on Invest page.** Placed near the eUSD balance display in the portfolio section. Always visible regardless of balance.
- **Inline error display.** Red text below button, consistent with existing `text-bond-red` error patterns (no toast library).

## Architecture

### API Route: `POST /api/faucet`

**Input:** `{ walletAddress: string }` validated with Zod (valid EVM hex address).

**No authentication required.**

**Flow:**
1. Validate `walletAddress` with Zod schema
2. `TokenMintTransaction` — mint 100,000 units (1,000.00 eUSD) to deployer treasury
3. `TransferTransaction` — transfer 100,000 units from treasury to recipient
4. Return `{ success: true, amount: 1000 }`

**Error responses:** 400 for invalid input, 500 for Hedera SDK errors.

### Frontend Component: `FaucetButton`

**Placement:** Below eUSD balance in the portfolio section of `/` (Invest page).

**Association detection:** Query Mirror Node `GET /api/v1/accounts/{address}/tokens?token.id=0.0.8214937`. No result = not associated.

**On click flow:**
1. Check association status via Mirror Node
2. If not associated: `writeContract()` to HTS precompile `0x167`, function `associateToken(userAddress, eusdEvmAddress)` — user signs in MetaMask
3. `POST /api/faucet` with wallet address
4. On success: show green confirmation, trigger eUSD balance refresh
5. On error: show red inline error text below button

**Button states:**
- Default: "Get 1,000 Test eUSD"
- Associating: "Associating token..." (MetaMask pending)
- Claiming: "Claiming eUSD..."
- Success: "1,000 eUSD claimed!" (green, auto-resets after 3s)
- Error: button resets to default, red error text below

### Data Flow

```
User clicks button
  |
  +-- Mirror Node: check token association
  |     +-- Not associated: wagmi writeContract -> 0x167.associateToken()
  |         +-- User signs MetaMask tx, wait for confirmation
  |
  +-- POST /api/faucet { walletAddress }
        |
        Backend (Hedera SDK):
        +-- TokenMintTransaction(eusdTokenId, 100000)
        +-- TransferTransaction(treasury -> recipient, 100000)
        +-- Return { success, amount }
        |
        Frontend: show success, refresh balance
```

## Testing

### API Route (vitest)
- Valid address returns 200 with `{ success: true, amount: 1000 }`
- Invalid/missing address returns 400 with Zod error
- Mock Hedera SDK to verify mint + transfer called with correct amounts

### E2E (Playwright)
- Fresh wallet: click faucet, verify balance updates to 1,000 eUSD
- Repeat click: verify balance increases to 2,000 eUSD
- Pre-associated wallet (demo wallets): skips association, just claims

## Key Technical Details

- eUSD token ID: `0.0.8214937`
- eUSD EVM address: `0x00000000000000000000000000000000007D5999`
- eUSD decimals: 2 (amounts in cents, so 1,000.00 = 100,000 raw)
- HTS precompile address: `0x0000000000000000000000000000000000000167`
- `associateToken(address account, address token)` returns `int64 responseCode`
- Deployer signs mint + transfer server-side using `DEPLOYER_PRIVATE_KEY`
