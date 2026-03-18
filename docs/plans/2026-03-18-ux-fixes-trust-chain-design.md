# UX Fixes + Trust Chain Design

Date: 2026-03-18
Status: Approved

## Problems

### P1: ENS Resolution Error (Invest + Issuer pages)
ATS context lowercases wallet addresses (`addr.toLowerCase()`). ethers v6 treats non-checksummed addresses as potential ENS names, calls `provider.resolveName()`, and Hedera has no ENS — throws "network does not support ENS". Affects `use-identity.ts`, `use-compliance.ts`, and any hook receiving addresses from ATS context.

### P2: Mirror Node 404 for Non-Hedera Wallets (Invest page)
`use-hts.ts` calls `getHederaAccountId(evmAddress)` which 404s on Mirror Node for wallets without Hedera accounts. Currently caught silently (returns 0), but logs errors. These are expected for external wallets — should be handled gracefully.

### P3: Grant Agent Role Broken (Issuer page)
`/api/demo/grant-agent-role` calls T-REX `addAgent(address)` which doesn't exist on ATS. ATS uses `grantRole(bytes32, address)` via OpenZeppelin AccessControl. Also references "ERC-3643" in UI text.

### P4: No Trust Chain on Impact Page
Guardian API route extracts only `credentialSubject[0]`, discarding VC metadata: IPFS hashes, HCS message IDs, issuer/verifier DIDs, Ed25519 signatures, timestamps. Users see aggregated numbers with no way to verify underlying evidence.

### P5: ICMA Section is Hardcoded
Four ICMA principles shown as static text. Should link to actual Guardian VC evidence proving compliance.

### P6: Coupons Page Fails Silently
`useCoupons` hook has no error logging — React Query catches errors silently. No retry configuration beyond defaults. No timeout on JsonRpcProvider.

### P7: Destructive Operations Accessible to Demo Users (Issuer page)
Pause and Freeze controls available to any wallet with agent role. A demo judge could pause the token and break the demo for subsequent judges.

### P8: Compliance Tab Missing Guardian Events
Only shows HCS audit events. Guardian verification events (project registrations, allocations, MRV submissions, verification statements) not displayed.

## Design

### D1: Fix Address Checksumming

In `ats-context.tsx`, change three `toLowerCase()` calls to `ethers.getAddress()`:
- Line 49: `setAddress(ethers.getAddress(accounts[0]))`
- Line 72: `setAddress(await s.getAddress())` (already checksummed from ethers Signer)
- Line 94: `setAddress(ethers.getAddress(addr))`

This fixes all downstream hooks since addresses flow from context.

### D2: Graceful Mirror Node 404 Handling

In `use-hts.ts`, the existing `catch { return 0 }` already handles 404s. The 404 console errors come from the browser's network log, not from our code. No code change needed — these are browser-level logs that can't be suppressed. Add a comment explaining this is expected.

### D3: Fix Grant Agent Role API

Replace ABI and contract call in `/api/demo/grant-agent-role/route.ts`:
- ABI: `grantRole(bytes32, address)` + `hasRole(bytes32, address) view returns (bool)`
- Role hash: `0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6` (AGENT)
- Contract address: `CPC_SECURITY_ID` (not old T-REX token)
- Check `hasRole` before granting
- Update UI text: "ERC-3643" -> "ATS"

### D4: Expose VC Metadata in Guardian API

Modify `/api/guardian/data/route.ts` to return VC envelope alongside credentialSubject:

Add a `VCEvidence` type containing the provenance fields:
```typescript
interface VCEvidence {
  hash: string;           // IPFS CID
  topicId: string;        // HCS topic
  messageId: string;      // HCS message timestamp
  issuer: string;         // DID of signer
  issuanceDate: string;   // When signed
  proofType: string;      // "Ed25519Signature2018"
}
```

Each document type in `GuardianProject` gets an optional `evidence` field:
```typescript
interface GuardianProject {
  registration: ProjectRegistrationCS;
  registrationEvidence?: VCEvidence;
  allocation?: FundAllocationCS;
  allocationEvidence?: VCEvidence;
  mrvReport?: MRVReportCS;
  mrvEvidence?: VCEvidence;
  verification?: VerificationStatementCS;
  verificationEvidence?: VCEvidence;
  // ... existing fields
}
```

The API route's `fetchViewerBlock` returns both credentialSubject and evidence extracted from the VC wrapper.

### D5: Expandable Trust Chain on Project Cards

Each project card gets a "View Evidence" toggle that expands to show the VC chain:

