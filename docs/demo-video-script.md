# Coppice Demo Video Script

Coppice is a Green Bond system th
Green bonds are a 3 trillion dollar industry, but all currently implementations focus purely on the financials.
Green Bonds served through Coppice are a compliant financial instrument, but the key 
If you want to make sure that the green bonds you are buying are genuinely being invested into positive environment impacts, Coppice is your platform.

Coppice integrates with two core Hedera services"

1. Asset Tokenization Studio -> We use its backend + deployed contracts for managing KYC, Policies, and ERC-3643 stuffs. By using ATS, we don't have to reinvent the wheel and research + implement compliance for multiple companies
2. Guardian -> A system for tracking MRV (oversimplified explanation)
3. HCS (what does this stand for) -> Enablees creating a full audit trail for the whole lifecycle of a bond + tracking projects the fund has invested in

Coppice's sits in front of an ATS + Guardian based backend with its own green bond specific frontend, and has it's own contract and HCS chain for tracking where funds have been allocated

The problem with trad-fi Green Bonds:


Why do green bonds:
1. 
2. Green bonds attract investors with the "Greenium"
3. However, people generally, especially younger people, are extremely skeptical of ESG and Carbon Credits, for good reason

I understand and wholly sympathize with the people who roll their eyes when you talk about blockchain and environmental impact in the same sentence. 

While Hedera has put more effort into environmental good than I'm used to seeing w/ other blockchains, it is objectively true that cryptocurrency broadly negatively impacts the climate.

The thing that we need to communicate to investors is that the reason we should move this on chain is because blockchain, as a technology, genuinely addresses the inefficiencies and problems that investors in web2 green bonds have right now:
1. A lack of transparency + accountability for which projects are being funded
2. Poor and low quality tracking of outcomes from funded projects
3. Awareness and concern for greenwashing, financial products + environmental good are often mutually exclusive in practice
(Need to get more diversity)

Bringing this on chain makes sense for two reasons:
1. First, smart contracts + existing open source infrastructure simplify compliance. ERC-3643 is idiot-proof, it has the rules for onboarding investors built in, letting us keep our team lean. I'm in this hackathon as a solo developer, I would not have been able to put this together in a week if I had to learn about all regulations in depth.
2. Block chains + W3C Verified Credentials do support variations of privacy laws in different regulatory environments
2. The block chain's distributed infrastructure and transparency ensures that investors can always see the data. This increased level of scrutiny is a counter-weight to the bond issuer that forces them to be accountable to a vision that genuinely (improves the environment).


This is all


Challenges with this product:
1. Political risk:
2. 

Solution: Broadly speaking, the solution for this is to first launch the product in the EU, which is the most invested. Later expand to China and the US at least.


**Max length:** 5 minutes (hard limit per hackathon rules)
**Target length:** 4:30 (leave buffer -- judges penalize overtime, never under-time)
**Upload to:** YouTube (unlisted), link goes in pitch deck PDF

## Strategy

The judging weights are: Execution 20%, Success 20%, Integration 15%, Validation 15%, Innovation 10%, Feasibility 10%, Pitch 10%.

This script is structured to hit every criterion:
- **Innovation (10%):** Lead with the problem and why ERC-3643 on Hedera is novel -- zero prior hackathon entries have done this
- **Integration (15%):** Explicitly name and show all 4 Hedera services in use
- **Execution (20%):** Show a working, polished product -- not slides, not mockups
- **Feasibility (10%):** Reference ABN AMRO's real-world deployment; mention Business Model Canvas
- **Validation (15%):** Cite ABN AMRO precedent, DTCC joining ERC-3643 Association, EU Green Bond Standard
- **Success (20%):** Show on-chain transactions on HashScan, quantify ecosystem impact potential
- **Pitch (10%):** Clear narrative arc: problem > solution > demo > why Hedera > future

## Recording Tips

- Screen record the live app on Vercel connected to Hedera testnet
- Use a calm, confident voiceover -- not rushed, not reading a script verbatim
- Pre-load all wallet states in MetaMask so switching is fast
- Keep MetaMask popups visible when signing -- judges want to see real transactions
- Have HashScan tabs pre-loaded so you can cut to them quickly
- Resolution: 1920x1080, browser zoomed to 110% for readability on video

---

## SECTION 1: Problem & Innovation [0:00 - 0:40]

**What to show:** App landing page (Investor Portal, no wallet connected). The bond details card is visible with "Coppice Green Bond" header, symbol CPC, 4.25% coupon, 2028 maturity, total supply.

