# Hedera Platform Research

## Hedera Core Services

### Hedera Consensus Service (HCS)
- Append-only message logs with consensus timestamps and sequence numbers
- Messages up to 1KB per chunk
- Topics have submit keys for access control
- Read via Mirror Node REST API: `GET /api/v1/topics/{topicId}/messages`
- Write via SDK: `TopicMessageSubmitTransaction`
- gRPC subscription available for real-time HCS messages

### Hedera Token Service (HTS)
- Native token creation without smart contracts (cheaper than ERC-20)
- Requires explicit `TokenAssociateTransaction` before an account can hold a token
- The account being associated MUST sign the transaction
- Mirror Node for balance queries: `GET /api/v1/accounts/{accountId}/tokens`
- Limitation: HTS tokens don't emit standard ERC-20 event logs when operated via system contracts

### Smart Contract Service (EVM)
- EVM compatibility via JSON-RPC relay (Hashio)
- Solidity 0.8.x supported
- System contracts bridge HTS/HCS into EVM (precompiles at 0x167, 0x168, etc.)
- Gas model differs from Ethereum (ops-based throttling since HIP-1249)

## JSON-RPC Relay

**Public endpoint:** `https://testnet.hashio.io/api`
**Chain ID:** 296 (testnet)

### Supported Event Methods
| Method | Status | Notes |
|--------|--------|-------|
| `eth_getLogs` | Supported | 10,000 block range limit |
| `eth_newFilter` | Supported (HIP-775) | Filter expiry on inactivity |
| `eth_subscribe` | Supported (HIP-694) | WebSocket, `logs` and `newHeads` |
| `eth_getFilterChanges` | Supported | Polling-based |

**Key limitation:** The public Hashio relay may not support all filter methods in batch mode. The frontend uses Mirror Node REST API for contract event logs as the most reliable approach.

### Mirror Node REST API
- Base: `https://testnet.mirrornode.hedera.com`
- Contract logs: `GET /api/v1/contracts/{contractId}/results/logs`
- HCS messages: `GET /api/v1/topics/{topicId}/messages`
- Account lookup: `GET /api/v1/accounts/{evmAddress}`
- Token balances: `GET /api/v1/accounts/{accountId}/tokens`
- ~10 second propagation delay
- Rate limit: 50 RPS on public mirror node
- Historical data: 60-day default window on some endpoints

## Querying Infrastructure

### The Graph on Hedera
- Subgraphs ARE supported but hosted service is NOT available
- Must run a local Graph node via Docker
- Known limitation: HTS token events may not be fully captured
- Hedera example repo: github.com/hashgraph/hedera-subgraph-example

### Hgraph ERC Token Indexer
- Third-party GraphQL indexer (launched Dec 2025)
- Covers ERC-20, ERC-721, ERC-1400 on Hedera EVM
- Provides wallet portfolios, holders, transfer history via GraphQL

### Mirror Node as "Subgraph"
- For HCS: Mirror Node REST API IS the native query layer
- For contract events: `/api/v1/contracts/{id}/results/logs` endpoint
- No HCS-specific subgraph exists — Mirror Node IS the query infra

## Event Bridging (EVM -> HCS)

### Is there a canonical SDK method?
**No.** There is no single SDK function that "listens to EVM events and writes to HCS." This is a custom integration pattern. The approaches are:

1. **Off-chain polling** (what we do): Poll `eth_getLogs`, parse events, submit to HCS via SDK
2. **HIP-1208 system contracts** (future): Would allow smart contracts to write to HCS natively from Solidity. Status: Proposed/Draft as of early 2026 — NOT yet live on mainnet/testnet. Note: HIP-478 is about oracle integration, not HCS precompiles.
3. **Hashport bridge pattern**: LimeChain's hashport-validator does exactly this pattern at scale

### Best practice per Hedera docs
- Use Mirror Node REST API for reading contract event logs
- Use HCS for audit trails and ordered messaging
- Combine both for compliance dashboards

## ERC-3643 on Hedera

### Official Integration (November 12, 2025)
- Hedera integrated ERC-3643 into Asset Tokenization Studio (ATS)
- Partnership with Tokeny (creators of T-REX/ERC-3643)
- ATS now supports both ERC-1400 and ERC-3643
- Open source: github.com/hashgraph/asset-tokenization-studio

### Hedera-Specific Considerations
- HTS system contracts do NOT natively support ERC-3643 — must deploy as standard EVM contracts
- Hedera's Asset Tokenization Studio (ATS) deploys ERC-3643 as a diamond proxy pattern with all compliance facets (ERC20, ERC1594, KYC, Bond, AccessControl, ControlList) at a single address
- **Coppice uses ATS** (migrated from T-REX v4.1.6 direct deployment to ATS diamond proxy in March 2026)
- ATS API differs from T-REX: `isPaused()` not `paused()`, `isFrozen()` reverts on unregistered addresses, `owner()` reverts (uses role-based access), coupons are 1-indexed

