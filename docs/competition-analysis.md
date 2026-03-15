# Coppice -- Competition Analysis & Scoring Assessment

**Date:** March 15, 2026
**Hackathon:** Hedera Hello Future: Apex 2026
**Track:** DeFi & Tokenization ($40,000 prize pool: $18,500 / $13,500 / $8,000)
**Submission deadline:** March 23, 2026, 11:59 PM ET

---

## Scoring Assessment Against Rubric

### Overall Weighted Score: ~65/100

This is an honest assessment. 65/100 is competitive but not dominant. In a typical hackathon field of 20-40 DeFi submissions, this likely places in the **top 5-8** based on execution and integration alone, but the weak Validation and Success scores could drop it out of the top 3.

---

### Innovation (10%) -- Score: 7/10

**What the rubric asks:** Track alignment, solution novelty, cross-chain existence assessment, ecosystem precedent.

**Why 7:** ERC-3643 on Hedera is genuinely novel -- no past Hedera hackathon winner has done this (verified against Origins, Ascension, and HelloFuture 2.0 winners lists). The combination of ERC-3643 + HCS audit trail + HTS settlement is unique. However, neither ERC-3643 nor green bond tokenization is new in isolation. ABN AMRO did this on Polygon in 2023. The innovation is incremental: applying an existing standard to a new chain and adding HCS logging.

**What would make this a 9:** A genuinely new protocol-level innovation -- e.g., using HCS precompiles (HIP-1208, if available) for in-contract audit logging, or a cross-chain bridge for ERC-3643 tokens between Hedera and Polygon.

---

### Feasibility (10%) -- Score: 6.5/10

**What the rubric asks:** Hedera network viability, web3 necessity justification, domain expertise, **Lean/Business Model Canvas**.

**Why 6.5:** The Lean Canvas exists in the pitch deck but is thin. Revenue streams ("0.1-0.5% issuance fees") are stated without validation. The biggest gap: the rubric explicitly asks "Did the team create, and understand, a Lean / Business Model Canvas?" -- having one is better than not, but the cost structure omits the most critical item (regulatory licensing, which means MiFID II authorization in the EU -- a multi-year, multi-million-dollar process). The project does not demonstrate domain expertise in fixed-income securities.

Web3 necessity is well-justified: on-chain compliance enforcement is categorically different from off-chain. ERC-3643 makes compliance protocol-level, not optional.

**What would make this an 8:** A more realistic cost structure acknowledging regulatory licensing, and evidence of domain knowledge (e.g., mentioning specific green bond frameworks like ICMA Green Bond Principles, or demonstrating understanding of bond settlement cycles).

---

### Execution (20%) -- Score: 7.5/10

**What the rubric asks:** MVP completion level, team collaboration, long-term development strategy, **GTM strategy**, UX/accessibility.

**Why 7.5:** The strongest technical dimension. 115 verified tests (32 contract + 40 unit + 43 E2E). The architecture is clean: Turborepo monorepo, Next.js 16, wagmi v3, viem v2, full TypeScript. Real testnet deployment with verifiable transactions. WCAG 2.1 AA accessibility, mobile responsive. Purchase flow with client-side approve + backend transferFrom/mint is architecturally sound. Error recovery (auto eUSD refund on mint failure).

The weaknesses: GTM strategy is "submit to hackathon, then find a pilot issuer" -- no concrete next step with a named target. Solo developer means no team collaboration to demonstrate. The roadmap is reasonable but has no resource plan.

**What would make this a 9:** A named pilot target ("We've spoken with X bank about a testnet trial"), or a partnership with Tokeny (creators of ERC-3643) showing ecosystem buy-in.

---

### Integration (15%) -- Score: 8.5/10

**What the rubric asks:** Hedera network utilization degree, ecosystem platform leverage, creative service implementation.

**Why 8.5:** This is the clear standout. Four Hedera services used with purpose:

1. **Smart Contracts (EVM):** Full ERC-3643 T-REX suite -- 12 contracts including Token, IdentityRegistry, ModularCompliance, ClaimIssuer, plus 3 compliance modules. This is the deepest contract deployment in any past Hedera hackathon I found.

2. **HCS:** Two topics (audit + impact). Event logger daemon polls EVM events and bridges them to HCS. Allocate API route writes directly to Impact topic. Mirror Node polling for real-time frontend display.

3. **HTS:** eUSD stablecoin (FungibleCommon, 2 decimals). Token association with wallet signing. Long-zero address (HIP-218) for EVM facade -- this is a non-trivial Hedera-specific integration detail.

4. **Mirror Node API:** HCS event feeds, HTS balance queries, account ID mapping (EVM address -> Hedera account ID). Central to the data layer.

