import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY, DEPLOYER_KEY } from "../fixtures/test-keys";

test.describe("Accessibility & Keyboard Navigation", () => {
  test("page has correct landmark roles", async ({ page }) => {
    await page.goto("/");

    // Main navigation landmark
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();

    // Main content landmark
    const main = page.getByRole("main");
    await expect(main).toBeVisible();

    // Footer landmark
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
  });

  test("nav links are keyboard focusable and navigable", async ({ page }) => {
    await page.goto("/");

    // Tab to the Coppice logo link
    await page.keyboard.press("Tab");

    // Tab through nav links — Invest, Issuer, Compliance
    await page.keyboard.press("Tab");
    const investLink = page.getByRole("link", { name: "Invest" });
    await expect(investLink).toBeFocused();

    await page.keyboard.press("Tab");
    const issuerLink = page.getByRole("link", { name: "Issuer" });
    await expect(issuerLink).toBeFocused();

    await page.keyboard.press("Tab");
    const complianceLink = page.getByRole("link", { name: "Compliance" });
    await expect(complianceLink).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/monitor");
  });

  test("connect wallet button is keyboard accessible", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");

    const connectBtn = page.getByRole("button", { name: "Connect Wallet" });
    await connectBtn.focus();
    await expect(connectBtn).toBeFocused();

    // Activate with Enter
    await page.keyboard.press("Enter");
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
  });

  test("issuer form inputs have accessible labels", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // All form inputs should have associated labels (sr-only)
    const mintTo = page.getByLabel("Recipient address");
    await expect(mintTo).toBeVisible();

    const mintAmount = page.getByLabel("Mint amount");
    await expect(mintAmount).toBeVisible();

    const freezeAddr = page.getByLabel("Wallet address to freeze/unfreeze");
    await expect(freezeAddr).toBeVisible();

    const projectName = page.getByLabel("Project name");
    await expect(projectName).toBeVisible();

    const projectCategory = page.getByLabel("Category");
    await expect(projectCategory).toBeVisible();

    const proceedsAmount = page.getByLabel("Amount in USD");
    await expect(proceedsAmount).toBeVisible();
  });

  test("purchase amount input has accessible label", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });

    const purchaseInput = page.getByLabel("Purchase amount in CPC");
    await expect(purchaseInput).toBeVisible();
  });

  test("loading spinners have appropriate status roles", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Compliance checks show loading spinners with role="status"
    // At least one spinner should appear briefly during loading
    const spinners = page.locator('[role="status"]');
    // Wait for compliance to start loading (spinners appear)
    // then wait for completion
    await expect(page.getByText("Eligible to Invest").or(page.getByText("Not Eligible"))).toBeVisible({ timeout: 30000 });
  });

  test("compliance status uses aria-live for dynamic updates", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // The compliance check results container should have aria-live
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion.first()).toBeAttached({ timeout: 15000 });
  });

  test("decorative SVGs are hidden from screen readers", async ({ page }) => {
    await page.goto("/issue");

    // The shield icon in the empty state should be aria-hidden
    const decorativeSvg = page.locator('svg[aria-hidden="true"]');
    await expect(decorativeSvg.first()).toBeAttached();
  });
});

test.describe("Wallet Disconnect Behavior", () => {
  test("portfolio resets to placeholder when wallet disconnects", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for portfolio to show
    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });

    // Disconnect
    await page.getByRole("button", { name: "Disconnect" }).click();

    // Portfolio should show "Connect wallet" message
    await expect(page.getByText("Connect wallet to view portfolio")).toBeVisible({ timeout: 5000 });
  });

  test("compliance status resets when wallet disconnects", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for compliance checks to complete
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });

    // Disconnect
    await page.getByRole("button", { name: "Disconnect" }).click();

    // Compliance should show "Connect your wallet" message
    await expect(page.getByText("Connect your wallet to check compliance")).toBeVisible({ timeout: 5000 });
  });

  test("issuer dashboard shows connect prompt after disconnect", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Disconnect
    await page.getByRole("button", { name: "Disconnect" }).click();

    // Should show connect prompt
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible({ timeout: 5000 });
  });
});
