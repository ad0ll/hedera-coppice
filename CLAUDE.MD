# Coppice - ERC-3643 Green Bond Tokenization on Hedera

## Project Overview
Compliant green bond tokenization using ERC-3643 (T-REX) on Hedera for the Hello Future Apex Hackathon 2026.

## Architecture
- **contracts/**: Hardhat project with T-REX v4.1.6 + OnchainID v2.0.0. Solidity 0.8.17.
- **middleware/**: Node.js scripts for HCS topics, HTS eUSD stablecoin, event logger.
- **frontend/**: React + Vite + Tailwind CSS. MetaMask wallet integration, ethers.js v6.
- **e2e/**: Playwright E2E tests with MetaMask mocking.

## Critical Constraints
- Do NOT rewrite T-REX contracts — use them as-is from @tokenysolutions/t-rex@4.1.6
- Do NOT rewrite OnchainID contracts — use ABIs from @onchain-id/solidity@2.0.0
- Deployment follows exact sequence from reference/deploy-full-suite.fixture.ts
- Claims are signed by claimIssuerSigningKey (random wallet), added by wallet owner
- Token starts paused after deployment — must call unpause()
- HCS messages must be <1KB per chunk

## Key Files
- Implementation plan: docs/plans/2026-03-13-coppice-green-bonds.md
- Design plan: /Users/adoll/.claude/plans/sorted-honking-newell.md
- Reference fixture: reference/deploy-full-suite.fixture.ts
- Accounts & keys: .env

## Demo Wallets
| Role | Account | Country |
|------|---------|---------|
| Deployer/Issuer | 0.0.8213176 | — |
| Alice (Verified) | 0.0.8213185 | DE (276) |
| Bob (Unverified) | 0.0.8214040 | US (840) |
| Charlie (Restricted) | 0.0.8214051 | CN (156) |
| Diana (Freeze demo) | TBD | FR (250) |

## Commands
```bash
# Contracts
cd contracts && npx hardhat compile
cd contracts && npx hardhat test
cd contracts && npx hardhat run scripts/deploy.ts --network hederaTestnet

# Middleware
cd middleware && npx tsx src/hcs-setup.ts
cd middleware && npx tsx src/hts-setup.ts

# Frontend
cd frontend && npm run dev

# E2E
cd e2e && npx playwright test
```
