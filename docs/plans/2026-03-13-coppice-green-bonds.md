# Coppice Green Bond Tokenization - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a compliant ERC-3643 green bond tokenization platform on Hedera with 4 service integrations (Smart Contracts, HCS, HTS, Mirror Node) for the Hello Future Apex Hackathon 2026.

**Architecture:** ERC-3643 T-REX contracts deployed via TREXFactory on Hedera EVM. HCS provides immutable compliance audit trail and use-of-proceeds tracking. HTS provides mock eUSD stablecoin for bond purchases. React frontend with MetaMask wallet integration reads compliance state from contracts and audit events from Mirror Node API.

**Tech Stack:** Hardhat + @tokenysolutions/t-rex@4.1.6, @onchain-id/solidity@2.0.0, @hashgraph/sdk, React + Vite + Tailwind CSS, ethers.js v6, Playwright for E2E testing.

**Full design plan:** `/Users/adoll/.claude/plans/sorted-honking-newell.md`
**Reference fixture:** `reference/deploy-full-suite.fixture.ts`
**Accounts & keys:** `.env` at project root

---

### Task 1: Monorepo Initialization

**Files:**
- Create: `package.json` (workspace root)
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/tsconfig.json`
- Create: `middleware/package.json`
- Create: `middleware/tsconfig.json`
- Create: `.gitignore`
- Create: `CLAUDE.md`

**Step 1:** Initialize root package.json with npm workspaces for `contracts`, `middleware`, `frontend`, `e2e`
**Step 2:** Initialize contracts/ as a Hardhat TypeScript project with dependencies: hardhat, @nomicfoundation/hardhat-toolbox, @tokenysolutions/t-rex@4.1.6, @onchain-id/solidity@2.0.0, dotenv
**Step 3:** Configure hardhat.config.ts with Solidity 0.8.17, optimizer (200 runs), hederaTestnet network (chain 296, hashio RPC, deployer key from .env)
**Step 4:** Initialize middleware/ with dependencies: @hashgraph/sdk, ethers@6, dotenv, tsx
**Step 5:** Create .gitignore (node_modules, .env, artifacts, cache, dist)
**Step 6:** Create CLAUDE.md with project context, constraints ("do NOT rewrite T-REX contracts"), and links to plan docs
**Step 7:** Run `npm install` from root, verify Hardhat compiles T-REX contracts: `cd contracts && npx hardhat compile`
**Step 8:** Commit: "chore: initialize monorepo with contracts and middleware workspaces"

---

### Task 2: Deployment Script (deploy.ts)

**Files:**
- Create: `contracts/scripts/deploy.ts`
- Create: `contracts/scripts/helpers.ts`

**Step 1:** Write deploy.ts following the exact sequence from `reference/deploy-full-suite.fixture.ts`:
- Deploy 6 T-REX implementation contracts (Token, IdentityRegistry, IdentityRegistryStorage, ClaimTopicsRegistry, TrustedIssuersRegistry, ModularCompliance)
- Deploy OnchainID system (Identity impl, ImplementationAuthority, Factory) using @onchain-id/solidity ABIs
- Deploy TREXImplementationAuthority(true, AddressZero, AddressZero), then addAndUseTREXVersion({major:4,minor:0,patch:0}, contractsStruct)
- Deploy TREXFactory(trexImplAuth, identityFactory), then identityFactory.addTokenFactory(trexFactory)
- Deploy compliance modules (CountryRestrictModule, MaxHoldersModule, MaxBalanceModule)
- Deploy ClaimIssuer with a random signing key (purpose=3, type=1)
- Call factory.deployTREXSuite() with TokenDetails and ClaimDetails
- Extract addresses from TREXSuiteDeployed event
- Save all addresses + claimIssuerSigningKey to JSON file
**Step 2:** Add structured logging: step name, tx hash, deployed address, timing
**Step 3:** Add error handling: if any step fails, save partial state to JSON for debugging
**Step 4:** Test locally: `npx hardhat run scripts/deploy.ts` (local Hardhat network)
**Step 5:** Commit: "feat: add ERC-3643 deployment script via TREXFactory"

---

### Task 3: Demo Setup Script (setup-demo.ts)

**Files:**
- Create: `contracts/scripts/setup-demo.ts`

**Step 1:** Write setup-demo.ts that reads deployed addresses from Task 2 JSON output:
- Create Diana's account programmatically via Hedera SDK (AccountCreateTransaction with ECDSA key)
- Deploy ONCHAINID for Alice, Charlie, Diana via identity factory
- Add deployer + token as agents on identity registry
- Batch register identities with country codes (Alice=276/DE, Charlie=156/CN, Diana=250/FR)
- Issue claims (topics 1,2,7) signed by claimIssuerSigningKey, added by each wallet owner
- Mint 100,000 CPC tokens to deployer
- Unpause token
- Run verification checks (isVerified, canTransfer)
**Step 2:** Test locally: `npx hardhat run scripts/setup-demo.ts` (uses signers from Hardhat)
**Step 3:** Commit: "feat: add demo wallet setup with identities and claims"

---

### Task 4: Hardhat Tests

**Files:**
- Create: `contracts/test/deployment.test.ts`
- Create: `contracts/test/compliance.test.ts`
- Create: `contracts/test/transfers.test.ts`

**Step 1:** Write deployment.test.ts: verify factory deploys suite, all addresses non-zero, token name/symbol/decimals correct, deployer is agent
**Step 2:** Write compliance.test.ts: isVerified(alice)=true, isVerified(bob)=false, canTransfer(deployer,alice,500)=true, canTransfer(deployer,charlie,500)=false, CountryRestrict blocks CN
**Step 3:** Write transfers.test.ts: compliant transfer succeeds, unverified rejects, restricted country rejects, freeze/unfreeze flow, pause/unpause flow, minting works
**Step 4:** Run: `npx hardhat test` -- all tests pass
**Step 5:** Commit: "test: add deployment, compliance, and transfer test suites"

---

### Task 5: Deploy to Hedera Testnet

**Step 1:** Run: `npx hardhat run scripts/deploy.ts --network hederaTestnet`
**Step 2:** Run: `npx hardhat run scripts/setup-demo.ts --network hederaTestnet`
**Step 3:** Update .env with deployed addresses
**Step 4:** Smoke test: execute a transfer from deployer to Alice via Hardhat console on testnet
**Step 5:** Verify contracts on HashScan
**Step 6:** Commit: "chore: deploy to Hedera testnet, save addresses"

---

### Task 6: HCS Topics + HTS eUSD (Middleware)

**Files:**
- Create: `middleware/src/hcs-setup.ts`
- Create: `middleware/src/hts-setup.ts`
- Create: `middleware/src/config.ts`

**Step 1:** Write config.ts: Hedera SDK client init from .env, export client + operator key
**Step 2:** Write hcs-setup.ts: create 2 HCS topics (Compliance Audit Trail, Green Bond Impact), save topic IDs
**Step 3:** Write hts-setup.ts: create eUSD token (FungibleCommon, decimals=2, 100K supply), associate wallets (each wallet signs), distribute 10K eUSD each
**Step 4:** Run scripts, verify via Mirror Node API
**Step 5:** Update .env with topic IDs and eUSD token ID
**Step 6:** Commit: "feat: add HCS topic creation and HTS eUSD stablecoin setup"

---

### Task 7: HCS Event Logger

**Files:**
- Create: `middleware/src/event-logger.ts`

**Step 1:** Write event-logger.ts: connect to Token contract via ethers.js, listen for Transfer/Paused/Unpaused/AddressFrozen events, construct JSON payload (<1KB), submit to HCS audit topic
**Step 2:** Start event-logger, trigger transfer on testnet, verify HCS message appears in Mirror Node
**Step 3:** Commit: "feat: add HCS event logger for compliance audit trail"

---

### Task 8: Frontend Scaffold + WalletProvider

**Files:**
- Create: `frontend/` (Vite + React + TypeScript + Tailwind)
- Create: `frontend/src/providers/WalletProvider.tsx`
- Create: `frontend/src/lib/contracts.ts`
- Create: `frontend/src/lib/constants.ts`
- Create: `frontend/src/App.tsx`

**Step 1:** Scaffold: `npm create vite@latest frontend -- --template react-ts`
**Step 2:** Install + configure Tailwind CSS with dark mode
**Step 3:** Create WalletProvider: MetaMask connection, ethers BrowserProvider/Signer, chain switching to 296
**Step 4:** Create contracts.ts: import ABIs from Hardhat artifacts, create typed contract instances
**Step 5:** Create constants.ts: addresses, topic IDs, demo wallet labels
**Step 6:** Set up React Router: /invest, /issue, /monitor
**Step 7:** Verify: `npm run dev` shows app with wallet connect button
**Step 8:** Commit: "feat: scaffold frontend with wallet provider and routing"

---

### Task 9: Frontend Hooks

**Files:**
- Create: `frontend/src/hooks/useToken.ts`
- Create: `frontend/src/hooks/useIdentity.ts`
- Create: `frontend/src/hooks/useCompliance.ts`
- Create: `frontend/src/hooks/useHCSAudit.ts`
- Create: `frontend/src/hooks/useHTS.ts`

**Step 1:** useToken: balance, transfer, mint, pause/unpause, freeze/unfreeze, totalSupply
**Step 2:** useIdentity: isVerified, getCountry, getIdentity
**Step 3:** useCompliance: canTransfer pre-check
**Step 4:** useHCSAudit: poll Mirror Node /api/v1/topics/{topicId}/messages, decode base64, parse JSON, track sequence numbers
**Step 5:** useHTS: read eUSD balance via Mirror Node /api/v1/accounts/{accountId}/tokens
**Step 6:** Commit: "feat: add contract interaction hooks and Mirror Node polling"

---

### Task 10: InvestorPortal Page

**Files:**
- Create: `frontend/src/pages/InvestorPortal.tsx`
- Create: `frontend/src/components/ComplianceStatus.tsx`
- Create: `frontend/src/components/TransferFlow.tsx`
- Create: `frontend/src/components/BondDetails.tsx`

**Step 1:** BondDetails: display bond name, coupon, maturity, supply, holder count from Token contract
**Step 2:** ComplianceStatus: call isVerified(), show KYC/AML/Accredited/Jurisdiction as green checks or red X
**Step 3:** TransferFlow: animated 4-step process (identity check, compliance check, eUSD payment, bond issuance) with success/failure states
**Step 4:** InvestorPortal: compose all components, purchase flow, portfolio balance display
**Step 5:** Manual test: connect Alice wallet -> all green -> purchase succeeds
**Step 6:** Manual test: connect Bob wallet -> all red -> purchase blocked
**Step 7:** Commit: "feat: add InvestorPortal with compliance checks and transfer flow"

---

### Task 11: IssuerDashboard Page

**Files:**
- Create: `frontend/src/pages/IssuerDashboard.tsx`
- Create: `frontend/src/components/ProjectAllocation.tsx`

**Step 1:** Mint section: form to mint tokens to address
**Step 2:** Proceeds allocation: form -> submit JSON to HCS impact topic -> display as ProjectAllocation cards
**Step 3:** Use-of-proceeds pie chart from HCS messages
**Step 4:** Admin controls: freeze/unfreeze wallet, pause/unpause token
**Step 5:** Manual test: mint tokens, allocate proceeds, freeze/unfreeze
**Step 6:** Commit: "feat: add IssuerDashboard with minting and proceeds allocation"

---

### Task 12: ComplianceMonitor Page

**Files:**
- Create: `frontend/src/pages/ComplianceMonitor.tsx`
- Create: `frontend/src/components/AuditEventFeed.tsx`

**Step 1:** AuditEventFeed: poll Mirror Node, decode base64, render chronological feed, color-code events
**Step 2:** ComplianceMonitor: event feed + filters + stats
**Step 3:** Manual test: trigger events, verify they appear in feed
**Step 4:** Commit: "feat: add ComplianceMonitor with real-time HCS audit feed"

---

### Task 13: Design Polish

**Step 1:** Run Impeccable /audit on all pages
**Step 2:** Apply fixes: spacing, alignment, consistency
**Step 3:** Run Impeccable /polish
**Step 4:** Verify dark mode, accent colors (green/red/amber), responsive layout
**Step 5:** Commit: "style: polish UI with institutional dark theme"

---

### Task 14: Playwright E2E Tests

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/fixtures/wallet-mock.ts`
- Create: `e2e/tests/investor-portal.spec.ts`
- Create: `e2e/tests/issuer-dashboard.spec.ts`
- Create: `e2e/tests/compliance-monitor.spec.ts`
- Create: `e2e/tests/full-demo-flow.spec.ts`

