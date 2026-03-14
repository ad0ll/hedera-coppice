# Coppice - ERC-3643 Green Bond Tokenization on Hedera

Coppice is a compliant green bond tokenization platform built on the [ERC-3643](https://erc3643.info/) (T-REX) standard, deployed on the Hedera network. Named after the ancient woodland management technique where trees are sustainably harvested and regrow — a metaphor for sustainable finance.

Built for the **Hedera Hello Future: Apex Hackathon 2026** (DeFi & Tokenization track).

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

**4 Hedera Services Used:**
1. **Smart Contracts** — ERC-3643 T-REX suite (Token, IdentityRegistry, ModularCompliance, ClaimIssuer)
2. **Hedera Consensus Service (HCS)** — Immutable audit trail and use-of-proceeds tracking
3. **Hedera Token Service (HTS)** — eUSD mock stablecoin for bond purchases
4. **Mirror Node** — Real-time event feed and balance queries

## Demo Wallets

| Role | Hedera Account | Country | Status |
|------|---------------|---------|--------|
| Deployer/Issuer | 0.0.8213176 | DE | Agent (can mint, freeze, pause) |
| Alice | 0.0.8213185 | DE (276) | Verified — can invest |
| Bob | 0.0.8214040 | US (840) | Unverified — no ONCHAINID, blocked |
| Charlie | 0.0.8214051 | CN (156) | Verified but country restricted |
| Diana | 0.0.8214895 | FR (250) | Verified — freeze/unfreeze demo |

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

# Run Hardhat tests (local)
cd contracts && npx hardhat test

# Start frontend
cd frontend && npm run dev

# Run E2E tests
cd e2e && npx playwright test
```

### Deploy to Hedera Testnet

```bash
# 1. Copy and configure .env
cp .env.example .env  # Add your keys

# 2. Deploy contracts
cd contracts
npx hardhat run scripts/deploy.ts --network hederaTestnet
npx hardhat run scripts/setup-demo.ts --network hederaTestnet

# 3. Create HCS topics and HTS eUSD
cd ../middleware
npx tsx src/hcs-setup.ts
npx tsx src/hts-setup.ts

# 4. Start event logger (background)
npx tsx src/event-logger.ts &

# 5. Start frontend
cd ../frontend && npm run dev
```

### Deploy Frontend to Vercel

```bash
cd frontend
npx vercel --prod
```

Environment variables are in `frontend/.env` — these are public testnet contract addresses, safe to include in the build. The `vercel.json` handles SPA routing.

## Project Structure

```
hedera-green-bonds/
├── contracts/              # Hardhat project
│   ├── contracts/Imports.sol    # Pulls T-REX from node_modules
│   ├── scripts/
│   │   ├── deploy.ts           # 7-phase TREXFactory deployment
│   │   ├── setup-demo.ts       # Identity + claims + mint + unpause
│   │   └── helpers.ts          # Address save/load utilities
│   └── test/
│       ├── deployment.test.ts   # 6 tests
│       ├── compliance.test.ts   # 10 tests
│       └── transfers.test.ts    # 16 tests
├── middleware/             # HCS/HTS Node.js scripts
│   └── src/
│       ├── config.ts           # Hedera SDK client setup
│       ├── create-diana.ts     # Create Diana's account
│       ├── hcs-setup.ts        # Create HCS topics
│       ├── hts-setup.ts        # Create eUSD, associate, distribute
│       └── event-logger.ts     # Token events → HCS audit trail
├── frontend/               # React + Vite + Tailwind CSS
│   └── src/
│       ├── providers/WalletProvider.tsx
│       ├── hooks/              # useToken, useIdentity, useCompliance, useHCSAudit, useHTS
│       ├── pages/              # InvestorPortal, IssuerDashboard, ComplianceMonitor
│       ├── components/         # BondDetails, ComplianceStatus, TransferFlow, AuditEventFeed
│       └── lib/                # contracts.ts, constants.ts
├── e2e/                    # Playwright E2E tests
│   ├── fixtures/wallet-mock.ts
│   └── tests/              # 18 tests across 4 files
└── docs/                   # Plans and documentation
```

## Testing

### Smart Contract Tests (32 tests)
```bash
cd contracts && npx hardhat test
```

Tests cover:
- **Deployment:** Token metadata, agent roles, initial supply
- **Compliance:** Identity verification, country restrictions, supply limits
- **Transfers:** Compliant transfers, rejections (unverified, restricted country), freeze/unfreeze, pause/unpause, minting

### E2E Tests (18 tests)
```bash
cd e2e && npx playwright test
```

Tests cover:
- **Investor Portal:** Bond details display, Alice (eligible), Bob (rejected), Charlie (restricted)
- **Issuer Dashboard:** Controls visibility, mint/freeze/pause forms
- **Compliance Monitor:** Event feed, stats display
- **Full Demo Flow:** End-to-end navigation and wallet switching

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity 0.8.17, T-REX v4.1.6, OnchainID v2.0.0 |
| Development | Hardhat, TypeScript |
| Frontend | React, Vite, Tailwind CSS v4, ethers.js v6 |
| Hedera SDK | @hashgraph/sdk for HCS/HTS |
| Testing | Mocha/Chai (contracts), Playwright (E2E) |
| Network | Hedera Testnet (Chain ID 296) |

## Key Contracts (Hedera Testnet)

| Contract | Address |
|----------|---------|
| Token (CPC) | `0x17e19B53981370a904d0003Ba2D336837a43cbf0` |
| IdentityRegistry | `0x03ecdB8673d65b81752AC14dAaCa797D846c1B31` |
| ModularCompliance | `0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf` |
| ClaimIssuer | `0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A` |
| TREXFactory | `0x78A20A45aA6Bb35f516fFf5dcE26f25C86e03d7f` |

## HCS Topics & HTS Tokens

| Resource | ID |
|----------|----|
| Audit Trail (HCS) | `0.0.8214934` |
| Impact Tracking (HCS) | `0.0.8214935` |
| eUSD Stablecoin (HTS) | `0.0.8214937` |

## Compliance Modules

1. **CountryRestrictModule** — Blocks transfers to/from restricted countries (CN, code 156)
2. **MaxBalanceModule** — Limits individual holder balance to 1,000,000 CPC
3. **SupplyLimitModule** — Caps total token supply at 1,000,000 CPC

## License

GPL-3.0 (required by T-REX dependency)
