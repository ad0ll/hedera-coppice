import { test, expect } from "@playwright/test";
import {
  injectWalletMock,
  getTokenBalance,
  ensureTokenUnpaused,
} from "../fixtures/wallet-mock";
import { DEPLOYER_KEY, ALICE_KEY } from "../fixtures/test-keys";
const ALICE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";
const DIANA_ADDR = "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf";
const TOKEN = "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9";

// These tests perform real transactions on Hedera testnet.
// They use the deployer wallet and must run serially.
test.describe.configure({ mode: "serial" });

test.describe("Write Operations (Testnet)", () => {
  // Safety net: ensure token is unpaused before write tests run.
  // A previous test run may have left it paused if it failed mid-pause.
  test.beforeAll(async () => {
    await ensureTokenUnpaused(TOKEN, DEPLOYER_KEY);
  });

  test("should issue tokens to Alice via Issuer Dashboard", async ({ page }) => {
    // Get Alice's balance before
    const balanceBefore = await getTokenBalance(TOKEN, ALICE_ADDR);
    const balanceBeforeNum = parseFloat(balanceBefore);

    // Connect as deployer (issuer)
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Fill issue form
    await page.getByPlaceholder("Recipient address (0x...)").fill(ALICE_ADDR);
    await page.getByPlaceholder("Amount (CPC)").fill("10");
    await page.getByRole("button", { name: "Issue", exact: true }).click();

    // Wait for success message (transaction takes ~5-10s on Hedera testnet)
    await expect(page.getByText("Issued 10 CPC")).toBeVisible({ timeout: 30000 });

    // Verify on-chain: Alice's balance increased by 10
    // Wait a bit for the testnet to finalize
    await page.waitForTimeout(3000);
    const balanceAfter = await getTokenBalance(TOKEN, ALICE_ADDR);
    const balanceAfterNum = parseFloat(balanceAfter);
    expect(balanceAfterNum).toBeCloseTo(balanceBeforeNum + 10, 0);
  });

  test("should freeze Diana and verify frozen status", async ({ page }) => {
    // Connect as deployer
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Freeze Diana
    await page.getByPlaceholder("Wallet address (0x...)").fill(DIANA_ADDR);
    await page.getByRole("button", { name: "Freeze", exact: true }).click();

    // Wait for success status message near the freeze button
    await expect(page.locator('[role="status"]').filter({ hasText: /froze/i })).toBeVisible({ timeout: 30000 });
  });

  test("should unfreeze Diana", async ({ page }) => {
    // Connect as deployer
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Unfreeze Diana
    await page.getByPlaceholder("Wallet address (0x...)").fill(DIANA_ADDR);
    await page.getByRole("button", { name: "Unfreeze", exact: true }).click();

    // Wait for success status message
    await expect(page.locator('[role="status"]').filter({ hasText: /unfroze/i })).toBeVisible({ timeout: 30000 });
  });

  test("should run Alice compliance checks and purchase flow UI", async ({ page }) => {
    // Tests the full investor portal: 4 compliance checks + purchase via backend API
    // New flow: identity check → compliance check → eUSD approve (client-side tx) →
    //           sign auth message → API call (transferFrom + mint)
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for compliance checks to load (jurisdiction check may not resolve without CountryRestrictModule)
    await expect(page.getByText("Identity contract linked")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Transfer permitted")).toBeVisible({ timeout: 15000 });

    // Alice should see her portfolio with CPC and eUSD balances
    await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("eUSD Balance")).toBeVisible();

    // Purchase flow: enter amount and click Purchase
    await page.getByPlaceholder("Amount (CPC)").fill("5");
    await page.getByRole("button", { name: "Purchase" }).click();

    // Step 1-2: contract reads for identity and compliance
    await expect(page.getByText("Identity verified")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Compliance verified")).toBeVisible({ timeout: 15000 });
    // Step 3: client-side eUSD.approve() tx signed by investor in MetaMask
    await expect(page.getByText("eUSD spending approved")).toBeVisible({ timeout: 45000 });
    // Step 4: API call with auth signature — backend does transferFrom + mint
    await expect(page.getByText("Bond tokens issued")).toBeVisible({ timeout: 45000 });
  });

  test("should load and filter on-chain audit events", async ({ page }) => {
    // The compliance monitor should display on-chain events and support filtering
    await page.goto("/monitor");

    // Wait for events to load from mirror node — must be non-zero.
    // Mirror node has 5-15s lag after transactions, and the hook polls every 5s,
    // so we need a generous timeout to avoid flakes.
    await expect(page.getByText(/[1-9]\d* events/)).toBeVisible({ timeout: 30000 });

    // Verify stats cards show non-zero values — target the "Total Events" stat specifically
    const totalEventsSection = page.getByText("Total Events").locator("..");
    const totalText = await totalEventsSection.locator("p.font-display").textContent();
    expect(parseInt(totalText || "0")).toBeGreaterThan(0);

    // Verify filter buttons appear for event types
    await expect(page.getByRole("button", { name: "ALL", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ISSUANCE", exact: true })).toBeVisible();

    // Click a filter and verify the list updates
    await page.getByRole("button", { name: "ISSUANCE", exact: true }).click();
    // All visible event badges should be ISSUANCE
    const badges = page.locator('span:has-text("ISSUANCE")');
    await expect(badges.first()).toBeVisible();

    // Click ALL to reset
    await page.getByRole("button", { name: "ALL", exact: true }).click();
    const allEventsText = await page.getByText(/\d+ events/).textContent();
    expect(parseInt(allEventsText?.match(/\d+/)?.[0] || "0")).toBeGreaterThan(0);
  });

  // Pause test runs last — it modifies global token state and could block other tests
  test("should pause and unpause token", async ({ page }) => {
    // Connect as deployer
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Token should be unpaused initially — "Pause Token" button visible
    await expect(page.getByRole("button", { name: "Pause Token" })).toBeVisible({ timeout: 15000 });

    // Pause the token
    await page.getByRole("button", { name: "Pause Token" }).click();
    await expect(page.getByText("Token paused")).toBeVisible({ timeout: 30000 });

    // After pausing, "Unpause Token" button should appear
    await expect(page.getByRole("button", { name: "Unpause Token" })).toBeVisible({ timeout: 15000 });

    // Now unpause
    await page.getByRole("button", { name: "Unpause Token" }).click();
    await expect(page.getByText("Token unpaused")).toBeVisible({ timeout: 30000 });

    // After unpausing, "Pause Token" button should reappear
    await expect(page.getByRole("button", { name: "Pause Token" })).toBeVisible({ timeout: 15000 });
  });

  // Safety net: always unpause token after all tests complete (even on failure)
  test.afterAll(async () => {
    await ensureTokenUnpaused(TOKEN, DEPLOYER_KEY);
  });
});