**Step 1:** wallet-mock.ts: create mock EIP-1193 provider injected via page.addInitScript()
**Step 2:** investor-portal.spec.ts: Alice compliant purchase, Bob rejected, Charlie restricted country
**Step 3:** issuer-dashboard.spec.ts: mint tokens, allocate proceeds, freeze/unfreeze Diana
**Step 4:** compliance-monitor.spec.ts: audit events display, color coding, timestamps
**Step 5:** full-demo-flow.spec.ts: complete demo script end-to-end (the confidence test)
**Step 6:** Run: `npx playwright test` -- all pass
**Step 7:** Commit: "test: add Playwright E2E test suite"

---

### Task 15: Submission Artifacts

**Step 1:** Write comprehensive README.md (project description, setup, architecture, running, testing, tech stack, license)
**Step 2:** Deploy frontend to Vercel with env vars
**Step 3:** Verify live demo URL works end-to-end
**Step 4:** Final commit: "docs: add README and submission artifacts"

---

## Execution Notes

- Tasks 1-5 = Phase 1 (Smart Contracts) -- the foundation, must work first
- Tasks 6-7 = Phase 2 (Middleware) -- HCS/HTS integration
- Tasks 8-12 = Phase 3 (Frontend) -- UI layer
- Task 13 = Design polish
- Task 14 = Phase 4 (E2E Testing)
- Task 15 = Phase 5 (Submission)

Each task has a verification step before committing. If any task fails on testnet, debug before proceeding.