### ABN AMRO Precedent (Sept 2023)
- ABN AMRO tokenized a EUR 5M green bond using ERC-3643 + Tokeny on Polygon
- Investors: Vesteda (borrower), DekaBank (investor)
- Used Fireblocks for custody
- Demonstrates: green bonds + ERC-3643 is a real production pattern

## Contract Verification on Hedera

### HashScan (Hedera's Explorer)
- Uses Sourcify for verification
- Verification portal: https://verify.hashscan.io/

### hashscan-verify Hardhat Plugin
```bash
npm install --save-dev hashscan-verify
```
```
npx hardhat hashscan-verify <ADDRESS> --contract contracts/X.sol:X --network testnet
```
- Supports constructor arguments
- Checks for existing verification before re-verifying
- Testnet verifications are wiped on periodic resets

## NPM Packages

| Package | Purpose | Our Version |
|---------|---------|-------------|
| `@hashgraph/sdk` | Hedera native SDK | ^2.51.0 (resolves to 2.81.0) |
| `ethers` | EVM interaction (frontend + scripts) | v6 |
| `hashscan-verify` | Contract verification | Not yet installed |
| `@tokenysolutions/t-rex` | ERC-3643 contracts (ABIs only, superseded by ATS) | v4.1.6 |
| `@onchain-id/solidity` | OnchainID contracts (ABIs only) | v2.0.0 |

> **Note:** The frontend uses ethers v6 with a custom AtsContext — wagmi and viem were removed during the ATS migration. The old T-REX contract ABIs are still referenced in `packages/common/wagmi.config.ts` for code generation but are not used at runtime.

## SDK Deprecations (@hashgraph/sdk 2.81.0)

### Confirmed Deprecations
| Method | Deprecated In | Replacement |
|--------|--------------|-------------|
| `AccountCreateTransaction.setKey()` | ~v2.51.0 | `setKeyWithAlias()` or `setKeyWithoutAlias()` |
| `AccountCreateTransaction.setAlias()` | ~v2.51.0 | `setKeyWithAlias()` |
| `fromSolidityAddress()` | v2.68.0 | `fromEvmAddress(shard, realm, evmAddress)` |
| `toSolidityAddress()` | v2.68.0 | `toEvmAddress()` |
| `EthereumFlow` | v2.68.0 | `EthereumTransaction` |
| `AccountBalance.tokens` | v2.17.1 | Mirror Node REST API |
| `Mnemonic.toPrivateKey()` | v2.18.0 | `toEd25519PrivateKey()` / `toEcdsaPrivateKey()` |

### In Our Codebase
- `create-diana.ts:18` — uses `.setKey()` (deprecated)
- `create-diana.ts:20` — uses `.setAlias()` (deprecated)
- No other deprecated methods found in scripts/hcs-setup/hts-setup

## Hiero Transition
- Hedera SDKs are being rebranded under "Hiero" (e.g., `hiero-sdk-js`)
- npm packages still use `@hashgraph/sdk` for now
- GitHub repos moving from `hashgraph/` to `hiero-ledger/`

---

## Hello Future Apex Hackathon 2026

### Key Facts
- **Total Prize Pool:** $250,000 USD
- **Submission Deadline:** March 23, 2026, 11:59 PM ET
- **Commit Period:** February 17 - March 23, 2026
- **Platform:** StackUp (hackathon.stackup.dev)

### DeFi & Tokenization Track ($40,000)
- 1st Place: $18,500
- 2nd Place: $13,500
- 3rd Place: $8,000
- Focus: "push DeFi beyond standalone protocols by creating interoperable, composable systems — ranging from cross-chain bridges and synthetic assets to tokenized real-world assets"

### Other Tracks ($40,000 each)
- AI & Agents
- Sustainability
- Open Track
- Legacy Builders

### Bounty Prizes ($48,000 total)
Six partner bounties at $8,000 each: Neuron, AWS, Bonzo, Hashgraph Online, OpenClaw, Hiero

### Submission Requirements
1. GitHub repo with code, README, deployment files
2. Project description (max 100 words), track selection, tech stack
3. Pitch deck (PDF) with team intro, solution summary, roadmap, demo link
4. **Demo video (max 5 min, YouTube) — REQUIRED for scoring**
5. Live demo URL

### Judging Criteria
1. Innovation (10%) — alignment, uniqueness, ecosystem advancement
2. Feasibility (10%) — technical viability and team capability
3. Execution (20%) — MVP/PoC delivery, team dynamics, GTM strategy
4. Integration (15%) — Hedera network usage depth and creativity
5. Success (20%) — ecosystem impact, user adoption potential
6. Validation (15%) — market feedback and traction evidence
7. Pitch (10%) — clarity, narrative, metrics communication

### Critical Rules
- One main track per team
- One bounty per team (can combine main track + bounty)
- Allow at least 1 hour before deadline for compulsory feedback questions
- **No demo video = not scored**

### Cross-Track Opportunity
Our project could potentially fit:
- **DeFi & Tokenization** (primary) — tokenized green bonds, ERC-3643
- **Sustainability** — green bonds, environmental impact tracking
- Can only submit to ONE main track