**Honest caveat:** The smart contracts themselves are pure EVM -- they'd run identically on Polygon. The Hedera-specific depth comes from HCS, HTS, and Mirror Node (the "glue" around the contracts). About 70% of the codebase is chain-agnostic. But the 30% that's Hedera-specific is deeply integrated and uses real Hedera idioms (long-zero addresses, token association, Mirror Node REST patterns).

**What would make this a 10:** Using HCS precompiles from Solidity (HIP-1208), or implementing scheduled transactions for coupon payments, or using Hedera Account Service for account abstraction.

---

### Success (20%) -- Score: 5.5/10

**What the rubric asks:** Network/ecosystem impact, Hedera account creation potential, MAU projections, TPS growth, audience exposure.

**Why 5.5:** This is the most heavily weighted criterion and the submissions's second-weakest area. The ecosystem impact arguments are entirely theoretical:

- "A single bond with 100 investors = 200+ new accounts" -- fine projection, but zero actual accounts created (beyond 5 demo wallets)
- "Compliance-heavy transfers generate 4-6 contract calls" -- structural argument, not quantified MAU
- No concrete MAU projections
- No evidence of any real user activity or community interest
- The pitch deck now includes "At Scale: 100 bonds = 10K investors, 50K monthly txns" projections, which helps but is still hypothetical

**What would make this a 7:** Concrete projections with assumptions stated: "Based on ABN AMRO's EUR 5M bond with ~5 institutional investors, we project a first-year pilot would create 10 Hedera accounts and ~200 compliance transactions. At 10 bonds, that's 100 accounts and 2,000 monthly transactions." Show the math.

**What would make this a 9:** Actual testnet usage metrics. "We shared the demo with the Hedera Discord community and had 15 unique wallets connect to the live demo, generating 47 compliance check transactions in the first 24 hours." Even small numbers are better than zero.

---

### Validation (15%) -- Score: 4.5/10

**What the rubric asks:** Market feedback channels, feedback cycles, early adopter traction, revenue/trial uptake evidence.

**Why 4.5:** This is the weakest area and the single biggest risk to placement. The submission has:

- **Excellent market validation:** ABN AMRO precedent, ERC-3643 Association members, EU Green Bond Standard, $3T+ market
- **Zero product validation:** No customer conversations, no user testing, no pilot interest, no waitlist, no feedback quotes

The judges see through this distinction. ABN AMRO validates that green bond tokenization works -- it doesn't validate that Coppice specifically should exist. The "Feedback & Validation Plan" lists channels (Discord, ERC-3643 network, regulatory sandboxes) but none have been activated.

**What would make this a 7:** One concrete data point. Options:
- Share the live demo link in the Hedera Discord/Reddit and record how many people tried it
- Message 3-5 people in the ERC-3643 Association network and include one quote
- Do a 15-minute user testing session with a friend in finance and report findings
- Post the demo on Twitter/X and screenshot engagement metrics

Even one real interaction transforms this from "we plan to validate" to "we have validated."

---

### Pitch (10%) -- Score: 7.5/10

**What the rubric asks:** Problem/solution clarity, problem scale, narrative execution, Hedera representation, MVP feature articulation.

**Why 7.5:** The pitch deck has a clear narrative arc: problem ($3T market, trust crisis) -> solution (ERC-3643 + HCS + HTS) -> demo -> why Hedera -> market -> roadmap. Sources are cited (14 references). The competitive landscape table is effective. The "What this is NOT" framing preempts the "isn't this just an ERC-20?" question.

Weaknesses: The pitch could use more emotional resonance. "Green bonds have a trust problem" is factual but not visceral. A specific greenwashing scandal example would land harder. The deck is text-heavy for a visual medium. The solo developer framing, while honest, is a liability for institutional finance positioning.

**What would make this a 9:** An opening that names a specific greenwashing case. A closing that creates urgency. More visual storytelling (the HTML deck is better than the markdown on this front).

---

## Competitive Landscape (Past Winners)

### DeFi & Tokenization Winners (Recent Hedera Hackathons)

| Hackathon | 1st Place | What They Built |
|-----------|-----------|----------------|
| Origins (Jul-Aug 2025) | Major Gainz | AI-driven DeFi platform with institutional wallet analytics |
| Ascension (Nov 2025) | Medq Quest | Gamified DeFi with AI-generated quests |
| HelloFuture 2.0 (2024) | Hewego | Blockchain lending with bond tokens |

**Key observations:**
- Past winners tend to have AI integrations (Major Gainz, Medq Quest) -- the current zeitgeist rewards AI
- Coppice has no AI component, which could be a disadvantage in the current judging climate
- However, Hewego (bond tokens) won without AI, proving pure tokenization can win
- No past winner has done ERC-3643 -- genuine novelty

