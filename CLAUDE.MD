# Coppice - ERC-3643 Green Bond Tokenization on Hedera

## Project Overview

Compliant green bond tokenization using ERC-3643 (T-REX) on Hedera for the Hello Future Apex Hackathon 2026.

## Architecture

- **contracts/**: Hardhat project with T-REX v4.1.6 + OnchainID v2.0.0. Solidity 0.8.17.
- **middleware/**: Node.js scripts for HCS topics, HTS eUSD stablecoin, event logger.
- **frontend/**: Next.js 16 App Router + Tailwind CSS v4. MetaMask wallet integration via wagmi v3 + viem v2. API routes handle purchase/allocate (no separate middleware server needed).
- **e2e/**: Playwright E2E tests with MetaMask mocking.

## Critical Constraints

- Do NOT rewrite T-REX contracts — use them as-is from @tokenysolutions/t-rex@4.1.6
- Do NOT rewrite OnchainID contracts — use ABIs from @onchain-id/solidity@2.0.0
- Deployment follows exact sequence from reference/deploy-full-suite.fixture.ts
- Claims are signed by claimIssuerSigningKey (random wallet), added by wallet owner
- Token starts paused after deployment — must call unpause()
- HCS messages must be <1KB per chunk
- Always verify contracts on HashScan after deploying
- Only the deployer (token agent) can mint CPC tokens — purchase flow uses backend API

## Key Files

- Implementation plan: docs/plans/2026-03-13-coppice-green-bonds.md
- Low-hanging fruit plan: docs/plans/2026-03-14-low-hanging-fruit.md
- Frontend rebuild plan: docs/plans/2026-03-14-frontend-rebuild.md
- Audit docs: docs/audit-*.md
- Reference fixture: reference/deploy-full-suite.fixture.ts
- Accounts & keys: .env
- Wagmi config: frontend/lib/wagmi.ts
- Shared ABIs: packages/abi/ (generated via wagmi CLI from contract artifacts)
- Purchase/allocate API routes: frontend/app/api/purchase/route.ts, frontend/app/api/allocate/route.ts
- Hedera server utils: frontend/lib/hedera.ts

## Deployed Contracts & Topics

- Token (CPC): 0x17e19B53981370a904d0003Ba2D336837a43cbf0
- IdentityRegistry: 0x03ecdB8673d65b81752AC14dAaCa797D846c1B31
- ModularCompliance: 0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf
- ClaimIssuer: 0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A
- Audit HCS Topic: 0.0.8214934
- Impact HCS Topic: 0.0.8214935
- eUSD Token (HTS): 0.0.8214937

## Demo Wallets

| Role                 | Account     | Country  |
| -------------------- | ----------- | -------- |
| Deployer/Issuer      | 0.0.8213176 | —        |
| Alice (Verified)     | 0.0.8213185 | DE (276) |
| Bob (Unverified)     | 0.0.8214040 | US (840) |
| Charlie (Restricted) | 0.0.8214051 | CN (156) |
| Diana (Freeze demo)  | 0.0.8214895 | FR (250) |

## Commands

```bash
# Contracts
cd contracts && npx hardhat compile
cd contracts && npx hardhat test
cd contracts && npx hardhat run scripts/deploy.ts --network hederaTestnet
cd contracts && npx hardhat run scripts/verify-contracts.ts --network hederaTestnet

# Middleware (setup scripts + event logger only — purchase/allocate are now API routes)
cd middleware && npx tsx src/hcs-setup.ts
cd middleware && npx tsx src/hts-setup.ts
cd middleware && npm run event-logger

# Frontend (Next.js — includes API routes for purchase/allocate)
cd frontend && npm run dev

# E2E (requires frontend running — API routes are built-in)
cd e2e && npx playwright test
```

## Best practices/Standards

### React standards

- Avoid using `use client` when possible
- Prefer functional components over class components
- Use `bun/pnpm run lint` to check for linting errors after you're done

### Testing standards

- For each test, you MUST be able to name the specific code change that would make this test fail. If you can't, don't write it.
- After writing a test, you MUST break the code it guards, run the test, confirm it fails, then revert. This is non-negotiable. A test that passes with broken code is worse than no test.
- Mock dependencies, NEVER the subject under test. If testing component X, you may mock X's dependencies — you must NOT mock X itself.
- If every assertion checks a mock return value you set up yourself, the test verifies nothing. Rewrite it.
- Test the critical user path first, not whatever was built most recently.
- Prefer testing real behavior over implementation details. A test coupled to internal state (e.g. checking a specific useState value) breaks on refactors without catching bugs.

### Typescript standards

- Do not use `any` unless explicitly instructed otherwise
- Do not type cast unless explicitly instructed otherwise. If you must typecast, any usage must have a clear and convincing comment explaining why
- Avoid type casting as a solution to type errors unless it's absolutely necessary or explicitly instructed otherwise
- Avoid using @ts-expect-error, @ts-ignore, or @ts-nocheck unless absolutely necessary or explicitly instructed otherwise. Fix things instead
- Never do hot imports in code function bodies
- When using Zod schemas, derive TypeScript types using `z.infer<typeof schema>` rather than defining types separately - this prevents type drift where the schema and type diverge
- Prefer vitest for testing when able
- After making significant changes (adding functions, renaming files and functions, significant logic changes, etc), you should run `bun run lint`, `bun run build` and `bun run test:unit` to confirm your changes compile, or if you change multiple apps/packages, verify with `turbo run lint`, `turbo run build`, and `turbo run test:unit` (pnpm or bun allowed depending on the project standard, avoid yarn and npm unless standard in project)

### Solidity standards

- Always follow best practices for solidity development.
- Prefer foundry to hardhat when you're able to choose (may be restricted by vendor tech in rare cases)
- Prefer viem to ethers always when you're able to choose
- Always verify contracts after deploying. Always set up contract deployment scripts/plugins to automatically verify contracts when they're deployed
- Always analyze changes to the contracts for security vulnerabilities and fix them if detected

#### Foundry guidelines

- Confirm any significant changes compile w/ `forge build` after you're done
- Test any significant changes w/ `forge test` after you're done
- Check tests for compatibility w/ any new contract changes
- New public functions should have a corresponding script in the `script` folder
- Always prefer Error types over inline revert messages
- You may use Foundry's `console2.log` in scripts liberally and in contracts conservatively for debugging purposes and clarity
- When writing a new script or changing inputs and/or outputs of a script, you should update the README.md file to reflect the changes
- After deploying to a real environment (Base Mainnet, Base Sepolia, etc), you should run `forge verify` to verify the contracts on the blockchain.

### Other standards

- CLAUDE.MD and README.MD are living docs that should be reviewed for accuracy after major changes. Do not fill these with fluff, just make sure they're current.
- The year is 2026. If you search for "recent" information in the web and choose to include the year in your search, you should use the year 2025 or 2026. Avoid using 2024, 2023, or other years before 2025 when searching for up to date information
- According to <https://github.com/anthropics/claude-code/issues/13137>, bash permission wildcards don't match commands with redirects or special shell characters. To avoid me having to manually approve commands excessively, structure your commands to avoid the use of special characters when possible (esp ">", "&&", "||")
- You should always write e2e tests and unit tests for your work. When relevant, e2e tests should be configurable to run against, or should just outright run against real chains/frontends/backends/agents etc, and you should always test against real systems before claiming work is complete. Aim for high test coverage.
- Avoid using inline environment variables in commands you run, as this requires me to manually approve the command. Everything has a .env file you can source, or use dotenv or similar to load, for secrets
- Always opt out of optional telemetry. Don't remove code that disables it. Always ADD code that disables it when missing (such as in Claude settings in .claude/settings.json, turbo.json vars, envvars in github actions)
- When deprecating code, you don't have to worry about backwards compatibility or leaving a comment trail unless explicitly instructed otherwise, just remove the code.
- Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- Always think and do research to make sure you're confident before taking action, it's important for you to not code reflexively
