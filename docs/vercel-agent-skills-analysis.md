# Vercel Agent Skills — Complete Analysis

> Researched March 15, 2026. Covers every skill listed on [vercel.com/docs/agent-resources/skills](https://vercel.com/docs/agent-resources/skills).

## Repositories

The Vercel docs page links to skills across **4 separate repositories** plus a standalone tool:

| Repository | Skills | Purpose |
|---|---|---|
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 5 | Core React/Next.js/design/deploy skills |
| [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills) | 3 | Next.js-specific skills |
| [vercel-labs/vercel-plugin](https://github.com/vercel-labs/vercel-plugin) | 34 | Comprehensive Vercel ecosystem plugin |
| [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | 1 | Standalone browser automation CLI |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | 1 | The CLI tool + find-skills meta-skill |

---

## Critical Caveat: AGENTS.md Beats Skills (Vercel's Own Data)

Before evaluating individual skills, note that [Vercel's own eval results](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) show skills underperform static markdown:

| Configuration | Pass Rate |
|---|---|
| Baseline (no docs) | 53% |
| Skills (default behavior) | **53%** (+0pp, literally no improvement) |
| Skills + explicit "use this" instructions | 79% |
| AGENTS.md (static markdown) | **100%** |

Key findings:
- In **56% of eval cases**, the skill was never invoked. The agent had access but chose not to use it.
- Without explicit instructions, skills provided **zero improvement** over having no documentation at all.
- Skills actually *hurt* on some metrics (test pass rate dropped from 63% to 58%).
- Vercel compressed 40KB of docs down to 8KB for AGENTS.md with no quality loss.

**Implication:** The *content* inside skills is often excellent. The *delivery mechanism* is demonstrably worse than putting that content in CLAUDE.md/AGENTS.md. The `vercel-plugin` tries to fix this with automatic injection hooks instead of relying on agent invocation — smarter design, but no independent eval data yet.

---

## Every Skill, Evaluated

### Meta / Utility

#### 1. `find-skills` (vercel-labs/skills) — 557K installs

**What it does:** Discovery skill. When you describe a need, it searches skills.sh and suggests installable skills.

**Verdict: Skip.** Adds indirection. Browse [skills.sh](https://skills.sh) yourself and decide what to install. Having an agent install skills mid-session introduces unpredictability.

#### 2. `skill-creator` (vercel-labs/agent-skills)

**What it does:** Helps you author new SKILL.md files interactively.

**Verdict: Niche.** Only useful if you're publishing your own skills.

---

### React and Next.js

#### 3. `react-best-practices` (vercel-labs/agent-skills) — 211K installs

**What it does:** 62 rules across 8 categories from Vercel Engineering: request waterfalls, bundle size, SSR, re-renders, client data fetching, rendering perf, JS micro-optimizations. Prioritized CRITICAL to LOW.

**Verdict: The content is excellent.** These are real architectural patterns that linters don't catch (e.g., cascading fetches adding 600ms latency). The rules come from 10+ years of production work. However, Vercel's own evals show that as a *skill*, it went unused 56% of the time. **Best approach: read the [raw rules](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md) and put the ones relevant to your stack in CLAUDE.md.** If you use multiple agents (Cursor, Copilot, etc.), install it for cross-agent consistency.

#### 4. `composition-patterns` (vercel-labs/agent-skills) — 85K installs

**What it does:** Teaches compound components, state lifting, explicit variants over boolean props, React 19+ patterns (no more forwardRef).

**Verdict: Solid if you're building reusable components.** Prevents the `<Button primary outline disabled loading />` boolean soup anti-pattern. Less useful for app-level code that doesn't build component libraries.

#### 5. `react-native-guidelines` (vercel-labs/agent-skills) — 59.5K installs

**What it does:** 16 rules across 7 sections for React Native + Expo: performance, layout, animations, images, state, architecture, platform specifics.

**Verdict: Good content, skip if you're not doing React Native.** If you are, it's a reasonable starting point but thin (16 rules vs. 62 for React).

#### 6. `next-best-practices` (vercel-labs/next-skills) — 34.4K installs

**What it does:** Core Next.js knowledge — file conventions, RSC boundaries, data patterns, async APIs (Next.js 15+), directives (`'use client'`, `'use server'`, `'use cache'`), route handlers, metadata, Image/Font optimization, hydration errors, Suspense, parallel routes, self-hosting, debug tricks.

**Verdict: Genuinely useful for Next.js projects.** This is the skill Vercel tested against AGENTS.md — and AGENTS.md won. But the *content* is the real value. Notably, `npx @next/codemod@canary agents-md` auto-generates an AGENTS.md with this content compressed to ~8KB. **Use that command instead of installing the skill.**

#### 7. `next-cache-components` (vercel-labs/next-skills) — 9.8K installs

**What it does:** Next.js 16 Cache Components and Partial Pre-Rendering: `cacheComponents: true`, `'use cache'` directive, cache profiles, `cacheLife()`, `cacheTag()`, `updateTag()`.

**Verdict: Useful if you're on Next.js 16+ and using cache components.** These APIs are new enough that models hallucinate them (v4/v5 patterns instead of current). The content fills a real knowledge gap.

#### 8. `next-upgrade` (vercel-labs/next-skills)

**What it does:** Guidance for migrating between Next.js versions.

**Verdict: Useful when you're upgrading, otherwise dormant.** Saves you from manually reading migration guides. Low cost to have installed.

---

### AI SDK

#### 9. `ai-sdk` (vercel-labs/vercel-plugin)

**What it does:** AI SDK v6 covering text/object generation, streaming, tool calling, agents, MCP, embeddings.

**Verdict: Genuinely needed if you're using AI SDK.** As documented in [issue #133](https://github.com/vercel-labs/agent-skills/issues/133), agents consistently hallucinate v4/v5 patterns — `toolContext` vs `experimental_context`, wrong `generateObject` syntax, wrong `execute` signatures. This skill exists precisely because models get this wrong constantly.

---

### Design and UI

#### 10. `web-design-guidelines` (vercel-labs/agent-skills) — 166.6K installs

**What it does:** 100+ rules covering accessibility, focus states, form design, animation, typography, image optimization, navigation, dark mode, touch interactions, i18n.

**Verdict: Good as an automated audit checklist.** Catches real issues you miss when shipping fast — missing focus rings, broken tab order, inadequate contrast. Limitation: compliance/correctness focused, not creative design. Won't make ugly UI pretty, but will catch WCAG violations.

#### 11. `shadcn` (vercel-labs/vercel-plugin)

**What it does:** shadcn/ui CLI, component installation, custom registries, theming, Tailwind CSS integration.

**Verdict: Useful if you use shadcn/ui.** Prevents the agent from suggesting manual copy-paste when `npx shadcn-ui@latest add` exists, and gets theming/registry configuration right.

#### 12. `ai-elements` (vercel-labs/vercel-plugin)

**What it does:** Pre-built React components for AI interfaces — chat UIs, tool rendering, streaming displays.

**Verdict: Niche.** Only relevant if building AI chat interfaces with Vercel's component library.

---

### Browser Automation

#### 13. `agent-browser` (vercel-labs/agent-browser) — 100.2K installs, 22.3K GitHub stars

**What it does:** Headless browser automation CLI written in Rust. Accessibility-tree-first element selection (ARIA roles, labels, placeholders instead of CSS selectors), screenshots, form filling, network interception, PDF export. No Playwright/Node.js dependency.

**Verdict: Genuinely interesting and well-built.** The accessibility-tree approach with `@ref` identifiers is smarter for AI agents — more robust than CSS selectors against UI changes. However, if you already have Playwright set up, this is a replacement not an addition. **Worth evaluating for new browser automation setups; skip if Playwright already works for you.**

---

### Deployment

#### 14. `deploy-to-vercel` / `vercel-deploy-claimable` (vercel-labs/agent-skills) — 7.1K installs

**What it does:** Auto-detects 40+ frameworks, packages, and deploys to Vercel. Returns claimable URLs for ownership transfer.

**Verdict: Skip unless you deploy to Vercel.** Designed for claude.ai/Desktop conversations, not CLI dev workflows.

#### 15. `deployments-cicd` (vercel-labs/vercel-plugin)

**What it does:** Deployment and CI/CD workflows — deploy, promote, rollback, `--prebuilt`.

**Verdict: Skip unless on Vercel's platform.**

---

### Commerce

#### 16. `payments` (vercel-labs/vercel-plugin)

**What it does:** Stripe payments setup — Marketplace checkout, webhooks, subscription billing.

**Verdict: Potentially useful but Vercel Marketplace-centric** (not generic Stripe). For general Stripe work, official Stripe docs are better.

#### 17. `cms` (vercel-labs/vercel-plugin)

**What it does:** Headless CMS integrations — Sanity, Contentful, DatoCMS, Storyblok, Builder.io, Visual Editing.

**Verdict: Useful if you use one of these CMSs.** Saves time on integration boilerplate.

---

### Workflow

#### 18. `workflow` (vercel-labs/vercel-plugin)

**What it does:** Vercel Workflow DevKit — durable execution, DurableAgent, steps, Worlds, pause/resume.

**Verdict: Only relevant if using Vercel's Workflow DevKit.** Very new product (March 2026); the skill prevents hallucination of non-existent APIs.

---

### JSON Render

#### 19. `json-render` (vercel-labs/vercel-plugin)

**What it does:** AI chat response rendering with UIMessage parts, tool call displays, streaming states. Part of Vercel's [generative UI framework](https://github.com/vercel-labs/json-render) (13K stars).

**Verdict: Only relevant if building generative UI apps with json-render.** Cool framework but niche.

---

### Vercel Platform Infrastructure (from vercel-plugin)

These 24 remaining skills are **exclusively useful if you deploy on Vercel**:

| # | Skill | What it covers |
|---|---|---|
| 20 | `nextjs` | App Router deep dive (overlaps with next-best-practices) |
| 21 | `vercel-cli` | All CLI commands |
| 22 | `vercel-api` | MCP Server and REST API |
| 23 | `vercel-functions` | Serverless, Edge, Fluid Compute |
| 24 | `vercel-storage` | Blob, Edge Config, Neon Postgres, Upstash Redis |
| 25 | `vercel-firewall` | DDoS, WAF, rate limiting, bot filtering |
| 26 | `vercel-flags` | Feature flags, A/B testing |
| 27 | `vercel-queues` | Durable event streaming |
| 28 | `vercel-sandbox` | Firecracker microVMs for untrusted code |
| 29 | `vercel-agent` | AI-powered code review on Vercel |
| 30 | `v0-dev` | v0 AI code generation |
| 31 | `sign-in-with-vercel` | OAuth/OIDC via Vercel |
| 32 | `runtime-cache` | Per-region key-value cache |
| 33 | `routing-middleware` | Request interception before cache |
| 34 | `observability` | Web Analytics, Speed Insights, OpenTelemetry |
| 35 | `env-vars` | Environment variable management |
| 36 | `cron-jobs` | Cron scheduling |
| 37 | `auth` | Auth integrations (Clerk, Auth0, Descope) |
| 38 | `bootstrap` | Project bootstrapping orchestrator |
| 39 | `marketplace` | Integration discovery and billing |
| 40 | `email` | Resend + React Email |
| 41 | `turbopack` | Turbopack bundler specifics |
| 42 | `turborepo` | Monorepo orchestration |
| 43 | `chat-sdk` | Multi-platform chatbot SDKs |

**Verdict on the whole vercel-plugin block:** If you're building on the Vercel platform, the plugin is a one-install-covers-everything approach with automatic context injection (it detects what you're working on and loads the relevant skill). If you're NOT on Vercel, almost all of these are irrelevant. The `turborepo` and `turbopack` skills have standalone value.

---

## Summary: What to Actually Do

### Genuinely recommended (for anyone doing React/Next.js):

| Skill | Why | Best delivery method |
|---|---|---|
| `react-best-practices` | Architectural patterns linters miss | Extract to CLAUDE.md |
| `next-best-practices` | Prevents RSC/directive mistakes | `npx @next/codemod@canary agents-md` |
| `next-cache-components` | Models hallucinate cache APIs | Install as skill |
| `web-design-guidelines` | Catches real a11y/UX issues | Extract to CLAUDE.md |
| `composition-patterns` | Good if building component libraries | Install as skill |

### Genuinely recommended (conditional on stack):

| Skill | Condition |
|---|---|
| `ai-sdk` | Using Vercel AI SDK v6 |
| `agent-browser` | Need browser automation, don't already have Playwright |
| `vercel-plugin` (all 34) | Deploying on Vercel platform |
| `shadcn` | Using shadcn/ui |
| `turborepo` | Running a Turborepo monorepo |
| `react-native-guidelines` | Doing React Native |
| `next-upgrade` | Actively upgrading Next.js versions |

### Skip:

| Skill | Why |
|---|---|
| `find-skills` | Adds indirection; browse skills.sh manually |
| `skill-creator` | Only for publishing skills |
| `deploy-to-vercel` | Only for claude.ai/Desktop deployment demos |
| All Vercel-platform-specific skills | Irrelevant if not on Vercel |
| `json-render`, `ai-elements`, `chat-sdk` | Too niche unless using those specific frameworks |

### The bottom line:

The knowledge inside these skills is often genuinely valuable — especially `react-best-practices`, `next-best-practices`, and `web-design-guidelines`. But Vercel proved with their own data that a compressed markdown file (AGENTS.md/CLAUDE.md) delivers that knowledge more reliably than the skill invocation mechanism. **Read the raw content, cherry-pick what applies to your project, compress it, and put it in your CLAUDE.md.**

---

## Sources

- [Vercel Agent Skills Docs](https://vercel.com/docs/agent-resources/skills)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (5 skills)
- [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills) (3 skills)
- [vercel-labs/vercel-plugin](https://github.com/vercel-labs/vercel-plugin) (34 skills)
- [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) (standalone)
- [vercel-labs/skills](https://github.com/vercel-labs/skills) (CLI + find-skills)
- [AGENTS.md outperforms skills — Vercel blog](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [AI SDK v6 hallucination issue #133](https://github.com/vercel-labs/agent-skills/issues/133)
- [React Best Practices announcement — Vercel blog](https://vercel.com/blog/introducing-react-best-practices)
- [React Best Practices — InfoQ](https://www.infoq.com/news/2026/02/vercel-react-best-practices/)
- [Best Claude Code Skills — Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills)
- [349 Agent Skills Ranked — OpenAI Tools Hub](https://www.openaitoolshub.org/en/blog/best-claude-code-skills-2026)
- [Skills.sh directory](https://skills.sh)
