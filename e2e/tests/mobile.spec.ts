import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY, DEPLOYER_KEY } from "../fixtures/test-keys";

test.describe("Mobile Responsive Design", () => {
  test("should show hamburger menu instead of desktop nav", async ({ page }) => {
    await page.goto("/");

    // Desktop nav links should be hidden
    const desktopNav = page.locator(".hidden.sm\\:flex");
    await expect(desktopNav).toBeHidden();

    // Hamburger button should be visible
    const hamburger = page.getByLabel("Toggle menu");
    await expect(hamburger).toBeVisible();
  });

  test("should open and close mobile menu", async ({ page }) => {
    await page.goto("/");

    const hamburger = page.getByLabel("Toggle menu");
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    // Open menu
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");

    // Menu links should be visible
    await expect(page.locator(".sm\\:hidden >> text=Invest")).toBeVisible();
    await expect(page.locator(".sm\\:hidden >> text=Issuer")).toBeVisible();
    await expect(page.locator(".sm\\:hidden >> text=Compliance")).toBeVisible();

    // Close menu
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });

  test("should navigate via mobile menu", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByLabel("Toggle menu");

    // Navigate to Issuer page
    await hamburger.click();
    await page.locator(".sm\\:hidden >> text=Issuer").click();
    await expect(page).toHaveURL("/issue");
    // Menu should close after navigation
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    // Navigate to Compliance page
    await hamburger.click();
    await page.locator(".sm\\:hidden >> text=Compliance").click();
    await expect(page).toHaveURL("/monitor");

    // Navigate back to Invest
    await hamburger.click();
    await page.locator(".sm\\:hidden >> text=Invest").click();
    await expect(page).toHaveURL("/");
  });

  test("should display investor portal responsively", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Bond details should be visible (bond name heading)
    await expect(page.getByRole("heading", { name: "Coppice Green Bond" })).toBeVisible({ timeout: 10000 });

    // Compliance checks should load
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });

    // Portfolio section should be visible (stacked on mobile)
    await expect(page.getByText("CPC Balance")).toBeVisible();
    await expect(page.getByText("eUSD Balance")).toBeVisible();

    // Wallet address hash should be hidden on mobile
    const addressHash = page.locator(".hidden.sm\\:inline");
    await expect(addressHash).toBeHidden();
  });

  test("should display issuer dashboard responsively", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // All cards should be visible (stacked on mobile)
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze Wallet")).toBeVisible();
    await expect(page.getByText("Token Pause Control")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
  });

  test("should display compliance monitor responsively", async ({ page }) => {
    await page.goto("/monitor");

    // Stats cards should be visible
    await expect(page.getByText("Total Events")).toBeVisible();
    await expect(page.getByText("Approvals")).toBeVisible();
    await expect(page.getByText("Restrictions")).toBeVisible();

    // Audit feed should load
    await expect(page.getByText(/\d+ events/)).toBeVisible({ timeout: 15000 });
  });

  test("should have adequate touch targets on filter buttons", async ({ page }) => {
    await page.goto("/monitor");
    // Wait for non-zero events — mirror node can lag 5-15s, hook polls every 5s
    await expect(page.getByText(/[1-9]\d* events/)).toBeVisible({ timeout: 30000 });

    // Filter buttons should exist and be tappable
    const allButton = page.getByRole("button", { name: "ALL", exact: true });
    await expect(allButton).toBeVisible();

    // Check the button has minimum touch target size
    const box = await allButton.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
