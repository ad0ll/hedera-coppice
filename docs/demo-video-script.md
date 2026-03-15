# Coppice Demo Video Script

**Max length:** 5 minutes (hard limit per hackathon rules)
**Target length:** 4:30 (leave buffer — judges penalize overtime, never under-time)
**Upload to:** YouTube (unlisted), link goes in pitch deck PDF

## Strategy

The judging weights are: Execution 20%, Success 20%, Integration 15%, Validation 15%, Innovation 10%, Feasibility 10%, Pitch 10%.

This script is structured to hit every criterion:
- **Innovation (10%):** Lead with the problem and why ERC-3643 on Hedera is novel — zero prior hackathon entries have done this
- **Integration (15%):** Explicitly name and show all 4 Hedera services in use
- **Execution (20%):** Show a working, polished product — not slides, not mockups
- **Feasibility (10%):** Reference ABN AMRO's real-world deployment as proof this model works
- **Validation (15%):** Cite the ABN AMRO precedent, DTCC joining ERC-3643 Association, EU Green Bond Standard
- **Success (20%):** Show on-chain transactions on HashScan — real testnet activity, real accounts
- **Pitch (10%):** Clear narrative arc: problem > solution > demo > why Hedera > future

## Recording Tips

- Screen record the live app at https://[vercel-url] connected to Hedera testnet
- Use a calm, confident voiceover — not rushed, not reading a script verbatim
- Pre-load all wallet states in MetaMask so switching is fast
- Keep MetaMask popups visible when signing — judges want to see real transactions
- Have HashScan tabs pre-loaded so you can cut to them quickly
- Resolution: 1920x1080, browser zoomed to 110% for readability on video

---

## SECTION 1: Problem & Innovation [0:00 - 0:45]

**What to show:** App landing page (Investor Portal, no wallet connected). The bond details card is visible with "Coppice Green Bond" header, symbol CPC, 4.25% coupon, 2028 maturity, total supply.

**Voiceover:**

> Green bonds are a half-trillion dollar market growing ten percent a year. But there's a trust problem. Issuers self-certify their bonds as "green." Impact reports show up a year late, if at all. And the compliance checks that are supposed to protect investors? They happen off-chain, in spreadsheets and PDFs, with no transparency.
>
> Coppice solves this. It's a compliant green bond tokenization platform built on ERC-3643 — the institutional standard for security tokens, used by ABN AMRO, backed by DTCC and Deloitte — deployed on Hedera.
>
> What makes this different from ABN AMRO's implementation on Polygon? Two things. First, we add on-chain use-of-proceeds tracking through Hedera Consensus Service, so fund allocations are immutable and publicly verifiable in real time — not buried in a PDF months later. Second, we use the Hedera Token Service for settlement with eUSD, making this a native multi-service Hedera application.
>
> Let me show you how it works.

**Key points to hit:**
- $527B market, 10% growth — shows market size (Feasibility, Validation)
- ABN AMRO precedent — proves the model works in production (Validation)
- ERC-3643 standard — not a toy, institutional grade (Innovation)
- 4 Hedera services — Smart Contracts, HCS, HTS, Mirror Node (Integration)
- "No one has built ERC-3643 in any past Hedera hackathon" — novelty (Innovation)

---

## SECTION 2: Compliant Investor — Alice [0:45 - 1:45]

**What to show:** Switch MetaMask to Alice's wallet. Connect wallet. The compliance checks animate in sequence.