```
[Project Card: Sunridge Solar Farm]
  50 MW | Nairobi, Kenya | Renewable Energy | Verified

  [View Evidence v]

  Registration VC
    Signed by: did:hedera:testnet:GWXTMU...  (Issuer)
    Date: 2026-03-18
    [View on IPFS] [View on HashScan]

  Allocation VC
    eUSD 45,000 allocated on 2026-03-15
    Purpose: Equipment Procurement & Construction
    Hedera Tx: 0.0.8213176@1773600000
    [View on IPFS] [View on HashScan]

  MRV Report
    Period: 2026-H1 | Methodology: IEA Grid Emission Factor (Kenya 2025)
    Core Indicators: 4,200 MWh generated, 50 MW installed
    Additional: 12,500 households served
    [View on IPFS] [View on HashScan]

  Verification Statement
    Signed by: did:hedera:testnet:GtEzQo...  (Independent Verifier)
    Opinion: Approved | 1,850 tCO2e verified
    Notes: "Minor adjustment to energy generation figure..."
    [View on IPFS] [View on HashScan]
```

Links:
- IPFS: `https://ipfs.io/ipfs/{hash}` (resolves to full JSON-LD VC)
- HashScan: `https://hashscan.io/testnet/topic/{topicId}/message/{messageId}`

### D6: Data-Driven ICMA Section

Replace hardcoded ICMA principles with evidence from bond framework VC:

| Principle | Source | Display |
|-----------|--------|---------|
| Use of Proceeds | `EligibleICMACategories` + allocation VCs | Categories + allocation % with project links |
| Project Evaluation | Project Registration VCs + Verification Opinions | Count of verified projects with methodology |
| Management of Proceeds | `BondContractAddress` + `LCCFContractAddress` | Contract links on HashScan |
| Reporting | `ReportingStandard` + `RegulatoryFrameworks` + MRV docs | Standard names + EU Taxonomy % |

Each principle becomes a card with actual data, not static text. The Guardian Integration section merges into this — no separate section needed.

### D7: Coupons Hook Reliability

In `use-coupons.ts`:
- Add try/catch with `console.error` in queryFn for diagnostics
- Add `retry: 3` to useQuery options
- Add timeout to JsonRpcProvider: `new ethers.JsonRpcProvider(JSON_RPC_URL, undefined, { polling: true, staticNetwork: true })`

### D8: Gate Destructive Operations

In the issuer page, compare connected address against deployer address (`DEPLOYER_ADDRESS` env var or hardcoded `0xeb974ba96c4912499c3b3bbd5a40617e1f6eecee`).

- Pause/Unpause button: disabled with tooltip "Only the bond issuer can pause/unpause"
- Freeze button: disabled with tooltip "Only the bond issuer can freeze wallets"
- Unfreeze button: remains enabled (constructive)
- Mint, Allocate, Distribute: remain enabled (constructive)

### D9: Guardian Events Tab on Compliance Page

Add a two-tab layout to the compliance monitor:
- Tab 1: "On-Chain Events" (existing HCS audit feed)
- Tab 2: "Guardian Verification" (Guardian VC events)

Guardian tab shows a timeline of VC submissions:
- Project registered: name, category, date
- Funds allocated: project, amount, date, Hedera tx link
- MRV submitted: project, period, reported CO2e
- Verification: project, opinion, verified CO2e, verifier DID

Each event links to IPFS/HashScan for proof. Data comes from the existing `/api/guardian/data` endpoint (already fetched by the hook).

## Actual Guardian VC Data Available

Confirmed from live API queries:

**Registration VC** (Issuer DID: `did:hedera:testnet:GWXTMU...`):
- topicId: `0.0.8269382`, messageId: `1773798642.220911089`
- hash: `B528VZi5LR9TbJynASChiQ6sDMmziX3Sv3DGSoo1z36J`
- Full credentialSubject with all project fields + EU Taxonomy data

**Allocation VC**:
- `HederaTransactionID: "0.0.8213176@1773600000.000000000"` — verifiable on HashScan
- `AllocationDate`, `Purpose`, `SignedAmountEUSD` vs `AllocatedAmountEUSD`

**MRV Report**:
- `CoreIndicatorsJSON`: `[{"name":"Annual Energy Generated","value":4200,"unit":"MWh"},{"name":"Capacity Installed","value":50,"unit":"MW"}]`
- `AdditionalIndicatorsJSON`: `[{"name":"Households Served","value":12500,"unit":"households"}]`
- `Methodology: "IEA Grid Emission Factor (Kenya 2025): 0.45 tCO2e/MWh"`

**Verification Statement** (Verifier DID: `did:hedera:testnet:GtEzQo...` — different from issuer):
- `Opinion: "Approved"`, `VerifiedGHGReduced: 1850`
- `VerifiedCoreIndicatorsJSON`: verified energy + capacity figures
- `VerifierNotes: "Minor adjustment to energy generation figure based on meter calibration review."`

## Non-Changes

- Mirror Node 404s: browser network errors for non-Hedera wallets are expected. The `catch { return 0 }` in `use-hts.ts` already handles this correctly.
- Guardian user registration: not needed. Guardian is server-side only.
- Wallet mock / E2E: tests already handle Guardian data via `page.route()` mocks.
