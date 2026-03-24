# Consolidate Compliance Monitor into Issuer Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move coupon activity, on-chain events, and Guardian verification events from the Compliance page into the Issuer Dashboard, then delete the Compliance page and nav tab.

**Architecture:** Replace `IssuerActivityFeed` at the bottom of the Issuer page with a coupon activity grid + tabbed event feed (On-Chain / Guardian). Reuse `AuditEventFeed` and `GuardianEvents` components as-is. Delete the `/monitor` page, `IssuerActivityFeed` component, and Compliance nav link.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS v4, Playwright, Vitest

---

### Task 1: Update Issuer page — replace IssuerActivityFeed with compliance content

**Files:**
- Modify: `frontend/app/issue/page.tsx`

**Step 1: Update imports**

Remove the `IssuerActivityFeed` import (line 11) and add the new imports:

```tsx
// REMOVE this line:
import { IssuerActivityFeed } from "@/components/issuer-activity-feed";

// ADD these:
import { AuditEventFeed } from "@/components/audit-event-feed";
import { GuardianEvents } from "@/components/guardian/guardian-events";
import { COUPON_STATUS_VARIANT, COUPON_STATUS_LABEL } from "@/lib/event-types";
```

Note: `useState`, `StatusBadge`, `useCoupons`, `SectionErrorBoundary`, and `entranceProps` are already imported.

**Step 2: Add tab state**

After the existing `useGuardian()` call (~line 98), add:

```tsx
const [eventTab, setEventTab] = useState<"onchain" | "guardian">("onchain");
```

**Step 3: Replace the Activity Feed section**

Replace lines 817-820:
```tsx
      {/* Activity Feed */}
      <div {...entranceProps(idx++)}>
        <IssuerActivityFeed events={auditEvents} loading={auditLoading} />
      </div>
```

With:
```tsx
      {/* Coupon Activity */}
      {coupons.length > 0 && (
        <section {...entranceProps(idx++)}>
          <h2 className="card-title">Coupon Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div key={c.id} className="card-static text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text text-sm">Coupon #{c.id}</span>
                  <StatusBadge
                    label={COUPON_STATUS_LABEL[c.status] ?? c.status}
                    variant={COUPON_STATUS_VARIANT[c.status] ?? "amber"}
                  />
                </div>
                <div className="space-y-1 text-text-muted">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="font-mono text-text">{c.rateDisplay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period</span>
                    <span className="font-mono text-text">{c.periodDays}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record</span>
                    <span className="font-mono text-text">
                      {new Date(c.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record Status</span>
                    <span className={`font-mono ${c.snapshotId > 0 ? "text-bond-green" : "text-text-muted"}`}>
                      {c.snapshotId > 0 ? "Captured" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event Feed — On-Chain + Guardian tabs */}
      <div {...entranceProps(idx++)}>
        <div role="tablist" aria-label="Event source" className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit mb-4">
          <button
            id="tab-onchain"
            role="tab"
            aria-selected={eventTab === "onchain"}
            aria-controls="panel-onchain"
            onClick={() => setEventTab("onchain")}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              eventTab === "onchain" ? "bg-surface-3 text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            On-Chain Events
          </button>
          <button
            id="tab-guardian"
            role="tab"
            aria-selected={eventTab === "guardian"}
            aria-controls="panel-guardian"
            onClick={() => setEventTab("guardian")}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              eventTab === "guardian" ? "bg-surface-3 text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            Guardian Verification
          </button>
        </div>
        <div id={`panel-${eventTab}`} role="tabpanel" aria-labelledby={`tab-${eventTab}`}>
          <div key={eventTab} className="animate-tab-enter">
            <SectionErrorBoundary section="event feed">
              {eventTab === "onchain" ? (
                <AuditEventFeed />
              ) : (
                <GuardianEvents />
              )}
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
```

**Step 4: Remove unused variables**

The `auditEvents` and `auditLoading` destructured from `useContractEvents()` (line 50) are no longer needed since `AuditEventFeed` calls `useContractEvents()` internally. Change:

```tsx
const { events: auditEvents, loading: auditLoading } = useContractEvents();
```

To:

```tsx
const { events: auditEvents } = useContractEvents();
```

Keep `auditEvents` — it's still used by the `HoldersTable` dependency chain. Remove `auditLoading` only.

Actually, check: `auditEvents` is passed nowhere else on the page except to `IssuerActivityFeed` which we're removing. And `useContractEvents()` is used directly by `AuditEventFeed`. But `useHolders()` on line 51 may depend on it. Let me verify...

The `useHolders` hook is separate (line 51), and `auditEvents` was only passed to `IssuerActivityFeed`. So remove the entire `useContractEvents()` call:

```tsx
// REMOVE this line:
const { events: auditEvents, loading: auditLoading } = useContractEvents();
```

And remove the import:
```tsx
// REMOVE:
import { useContractEvents } from "@/hooks/use-contract-events";
```

**Step 5: Verify build**

Run: `npm run build` from repo root.
Expected: Clean build with no errors.

**Step 6: Commit**

```
git add frontend/app/issue/page.tsx
git commit -m "feat: add coupon activity and tabbed event feed to issuer page"
```

---

### Task 2: Remove navigation link and compliance page

**Files:**
- Modify: `frontend/components/nav.tsx`
- Delete: `frontend/app/monitor/page.tsx`
- Delete: `frontend/components/issuer-activity-feed.tsx`

**Step 1: Remove Compliance from nav**

In `frontend/components/nav.tsx`, remove line 13 from `NAV_LINKS`:
```tsx
  { href: "/monitor", label: "Compliance" },
```