**Voiceover:**

> Green bonds are a three-trillion-dollar market, but there's a trust problem. Issuers self-certify their bonds as "green." Impact reports arrive a year late, if at all. And the compliance checks that protect investors happen off-chain, in spreadsheets and PDFs, with zero transparency.
>
> Coppice solves this. It's a compliant green bond tokenization platform built on ERC-3643 -- the institutional standard for security tokens, used by ABN AMRO, backed by DTCC and Deloitte -- deployed on Hedera.
>
> What makes this different? We add on-chain use-of-proceeds tracking through Hedera Consensus Service, so fund allocations are immutable and publicly verifiable in real time. And we use Hedera Token Service for settlement with eUSD. Let me show you.

**Key points to hit:**
- $3T+ outstanding market -- shows market size (Feasibility, Validation)
- ABN AMRO precedent -- proves the model works in production (Validation)
- ERC-3643 standard -- not a toy, institutional grade (Innovation)
- 4 Hedera services -- Smart Contracts, HCS, HTS, Mirror Node (Integration)
- No one has built ERC-3643 in any past Hedera hackathon (Innovation)

---

## SECTION 2: Compliant Investor -- Alice [0:40 - 1:35]

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
6. Click "Purchase" -- show the 4-step transfer flow animate:
   - Verifying identity... (spinner -> check)
   - Checking compliance... (spinner -> check)
   - Approving eUSD spending... (MetaMask popup -> check)
   - Processing purchase... (spinner -> check)
7. Show the CPC balance update in the Portfolio panel

**Voiceover:**

> This is Alice, a verified German investor. When she connects her wallet, four real-time compliance checks hit the Hedera smart contracts. Her ONCHAINID is linked -- that's the on-chain identity standard from ERC-3643. Her KYC, AML, and accreditation claims are verified by our trusted claim issuer. Germany is an approved jurisdiction. And the modular compliance engine confirms the transfer is permitted.
>
> Alice is eligible. She enters an amount and clicks Purchase. Watch the four steps -- each one is a real on-chain action. Identity verification. Compliance check. Then Alice approves the eUSD spending in MetaMask -- that's a real approve call on the HTS token's EVM facade. Finally, the backend does an atomic transferFrom plus ERC-3643 mint. Every step is a real transaction on Hedera testnet.
>
> Her portfolio now shows the updated CPC bond token balance alongside her eUSD balance -- that's a native Hedera Token Service token, not just an ERC-20.

**Key points to hit:**
- 4 compliance checks are real contract calls, not mocked (Execution)
- Each purchase step is a real transaction (Execution, Success)
- eUSD is HTS with ERC-20 facade via HIP-218 -- shows deep Hedera integration (Integration)
- ONCHAINID is the identity standard (Innovation)

---

## SECTION 3: Rejected Investors -- Bob & Charlie [1:35 - 2:15]

**What to show:** Disconnect Alice. Switch MetaMask to Bob's wallet. Connect.

**Actions (Bob):**
1. Connect as Bob -- compliance checks run
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

> Now watch what happens when compliance fails. Bob has no on-chain identity. The first check fails -- no ONCHAINID linked -- and the entire flow stops. He can't purchase.
>
> Charlie is more interesting. He has a verified identity. His KYC, AML, and accreditation all pass. But his jurisdiction is China, which is restricted in our compliance module. The transfer is blocked at the protocol level. Charlie sees exactly why he's rejected.
>
> This is what ERC-3643 gives you that a normal ERC-20 can't: compliance is enforced in the token contract itself. You physically cannot transfer tokens to a non-compliant address.

**Key points to hit:**
- Two distinct failure modes -- identity vs. jurisdiction (Execution)
- "Compliance at the protocol level" -- key differentiator from ERC-20 (Innovation)
- Clear user feedback -- good UX even on failure (Execution)

---

## SECTION 4: Issuer Dashboard + Use-of-Proceeds [2:15 - 3:15]

**What to show:** Switch to Deployer/Issuer wallet. Navigate to "Issuer" tab.

**Actions:**
1. Connect as Deployer -- "Issuer Dashboard" heading appears
2. **Mint:** Enter Alice's address + "100" amount, click Mint
   - Show success message: "Minted 100 CPC to 0x4f9ad4..."
3. **Freeze:** Enter Diana's address, click "Freeze"
   - Show success message
4. **Unfreeze:** Click "Unfreeze" for Diana
   - Show success message