### Sustainability Winners (For Reference)

| Hackathon | 1st Place | What They Built |
|-----------|-----------|----------------|
| Origins (Jul-Aug 2025) | GreenTrace | GHG emissions tracking with NFT certificates |
| Ascension (Nov 2025) | ParkPulse | Geospatial environmental data on HCS |

**Observation:** Sustainability winners focus on data collection/verification, not financial instruments. Coppice's green bond angle would be novel in this track.

---

## Action Plan (Priority Order)

### Must-Do Before Submission (March 23)

**1. Get at least one validation data point** (30 min effort, +2 points on Validation)
- Share the live Vercel demo in the Hedera Discord #showcase channel
- Post to r/hedera or r/ethereum with a brief writeup
- Screenshot any responses/engagement and add to pitch deck Slide 11
- Even "3 community members tried the demo and reported all transactions succeeded" is meaningful

**2. Add concrete MAU/account projections to pitch deck** (already done in latest revision)
- The "At Scale: 100 bonds" section now provides numbers
- Consider adding a more conservative "Year 1 pilot" projection as well

**3. Update README test count** (already done: 115 not 101)

**4. Replace ASCII architecture diagram with clean visual** (15 min effort)
- The GitHub README and demo video both reference an ASCII diagram that won't be readable on video
- Create a simple PNG/SVG with 4 boxes + arrows
- Use any free diagram tool (Excalidraw, draw.io)

**5. Deploy to Vercel and verify live demo works** (required for submission)
- The submission form requires a live demo URL
- Test all flows: Alice, Bob, Charlie, Issuer dashboard, Compliance monitor

### Should-Do If Time Permits

**6. Record the demo video** (2-3 hours with prep)
- Follow the demo-video-script.md exactly
- Pre-load all wallet states
- Run event logger during recording
- Upload to YouTube as unlisted
- Without a demo video, the submission receives zero score

**7. Create the 100-word project description** (required by submission form)
- Draft: "Coppice is a compliant green bond tokenization platform on Hedera using ERC-3643 (the institutional standard backed by DTCC, ABN AMRO, and Deloitte). It enforces investor identity, KYC/AML claims, and jurisdiction checks at the protocol level -- non-compliant transfers revert on-chain. Fund allocations are recorded immutably to Hedera Consensus Service, replacing opaque annual PDF reports with real-time, publicly verifiable transparency. Settlement uses eUSD via Hedera Token Service. Four Hedera services integrated: Smart Contracts, HCS, HTS, and Mirror Node API. The first ERC-3643 green bond implementation on a carbon-negative blockchain."
- That's 97 words.

**8. Write the compulsory feedback questions** (required by submission form, unknown format)
- Allow at least 1 hour before deadline for this

### Nice-to-Have

**9. Add a specific greenwashing example to the pitch opening**
- e.g., "In 2024, Repsol was excluded from the Climate Bonds Initiative database after questions about its green bond proceeds."

**10. Implement one coupon payment using HTS scheduled transactions**
- Would demonstrate a roadmap feature in the actual demo
- Adds another Hedera service usage pattern
- Estimated effort: 4-6 hours -- probably too much for remaining time

---

## Honest Assessment: Can We Win?

**Short answer: Possible for 3rd place ($8,000). Unlikely for 1st.**

**Why:**
- Integration (8.5/10) and Execution (7.5/10) are genuinely strong -- these are the areas where Coppice excels
- But Success (5.5/10, weight 20%) and Validation (4.5/10, weight 15%) together account for 35% of the score, and we're leaving ~10-12 points on the table there
- Past winners have had stronger validation stories (even for hackathon projects)
- The lack of an AI component is a headwind in the current climate

**What moves us toward 1st:**
1. Getting real validation data (even one community interaction)
2. The Hedera Foundation's ERC-3643 Association membership means this project is *strategically aligned* with what Hedera wants -- judges who recognize this may weight Integration higher
3. 115 tests for a solo project is exceptional -- if judges look at the GitHub, they'll see a production-grade codebase

**Realistic scenarios:**
- **Best case:** 3rd place in DeFi & Tokenization ($8,000). Possible if competition is weak on integration depth.
- **Expected case:** Top 5-8 but no prize. Strong enough to be noticed but lacking in Validation and Success.
- **Worst case:** Middle of the pack. If the field has several projects with real user traction, our zero-validation score sinks us.

**The single highest-ROI action:** Spend 30 minutes sharing the demo in Hedera Discord and collecting 2-3 feedback responses. This alone could move Validation from 4.5 to 6 and potentially tip us into prize territory.
