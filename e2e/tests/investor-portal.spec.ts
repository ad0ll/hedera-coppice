import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY, BOB_KEY, CHARLIE_KEY } from "../fixtures/test-keys";

test.describe("Investor Portal", () => {
  test("should display bond details", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Coppice Green Bond")).toBeVisible();
    await expect(page.getByText("Symbol").locator("..").getByText("CPC")).toBeVisible();
    await expect(page.getByText("4.25%")).toBeVisible();
  });

  test("should show compliance status for Alice (verified, DE)", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");

    // Click connect wallet
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for compliance checks to complete
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Compliance Status")).toBeVisible();

    // All checks should pass - wait for them to resolve
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });
  });

  test("should show compliance failure for Bob (unverified)", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Bob")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Not Eligible")).toBeVisible({ timeout: 30000 });
  });

  test("should show jurisdiction failure for Charlie (CN restricted)", async ({ page }) => {
    await injectWalletMock(page, CHARLIE_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Charlie")).toBeVisible({ timeout: 10000 });

    // Charlie has claims but country is restricted
    await expect(page.getByText("China - Restricted")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Not Eligible")).toBeVisible({ timeout: 30000 });
  });

  test("should display portfolio section when connected", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("eUSD Balance")).toBeVisible({ timeout: 15000 });
  });

  test("should show purchase form disabled when not eligible", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Not Eligible")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("must pass all compliance checks")).toBeVisible();
  });
});