5. **Pause:** Click "Pause Token"
   - Status indicator changes from green "Active" to red "Paused"
6. **Unpause:** Click "Unpause Token"
   - Status returns to green "Active"
7. **Allocate Proceeds** (KEY NEW SECTION):
   - Select project: "Nordic Wind Farm Expansion"
   - Category: "Renewable Energy"
   - Amount: 250000
   - Click "Allocate" -- show MetaMask signature prompt
   - Show success: "Allocated to HCS"
8. **Show ProjectAllocation visualization:**
   - Point out the stacked category bars
   - Point out the allocation detail list with project names

**Voiceover:**

> The issuer dashboard gives the bond issuer full control. I can mint tokens to any compliant address -- 100 CPC to Alice, a real transaction on Hedera testnet.
>
> Regulatory controls are critical for compliant securities. I can freeze Diana's wallet, halting her transfers. I can unfreeze when cleared. I can pause the entire token globally, and unpause when ready. Every action is an on-chain transaction logged to the HCS audit trail.
>
> Now here's what sets Coppice apart from ABN AMRO's implementation: use-of-proceeds tracking. I allocate $250,000 to a Nordic wind farm under the Renewable Energy category. This is submitted directly to a Hedera Consensus Service topic -- an immutable, timestamped record. No PDF. No annual report. Verifiable in real time by anyone.
>
> The allocation visualization shows exactly where bond proceeds are going, broken down by green category. This is the transparency that the EU Green Bond Standard demands but that no traditional bond provides.

**Key points to hit:**
- Real transactions happening live (Execution, Success)
- Freeze/unfreeze and pause/unpause -- regulatory controls (Feasibility)
- Use-of-proceeds allocation to HCS -- the key differentiator (Innovation, Integration)
- EU Green Bond Standard reference -- regulatory validation (Validation)
- ProjectAllocation visualization -- polished UX (Execution)

---

## SECTION 5: Compliance Monitor & HCS Audit Trail [3:15 - 3:50]

**What to show:** Navigate to "Compliance" tab.

**Actions:**
1. Show the three stats cards at top: Total Events, Approvals (green), Restrictions (red)
2. Show the Audit Event Feed -- real events from HCS with color-coded badges:
   - MINT (green), TRANSFER (green), WALLET_FROZEN (red), WALLET_UNFROZEN (green), TOKEN_PAUSED (red), TOKEN_UNPAUSED (green)
3. Click the event type filter buttons to show filtering works
4. Click a transaction hash link -- it opens HashScan showing the real transaction
5. Stay on HashScan for 3-5 seconds so judges see it's real testnet data

**Voiceover:**

> The compliance monitor pulls events directly from Hedera Consensus Service via the Mirror Node API. Every mint, every transfer, every freeze, every pause -- it's all here as an immutable, timestamped audit record.
>
> These aren't mock events. Each one links to a real transaction on HashScan. [Click a tx hash] Here's the mint we just did -- you can see the contract address, the method call, the block confirmation on Hedera testnet.
>
> This audit trail runs continuously. A background service watches for contract events and bridges them to HCS in real time. Regulators, auditors, and investors can all verify the same immutable record.

**Key points to hit:**
- HCS events are real, not mocked (Execution, Success)
- HashScan link proves on-chain activity (Success)
- Mirror Node API integration -- 4th Hedera service explicitly named (Integration)
- Event logger daemon bridges EVM events to HCS (Integration -- shows technical depth)

---

## SECTION 6: Why Hedera + Market Positioning [3:50 - 4:35]

**What to show:** Cut briefly to the GitHub README architecture diagram, then back to the app.

**Voiceover:**

> Coppice uses four Hedera services. Smart Contracts run the ERC-3643 suite -- Token, IdentityRegistry, ModularCompliance, ClaimIssuer. Hedera Consensus Service provides the immutable audit trail and use-of-proceeds tracking. Hedera Token Service powers eUSD for settlement. And the Mirror Node API feeds real-time data to the frontend.
>
> Why Hedera? Three reasons. First, Hedera is carbon-negative -- verified by UCL's Centre for Blockchain Technologies. A green bond should run on the greenest network. Second, predictable low fees make compliance-heavy transactions economical -- every transfer triggers multiple contract calls across the compliance stack. Third, the Hedera Foundation is a member of the ERC-3643 Association alongside DTCC, ABN AMRO, and Deloitte. This isn't just compatible -- it's strategically aligned.
>
> The market opportunity is real. Green bonds have crossed three trillion dollars outstanding, but the Climate Bonds Initiative estimates we need seven-point-five trillion per year by 2030 for net-zero. Tokenization can help close that gap with fractional ownership, automated compliance, and real-time transparency. The EU Green Bond Standard, effective since December 2024, creates regulatory demand for exactly this kind of verifiable infrastructure.

