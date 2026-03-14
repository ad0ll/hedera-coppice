# Coppice — ERC-3643 Green Bond Tokenization on Hedera

Coppice is a **compliant green bond tokenization platform** built on the [ERC-3643](https://erc3643.info/) (T-REX) standard, deployed on the **Hedera network**. It brings institutional-grade security token compliance to decentralized green finance — with on-chain identity verification, modular compliance enforcement, and an immutable audit trail powered by Hedera Consensus Service.

Named after the ancient woodland management technique where trees are sustainably harvested and regrow — a metaphor for sustainable finance.

Built for the **Hedera Hello Future: Apex Hackathon 2026** (DeFi & Tokenization track).

## Why Coppice?

Green bonds are a **$527B market** growing 10% annually, but greenwashing and opaque fund tracking erode investor trust. Issuers self-certify with minimal accountability. Impact reports appear 12+ months late.

Coppice solves this by:

- **Enforcing compliance at the protocol level** — ERC-3643 makes it impossible to transfer tokens to non-compliant addresses. Identity verification, KYC/AML claims, and jurisdiction checks are baked into every transfer.
- **Tracking use-of-proceeds on-chain** — Every fund allocation is recorded to HCS as an immutable, timestamped, publicly verifiable record. No more waiting for annual PDF reports.
- **Using 4 Hedera services** — Smart Contracts, Consensus Service, Token Service, and Mirror Node — demonstrating deep Hedera integration.

**Prior art:** ABN AMRO tokenized a €5M green bond using ERC-3643 on Polygon (September 2023). Coppice replicates this model on Hedera and adds what their implementation lacks: on-chain use-of-proceeds tracking.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend                         │
│  InvestorPortal │ IssuerDashboard │ ComplianceMonitor     │
│  ─────────────────────────────────────────────────────    │
│  MetaMask ←→ ethers.js ←→ Hedera EVM (Chain 296)        │
│  Mirror Node API ←→ HCS Audit Trail / HTS Balances       │
└──────────────────────────────────────────────────────────┘
        │                    │                    │
┌───────┴────────┐  ┌───────┴────────┐  ┌───────┴────────┐
│ Smart Contracts │  │  HCS Topics    │  │  HTS Tokens    │
│ (Hedera EVM)    │  │  (Consensus)   │  │  (Token Svc)   │
│                 │  │                │  │                │
│ ERC-3643 T-REX  │  │ Audit Trail    │  │ eUSD Stablecoin│
│ Token           │  │ Impact Track   │  │ (FungibleCommon)│
│ IdentityRegistry│  │                │  │                │
│ ModularCompliance│ │                │  │                │
│ ClaimIssuer     │  │                │  │                │
└─────────────────┘  └────────────────┘  └────────────────┘
```

### 4 Hedera Services Integrated

1. **Smart Contracts (Hedera EVM)** — Full ERC-3643 T-REX suite: Token, IdentityRegistry, ModularCompliance, ClaimIssuer, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistryStorage, and 3 compliance modules. Deployed via TREXFactory with OnchainID identity proxies.
2. **Hedera Consensus Service (HCS)** — Two topics: compliance audit trail (every mint, transfer, freeze, pause logged immutably) and green bond use-of-proceeds tracking.
3. **Hedera Token Service (HTS)** — eUSD stablecoin (FungibleCommon) for bond purchases, with token association and distribution to demo wallets.
4. **Mirror Node API** — Real-time HCS event feed, HTS balance queries, and transaction verification.

## Demo Wallets

| Role | Hedera Account | EVM Address | Country | Status |
|------|---------------|-------------|---------|--------|
| Deployer/Issuer | 0.0.8213176 | `0xEB974bA9...` | DE | Agent — can mint, freeze, pause |
| Alice | 0.0.8213185 | `0x4f9ad4Fd...` | DE (276) | Verified investor — full compliance |
| Bob | 0.0.8214040 | `0xad33bd43...` | US (840) | No ONCHAINID — blocked at identity check |
| Charlie | 0.0.8214051 | `0xFf3a3D1f...` | CN (156) | Verified but country restricted |
| Diana | 0.0.8214895 | `0x35bccFFf...` | FR (250) | Verified — freeze/unfreeze demo |

## Quick Start

### Prerequisites
- Node.js 20+
- MetaMask (configured for Hedera Testnet, chain 296)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd hedera-green-bonds
npm install

# Run smart contract tests (local Hardhat network)
cd contracts && npx hardhat test

# Start frontend dev server
cd ../frontend && npm run dev

# Run E2E tests (requires frontend running)
cd ../e2e && npx playwright test
```

### Deploy to Hedera Testnet

```bash
# 1. Configure environment
cp .env.example .env  # Add your Hedera operator keys

# 2. Deploy ERC-3643 contracts
cd contracts
npx hardhat run scripts/deploy.ts --network hederaTestnet
npx hardhat run scripts/setup-demo.ts --network hederaTestnet

# 3. Create HCS topics and HTS eUSD stablecoin
cd ../middleware
npx tsx src/hcs-setup.ts
npx tsx src/hts-setup.ts

# 4. Start event logger (bridges contract events to HCS)
npx tsx src/event-logger.ts &

# 5. Start frontend
cd ../frontend && npm run dev
```

## Project Structure

```
hedera-green-bonds/
├── contracts/                 # Hardhat project — ERC-3643 on Hedera EVM
│   ├── contracts/Imports.sol      # Pulls T-REX + OnchainID from node_modules
│   ├── scripts/
│   │   ├── deploy.ts              # 7-phase TREXFactory deployment
│   │   ├── setup-demo.ts          # Identity registration, claims, mint, unpause
│   │   ├── helpers.ts             # Address save/load utilities
│   │   └── verify-testnet.ts      # On-chain state verification
│   └── test/                      # 32 tests
│       ├── deployment.test.ts     # Token metadata, agent roles, initial supply
│       ├── compliance.test.ts     # Identity verification, country restrictions
│       └── transfers.test.ts      # Transfers, freeze/unfreeze, pause/unpause, mint
├── middleware/                # HCS + HTS Node.js scripts
│   └── src/
│       ├── config.ts              # Hedera SDK client setup
│       ├── create-diana.ts        # Create Diana's testnet account
│       ├── hcs-setup.ts           # Create HCS audit + impact topics
│       ├── hts-setup.ts           # Create eUSD, associate wallets, distribute
│       └── event-logger.ts        # Contract events → HCS audit trail (polling)
├── frontend/                  # React + Vite + Tailwind CSS v4
│   └── src/
│       ├── providers/WalletProvider.tsx   # MetaMask integration
│       ├── hooks/                 # useToken, useIdentity, useCompliance, useHCSAudit, useHTS
│       ├── pages/                 # InvestorPortal, IssuerDashboard, ComplianceMonitor
│       ├── components/            # BondDetails, ComplianceStatus, TransferFlow, AuditEventFeed
│       └── lib/                   # Contract ABIs, addresses, constants
├── e2e/                       # Playwright E2E tests
│   ├── fixtures/wallet-mock.ts    # EIP-1193 MetaMask mock with real tx signing
│   └── tests/                     # 23 tests across 5 spec files
└── docs/                      # Plans and documentation
```

## Testing

### Smart Contract Tests — 32 tests
```bash
cd contracts && npx hardhat test
```

Covers deployment verification, identity/compliance checks (verified vs. unverified vs. restricted country), compliant and rejected transfers, freeze/unfreeze, pause/unpause, minting access control, and supply limits.

### E2E Browser Tests — 23 tests
```bash
cd e2e && npx playwright test
```

Covers all three frontend pages with a custom MetaMask mock that signs real transactions on Hedera testnet:

- **Investor Portal (6 tests):** Bond details, Alice compliance (4 green checks), Bob rejection (no identity), Charlie rejection (restricted country), portfolio display, purchase flow gating
- **Issuer Dashboard (6 tests):** Wallet connection, mint/freeze/pause form rendering, admin controls
- **Compliance Monitor (4 tests):** Event feed display, stats cards, HCS event loading
- **Full Demo Flow (2 tests):** Multi-page navigation, wallet state management
- **Write Operations (5 tests):** Real testnet transactions — mint tokens, freeze/unfreeze wallet, pause/unpause token, compliance verification

**Total: 55 tests (32 contract + 23 E2E), all passing.**

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity 0.8.17, T-REX v4.1.6, OnchainID v2.0.0, OpenZeppelin v4.9.6 |
| Development | Hardhat, TypeScript |
| Frontend | React 19, Vite 8, Tailwind CSS v4, ethers.js v6 |
| Hedera SDK | @hashgraph/sdk for HCS/HTS |
| Testing | Mocha/Chai (contracts), Playwright (E2E) |
| Deployment | Hedera Testnet (Chain ID 296), Vercel (frontend) |

## Deployed Contracts (Hedera Testnet)

| Contract | Address | HashScan |
|----------|---------|----------|
| Token (CPC) | `0x17e19B53981370a904d0003Ba2D336837a43cbf0` | [View](https://hashscan.io/testnet/contract/0x17e19B53981370a904d0003Ba2D336837a43cbf0) |
| IdentityRegistry | `0x03ecdB8673d65b81752AC14dAaCa797D846c1B31` | [View](https://hashscan.io/testnet/contract/0x03ecdB8673d65b81752AC14dAaCa797D846c1B31) |
| ModularCompliance | `0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf` | [View](https://hashscan.io/testnet/contract/0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf) |
| ClaimIssuer | `0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A` | [View](https://hashscan.io/testnet/contract/0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A) |
| TREXFactory | `0x78A20A45aA6Bb35f516fFf5dcE26f25C86e03d7f` | [View](https://hashscan.io/testnet/contract/0x78A20A45aA6Bb35f516fFf5dcE26f25C86e03d7f) |

## HCS Topics & HTS Tokens

| Resource | ID | HashScan |
|----------|------|----------|
| Audit Trail (HCS) | `0.0.8214934` | [View](https://hashscan.io/testnet/topic/0.0.8214934) |
| Impact Tracking (HCS) | `0.0.8214935` | [View](https://hashscan.io/testnet/topic/0.0.8214935) |
| eUSD Stablecoin (HTS) | `0.0.8214937` | [View](https://hashscan.io/testnet/token/0.0.8214937) |

## Compliance Modules

Three modular compliance modules enforce transfer restrictions at the protocol level:

1. **CountryRestrictModule** — Blocks transfers to/from restricted jurisdictions (China, code 156)
2. **MaxBalanceModule** — Limits individual holder balance to 1,000,000 CPC
3. **SupplyLimitModule** — Caps total token supply at 1,000,000 CPC

## ERC-3643 Compliance Flow

```
Investor connects wallet
    │
    ├── 1. Identity check: Is ONCHAINID registered in IdentityRegistry?
    ├── 2. Claims check: Are KYC (1), AML (2), Accredited (7) claims verified?
    ├── 3. Jurisdiction check: Is investor country in approved list?
    └── 4. Compliance check: Does ModularCompliance.canTransfer() pass?
            │
            ├── CountryRestrictModule: Country not blocked?
            ├── MaxBalanceModule: Balance after transfer ≤ limit?
            └── SupplyLimitModule: Total supply after mint ≤ cap?
                    │
                    ├── ALL PASS → Transfer/mint executes
                    └── ANY FAIL → Transaction reverts (enforced in token contract)
```

## License

GPL-3.0 (required by T-REX dependency)