**Actions:**
1. Click "Connect Wallet" (Alice's address appears in nav bar with green dot, labeled "Alice")
2. Watch the 4 compliance checks run in real-time:
   - Identity Registered: "ONCHAINID linked" (green check)
   - KYC / AML / Accredited: "All claims verified" (green check)
   - Jurisdiction Check: "Germany - Approved" (green check)
   - Compliance Module: "Transfer permitted" (green check)
3. "Eligible to Invest" badge appears
4. Point out Portfolio panel: CPC balance and eUSD balance (HTS)
5. Enter "50" in the Purchase Bond Tokens field
6. Click "Purchase" — show the 4-step transfer flow animate:
   - Verifying identity... (spinner -> check)
   - Checking compliance... (spinner -> check)
   - Approving eUSD spending... (MetaMask popup -> check)
   - Processing purchase... (spinner -> check)
7. Show the CPC balance update in the Portfolio panel

**Voiceover:**

> This is Alice, a verified German investor. When she connects her wallet, four real-time compliance checks hit the Hedera smart contracts. Her ONCHAINID is linked — that's the on-chain identity standard from ERC-3643. Her KYC, AML, and accreditation claims are all verified by our trusted claim issuer. Germany is an approved jurisdiction. And the modular compliance engine confirms the transfer is permitted.
>
> Alice is eligible. She enters an amount and clicks Purchase. Watch the four steps — each one is a real on-chain action. Identity verification. Compliance check. Then Alice approves the eUSD spending in MetaMask — that's a real ERC-20 approve call on the HTS token's EVM facade. Finally, the backend does an atomic transferFrom plus ERC-3643 mint. Every step is a real transaction.
>
> Her portfolio now shows the updated CPC bond token balance alongside her eUSD balance — that's a native HTS token, not an ERC-20.

**Key points to hit:**
- 4 compliance checks are real contract calls, not mocked (Execution)
- Each purchase step is a real transaction (Execution, Success)
- eUSD is HTS with ERC-20 facade via HIP-218 — shows deep Hedera integration (Integration)
- ONCHAINID is the identity standard (Innovation — shows depth of ERC-3643 knowledge)

---

## SECTION 3: Rejected Investors — Bob & Charlie [1:45 - 2:30]

**What to show:** Disconnect Alice. Switch MetaMask to Bob's wallet. Connect.

**Actions (Bob):**
1. Connect as Bob — compliance checks run
2. Identity Registered: "No identity found" (red X)
3. All remaining checks: "Not registered" (red X)
4. "Not Eligible" badge appears
5. Purchase section shows: "You must pass all compliance checks before purchasing"
6. Purchase button is greyed out / disabled

**Actions (Charlie):**
1. Disconnect Bob, switch to Charlie, connect
2. Identity Registered: "ONCHAINID linked" (green check)
3. KYC / AML / Accredited: "All claims verified" (green check)
4. Jurisdiction Check: "China - Restricted" (red X)
5. Compliance Module: "Transfer blocked by compliance" (red X)
6. "Not Eligible" badge appears

**Voiceover:**

> Now watch what happens when compliance fails. Bob is a US-based user with no on-chain identity. The first check fails — no ONCHAINID linked — and the entire flow stops. He can't purchase.
>
> Charlie is more interesting. He has a verified on-chain identity. His KYC, AML, and accreditation claims all pass. But his jurisdiction is China, which is a restricted country in our compliance module. The modular compliance engine blocks the transfer. Charlie sees exactly why he's rejected — there's no ambiguity.
>
> This is what ERC-3643 gives you that a normal ERC-20 can't: compliance is enforced at the protocol level. It's not an optional check — it's baked into the token contract. You physically cannot transfer tokens to a non-compliant address.

**Key points to hit:**
- Two distinct failure modes — identity vs. jurisdiction (Execution — shows depth)
- "Compliance at the protocol level" — key differentiator from ERC-20 (Innovation)
- Clear user feedback — good UX even on failure (Design & UX under Execution)

---

## SECTION 4: Issuer Dashboard — Mint, Freeze, Pause [2:30 - 3:30]

**What to show:** Switch to Deployer/Issuer wallet. Navigate to "Issuer" tab.

**Actions:**
1. Connect as Deployer — "Issuer Dashboard" heading appears
2. **Mint:** Enter Alice's address + "100" amount, click Mint
   - Show success message: "Minted 100 CPC to 0x4f9ad4..."
3. **Freeze:** Enter Diana's address, click "Freeze"
   - Show success message: "Froze 0x35bccFFf..."
   - (Optional: briefly switch to HashScan tab showing the transaction)
4. **Unfreeze:** Click "Unfreeze" for Diana
   - Show success message: "Unfroze 0x35bccFFf..."
5. **Pause:** Click "Pause Token"
   - Status indicator changes from green "Active" to red "Paused"
   - Show success: "Token paused"
6. **Unpause:** Click "Unpause Token"
   - Status returns to green "Active"
   - Show success: "Token unpaused"
7. Briefly show the "Use of Proceeds" section and "Allocate to HCS" form

**Voiceover:**

> The issuer dashboard gives the bond issuer — in this case, the deployer wallet — full control. I can mint new bond tokens to any compliant address. Watch — 100 CPC minted to Alice. That's a real transaction on Hedera testnet.
>
> Regulatory controls are critical for compliant securities. I can freeze Diana's wallet — she's a French investor under investigation. Now she can't send or receive tokens. I can unfreeze her when cleared. I can pause the entire token — halting all transfers globally — and unpause when ready.
>
> Every one of these actions is an on-chain transaction. And every one of them is being logged to a Hedera Consensus Service topic as an immutable audit record. Let me show you.

**Key points to hit:**
- Real transactions happening live (Execution, Success)
- Freeze/unfreeze and pause/unpause — regulatory controls that make this a real security token (Feasibility)
- "Logged to HCS" — tees up the compliance monitor (Integration)

---

## SECTION 5: Compliance Monitor & HCS Audit Trail [3:30 - 4:10]

**What to show:** Navigate to "Compliance" tab.

**Actions:**
1. Show the three stats cards at top: Total Events, Approvals (green), Restrictions (red)
2. Show the Audit Event Feed — real events from HCS with color-coded badges:
   - MINT (green), TRANSFER (green), WALLET_FROZEN (red), WALLET_UNFROZEN (green), TOKEN_PAUSED (red), TOKEN_UNPAUSED (green)
3. Click the event type filter buttons to show filtering works
4. Click a transaction hash link — it opens HashScan showing the real transaction
5. Stay on HashScan for 3-5 seconds so judges see it's real testnet data

**Voiceover:**

> The compliance monitor pulls events directly from the Hedera Consensus Service via the Mirror Node API. Every mint, every transfer, every freeze, every pause — it's all here as an immutable, timestamped record.
>
> These aren't mock events. Each one links to a real transaction on HashScan. [Click a tx hash] Here's the mint we just did — you can see the contract address, the method call, the block confirmation on Hedera testnet.
>
> This is the use-of-proceeds transparency that the green bond market is missing. Fund allocations posted to HCS are permanent and publicly verifiable — no more waiting for annual impact reports.

**Key points to hit:**
- HCS events are real, not mocked (Execution, Success)
- HashScan link proves on-chain activity (Success — "account creation, active users, TPS increase")
- Mirror Node API integration (Integration — 4th Hedera service explicitly named)
- "Immutable, timestamped record" — hits the sustainability/transparency narrative

---

## SECTION 6: Architecture & Why Hedera [4:10 - 4:45]

**What to show:** You have two options:
- **Option A (preferred):** Show the GitHub README with the architecture diagram, scrolling slowly
- **Option B:** Cut to a slide from the pitch deck showing the architecture

**Voiceover:**

> Let me quickly walk through the architecture. Coppice uses four Hedera services. Smart Contracts run the ERC-3643 suite — Token, IdentityRegistry, ModularCompliance, and ClaimIssuer. The Hedera Consensus Service provides the immutable audit trail and use-of-proceeds tracking. The Hedera Token Service powers eUSD for settlement. And the Mirror Node API feeds real-time data to the frontend.
>
> Why Hedera and not Ethereum or Polygon? Three reasons. First, Hedera is carbon-negative — it's the only network where a "green bond" actually runs on a green network. Second, predictable low fees make compliance-heavy transactions economical — every transfer triggers multiple contract calls. Third, the Hedera Foundation is a member of the ERC-3643 Association, so this isn't just compatible — it's strategically aligned.

**Key points to hit:**
- Name all 4 services explicitly (Integration — judges are scoring this)
- Carbon-negative narrative (perfect for DeFi & Tokenization + Sustainability crossover)
- Low fees matter for compliance-heavy tokens (Feasibility)
- Hedera Foundation is an ERC-3643 Association member (Validation)

---

## SECTION 7: Close [4:45 - 5:00]

**What to show:** Return to the app, Investor Portal with Alice connected, showing the "Eligible to Invest" badge and her portfolio.

**Voiceover:**

> Coppice brings institutional-grade compliant tokenization to Hedera. A hundred and one tests — thirty-two smart contract, twenty-six frontend unit, forty-three end-to-end browser — all passing. Five contracts deployed on testnet. A working live demo you can try right now.
>
> Thank you for watching.

**Key points to hit:**
- Test counts signal engineering rigor (Execution)
- "Live demo you can try right now" — they can verify everything (Success)
- End on the polished UI, not a slide (Execution — Design & UX)
- Short, confident close — don't ramble

---

## Pre-Recording Checklist

Before you hit record:

- [ ] Vercel deployment is live and working
- [ ] MetaMask has all 4 wallets configured (Deployer, Alice, Bob, Charlie)
- [ ] Diana is NOT frozen (reset state before recording)
- [ ] Token is NOT paused
- [ ] Have HashScan tabs pre-loaded for the token contract
- [ ] Browser at 1920x1080, zoomed to 110%
- [ ] Close all other tabs, notifications off, clean desktop
- [ ] Test the full flow once before recording — make sure all transactions go through
- [ ] Audio levels tested — clear voiceover, no background noise
- [ ] Event logger is running (`cd services && npx tsx src/event-logger.ts`)
  so that actions during recording appear in the Compliance Monitor

## Timing Breakdown

| Section | Duration | Cumulative | Focus |
|---------|----------|------------|-------|
| 1. Problem & Innovation | 0:45 | 0:45 | Pitch, Innovation, Validation |
| 2. Alice (compliant) | 1:00 | 1:45 | Execution, Integration, Success |
| 3. Bob & Charlie (rejected) | 0:45 | 2:30 | Execution, Innovation |
| 4. Issuer Dashboard | 1:00 | 3:30 | Execution, Feasibility, Success |
| 5. Compliance Monitor | 0:40 | 4:10 | Integration, Success |
| 6. Architecture & Why Hedera | 0:35 | 4:45 | Integration, Feasibility, Validation |
| 7. Close | 0:15 | 5:00 | Execution |

Every section maps to at least 2 judging criteria. The heaviest-weighted criteria (Execution 20%, Success 20%) get the most screen time (Sections 2-5 = 3:25 of live product demo).