**Key points to hit:**
- Name all 4 services explicitly (Integration)
- Carbon-negative with UCL citation (Feasibility, Sustainability crossover)
- Low fees for compliance-heavy tokens (Feasibility)
- Hedera Foundation ERC-3643 Association member (Validation)
- $3T market, $7.5T/yr needed -- massive gap (Success)
- EU Green Bond Standard -- regulatory tailwind (Validation)
- Business model hint -- fractional ownership, automated compliance (Feasibility)

---

## SECTION 7: Close [4:35 - 4:50]

**What to show:** Return to the app, Investor Portal with Alice connected, showing the "Eligible to Invest" badge and her portfolio.

**Voiceover:**

> Coppice brings institutional-grade compliant tokenization to Hedera. Imagine a hundred green bonds on this platform -- that's ten thousand verified investors, twenty thousand on-chain identities, and hundreds of thousands of compliance-checked transactions per year growing the Hedera ecosystem.
>
> Everything you just saw is live on Hedera testnet. The demo is running right now -- you can try it yourself. Thank you for watching.

**Key points to hit:**
- Paint the scale vision -- concrete account/TPS numbers (Success)
- "Live demo you can try right now" -- they can verify everything (Success)
- End on the polished UI, not a slide (Execution)
- Short, confident close -- don't ramble

---

## Track-Specific Adjustments

### If submitting to DeFi & Tokenization

Use the script as-is. The narrative already emphasizes:
- ERC-3643 as a composable, interoperable tokenization standard
- eUSD stablecoin settlement (programmable payment rails)
- Real-world asset (RWA) tokenization
- Fractional ownership and secondary market potential

In Section 1, add this line after "Let me show you":
> This is tokenized real-world assets with built-in compliance -- the composable DeFi infrastructure that institutional capital needs to enter the ecosystem.

### If submitting to Sustainability

Reframe Section 1 opening to lead with environmental impact:
> The world needs seven-point-five trillion dollars in annual green investment to hit net-zero by 2030. We're at six hundred billion. The gap isn't just about money -- it's about trust. Greenwashing, opaque reporting, and twelve-month delays in impact data make investors skeptical. Coppice solves the trust problem.

In Section 4, emphasize the use-of-proceeds tracking more heavily:
> This is the core innovation for sustainability. Every dollar allocated to a green project is recorded immutably on Hedera Consensus Service. No greenwashing possible -- the data is permanent, timestamped, and publicly verifiable. This is what the EU Green Bond Standard envisions but that no traditional bond delivers today.

In Section 6, lead with carbon-negative:
> A green bond platform should run on a green network. Hedera is carbon-negative -- the only major L1 verified by UCL's Centre for Blockchain Technologies. Every transaction Coppice processes has a smaller carbon footprint than a Google search.

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
- [ ] Test the full flow once before recording -- make sure all transactions go through
- [ ] Audio levels tested -- clear voiceover, no background noise
- [ ] Event logger service is running (`cd services && npm run event-logger`)
  so that actions during recording appear in the Compliance Monitor
- [ ] Pre-create at least one allocation so ProjectAllocation bars are visible before recording

## Timing Breakdown

| Section | Duration | Cumulative | Focus |
|---------|----------|------------|-------|
| 1. Problem & Innovation | 0:40 | 0:40 | Pitch, Innovation, Validation |
| 2. Alice (compliant) | 0:55 | 1:35 | Execution, Integration, Success |
| 3. Bob & Charlie (rejected) | 0:40 | 2:15 | Execution, Innovation |
| 4. Issuer + Use-of-Proceeds | 1:00 | 3:15 | Execution, Feasibility, Integration, Success |
| 5. Compliance Monitor | 0:35 | 3:50 | Integration, Success |
| 6. Why Hedera + Market | 0:45 | 4:35 | Integration, Feasibility, Validation, Success |
| 7. Close | 0:15 | 4:50 | Execution |

Every section maps to at least 2 judging criteria. The heaviest-weighted criteria (Execution 20%, Success 20%) get the most screen time (Sections 2-5 = 3:10 of live product demo). Ten seconds of buffer before the 5:00 hard limit.
