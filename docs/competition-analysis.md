# Coppice -- Competition Analysis & Scoring Assessment

**Date:** March 15, 2026
**Hackathon:** Hedera Hello Future: Apex 2026
**Track:** DeFi & Tokenization ($40,000 prize pool: $18,500 / $13,500 / $8,000)
**Submission deadline:** March 23, 2026, 11:59 PM ET

---

## Scoring Assessment Against Rubric

### Overall Weighted Score: ~72/100 (updated March 23, 2026)

Original assessment was ~65/100 (March 15). Since then: ATS migration, Guardian integration, LifeCycleCashFlow, 5-page frontend, 171+ tests, and Vercel deployment have significantly improved Execution and Integration scores. Validation and Success remain weak.

---

### Innovation (10%) -- Score: 8/10 (was 7)

**What the rubric asks:** Track alignment, solution novelty, cross-chain existence assessment, ecosystem precedent.

**Why 8:** ERC-3643 on Hedera via ATS is genuinely novel. The addition of Guardian-verified MRV data with SPT coupon penalty mechanism goes beyond what ABN AMRO did on Polygon (they kept impact off-chain). The combination of ATS + Guardian + LifeCycleCashFlow + HCS + HTS is unique in any hackathon. The SPT mechanism (coupon rate adjusts based on verified environmental performance) is a genuine protocol-level innovation.

**What would make this a 9:** HCS precompiles (HIP-1208) for in-contract audit logging, or dMRV with real IoT data feeding Guardian.

---

### Feasibility (10%) -- Score: 6.5/10

**What the rubric asks:** Hedera network viability, web3 necessity justification, domain expertise, **Lean/Business Model Canvas**.

**Why 6.5:** The Lean Canvas exists in the pitch deck but is thin. Revenue streams ("0.1-0.5% issuance fees") are stated without validation. The biggest gap: the rubric explicitly asks "Did the team create, and understand, a Lean / Business Model Canvas?" -- having one is better than not, but the cost structure omits the most critical item (regulatory licensing, which means MiFID II authorization in the EU -- a multi-year, multi-million-dollar process). The project does not demonstrate domain expertise in fixed-income securities.

Web3 necessity is well-justified: on-chain compliance enforcement is categorically different from off-chain. ERC-3643 makes compliance protocol-level, not optional.

**What would make this an 8:** A more realistic cost structure acknowledging regulatory licensing, and evidence of domain knowledge (e.g., mentioning specific green bond frameworks like ICMA Green Bond Principles, or demonstrating understanding of bond settlement cycles).

---

### Execution (20%) -- Score: 8.5/10 (was 7.5)

**What the rubric asks:** MVP completion level, team collaboration, long-term development strategy, **GTM strategy**, UX/accessibility.

**Why 8.5:** 171+ verified tests (32 contract + 104 unit + 67 E2E local + 23 E2E remote). Full 5-page frontend with design overhaul (Instrument Serif typography, compliance cascade animations, dark theme). Clean architecture: Turborepo monorepo, Next.js 16, ethers v6, custom AtsContext, full TypeScript. Real testnet deployment at coppice.cc + Guardian at guardian.coppice.cc. WCAG 2.1 AA accessibility, mobile responsive. Purchase flow with client-side approve + backend transferFrom/issue. Automated coupon distribution via LifeCycleCashFlow.

The weaknesses: GTM strategy is still "find a pilot issuer." Solo developer. No resource plan.

**What would make this a 9:** A named pilot target or partnership with Tokeny/Hedera Foundation.

---

### Integration (15%) -- Score: 9/10 (was 8.5)

**What the rubric asks:** Hedera network utilization degree, ecosystem platform leverage, creative service implementation.

**Why 9:** Five Hedera services used with purpose:

1. **Smart Contracts (EVM):** ATS Bond (ERC-3643 diamond proxy) with ERC20, ERC1594, KYC, Bond, AccessControl, ControlList facets. LifeCycleCashFlow contract for automated coupon distribution with on-chain snapshots and mass payout.

2. **HCS:** Guardian anchors all VCs to HCS topics. Immutable, timestamped, publicly queryable provenance chain for MRV data.

3. **HTS:** eUSD stablecoin (FungibleCommon, 2 decimals). Token association. Long-zero address (HIP-218) for EVM facade.

4. **Mirror Node API:** Primary frontend data source for contract event logs (replaced HCS reads). HTS balance queries. Account ID mapping. Transaction verification.

5. **Guardian:** Full MRV workflow with 5 ICMA-aligned VC schemas, trust chain visualization, SPT verification. Deployed on dedicated server with HAProxy TLS. This is a significant integration -- Guardian uses HCS for VC anchoring and IPFS for document storage.

**Honest caveat:** The ATS bond contract itself is Hedera's official ERC-3643 implementation. But the combination of ATS + Guardian + LifeCycleCashFlow + HCS + HTS + Mirror Node is deeply Hedera-native. Guardian alone is ~40% of the integration depth.

**What would make this a 10:** HCS precompiles (HIP-1208), or real dMRV with IoT data feeding Guardian.

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

**3. Update README test count** (done: 171+ tests)

**4. Replace ASCII architecture diagram with clean visual** (15 min effort)
- Create a simple PNG/SVG from the Mermaid diagram in docs/architecture-mermaid.md

**5. Deploy to Vercel and verify live demo works** (done: https://www.coppice.cc)

### Should-Do If Time Permits

**6. Record the demo video** (2-3 hours with prep)
- Follow the demo-video-script.md exactly
- Pre-load all wallet states
- Ensure Guardian is running during recording
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

**Short answer: Competitive for top 3. Integration depth and Guardian are differentiators.**

**Why:**
- Integration (9/10) and Execution (8.5/10) are the strongest dimensions in the field
- Guardian integration is a genuine differentiator no other hackathon project has
- But Success (5.5/10, weight 20%) and Validation (4.5/10, weight 15%) still account for 35% of the score
- 171+ tests for a solo project is exceptional -- judges who check GitHub will see production-grade code

**What moves us toward 1st:**
1. Getting real validation data (even one community interaction)
2. Hedera Foundation's ERC-3643 Association membership = strategic alignment
3. Guardian integration shows deep Hedera ecosystem understanding

**Realistic scenarios:**
- **Best case:** 2nd or 3rd place ($8,000-$13,500). Guardian + ATS + 5 Hedera services is compelling.
- **Expected case:** Top 3-5. Strong on integration depth and execution.
- **Worst case:** Top 5-8. If the field has projects with real user traction, our zero-validation score hurts.

**The single highest-ROI action:** Spend 30 minutes sharing the demo in Hedera Discord and collecting 2-3 feedback responses. This alone could move Validation from 4.5 to 6 and potentially tip decisively into prize territory.