And remove line 48:
```tsx
<Link href="/monitor" className={navLinkClass("/monitor")}>Compliance</Link>
```

The array becomes 4 items. The mobile menu renders from `NAV_LINKS` so it auto-updates.

**Step 2: Delete compliance page**

Delete file: `frontend/app/monitor/page.tsx`

**Step 3: Delete IssuerActivityFeed**

Delete file: `frontend/components/issuer-activity-feed.tsx`

**Step 4: Verify build**

Run: `npm run build` from repo root.
Expected: Clean build. No imports reference deleted files.

**Step 5: Commit**

```
git add -A
git commit -m "feat: remove compliance page and issuer-activity-feed"
```

---

### Task 3: Update unit tests

**Files:**
- Modify: `frontend/__tests__/components/nav.test.tsx`

**Step 1: Update nav test — remove Compliance assertions**

In `frontend/__tests__/components/nav.test.tsx`:

- Change test name from `"renders all 5 navigation links"` to `"renders all 4 navigation links"`
- Remove line 36: `expect(screen.getByRole("link", { name: "Compliance" })).toBeInTheDocument();`
- Remove line 45: `expect(screen.getByRole("link", { name: "Compliance" })).toHaveAttribute("href", "/monitor");`

**Step 2: Run unit tests**

Run: `npm run test:unit` from repo root.
Expected: All tests pass.

**Step 3: Commit**

```
git add frontend/__tests__/components/nav.test.tsx
git commit -m "test: update nav test for 4-tab navigation"
```

---

### Task 4: Update E2E tests

**Files:**
- Delete: `e2e/tests/compliance-monitor.spec.ts`
- Modify: `e2e/tests/accessibility.spec.ts`
- Modify: `e2e/tests/mobile.spec.ts`

**Step 1: Delete compliance-monitor E2E test**

Delete file: `e2e/tests/compliance-monitor.spec.ts`

**Step 2: Update accessibility test**

In `e2e/tests/accessibility.spec.ts`, the keyboard nav test (lines 22-50) tabs through 5 nav links and ends on Compliance. Update to end on Issuer instead:

Change lines 30-49 from:
```ts
    // Tab through nav links — Coupons, Impact, Issuer, Compliance
    await page.keyboard.press("Tab");
    const couponsLink = page.getByRole("link", { name: "Coupons" });
    await expect(couponsLink).toBeFocused();

    await page.keyboard.press("Tab");
    const impactLink = page.getByRole("link", { name: "Impact" });
    await expect(impactLink).toBeFocused();

    await page.keyboard.press("Tab");
    const issuerLink = page.getByRole("link", { name: "Issuer" });
    await expect(issuerLink).toBeFocused();

    await page.keyboard.press("Tab");
    const complianceLink = page.getByRole("link", { name: "Compliance" });
    await expect(complianceLink).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/monitor");
```

To:
```ts
    // Tab through nav links — Coupons, Impact, Issuer
    await page.keyboard.press("Tab");
    const couponsLink = page.getByRole("link", { name: "Coupons" });
    await expect(couponsLink).toBeFocused();

    await page.keyboard.press("Tab");
    const impactLink = page.getByRole("link", { name: "Impact" });
    await expect(impactLink).toBeFocused();

    await page.keyboard.press("Tab");
    const issuerLink = page.getByRole("link", { name: "Issuer" });
    await expect(issuerLink).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/issue");
```

**Step 3: Update mobile test**

In `e2e/tests/mobile.spec.ts`:

a) In `"should open and close mobile menu"` (line 18), remove line 33:
```ts
    await expect(page.locator(".sm\\:hidden >> text=Compliance")).toBeVisible();
```

b) In `"should navigate via mobile menu"` (lines 40-60), remove the Compliance navigation block (lines 51-54):
```ts
    // Navigate to Compliance page
    await hamburger.click();
    await page.locator(".sm\\:hidden >> text=Compliance").click();
    await expect(page).toHaveURL("/monitor");
```

And update so after the Issuer navigation it goes back to Invest (which it already does on lines 57-59).

c) Replace test `"should display compliance monitor responsively"` (lines 96-106) with a test that checks the event feed on the Issuer page:
```ts
  test("should display event feed on issuer page responsively", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Audit feed should load
    await expect(page.getByText("Audit Event Feed")).toBeVisible({ timeout: 15000 });
  });
```

d) Update `"should have adequate touch targets on filter buttons"` (lines 108-121) to go to `/issue` instead of `/monitor`, and connect wallet first:
```ts
  test("should have adequate touch targets on filter buttons", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });
    // Wait for non-zero events
    await expect(page.getByText(/[1-9]\d* events/)).toBeVisible({ timeout: 30000 });

    const allButton = page.getByRole("button", { name: "ALL", exact: true });
    await expect(allButton).toBeVisible();

    const box = await allButton.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
```

**Step 4: Run E2E tests locally**

Run: `cd e2e && npx playwright test accessibility mobile`
Expected: All tests pass.

**Step 5: Commit**

```
git add -A
git commit -m "test: update e2e tests for compliance-to-issuer consolidation"
```

---

### Task 5: Run full test suite and lint

**Step 1: Lint**

Run: `npm run lint` from repo root.
Expected: Clean.

**Step 2: Unit tests**

Run: `npm run test:unit` from repo root.
Expected: All pass.

**Step 3: Build**

Run: `npm run build` from repo root.
Expected: Clean build.

**Step 4: E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All pass.

**Step 5: Final commit if any fixups needed**

```
git add -A
git commit -m "chore: fixups from full test run"
```
