import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY, BOB_KEY, CHARLIE_KEY } from "../fixtures/test-keys";

test.describe("Investor Portal", () => {
  test("should display bond details", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Coppice Green Bond" })).toBeVisible();
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

    // Alice has identity, KYC, AML, and accredited claims
    await expect(page.getByText("Identity contract linked")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("KYC Credential")).toBeVisible();
    await expect(page.getByText("Verified").first()).toBeVisible();
  });

  test("should show compliance status for Bob (registered via self-promotion)", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Bob")).toBeVisible({ timeout: 10000 });
    // Bob was registered on-chain via self-promotion flow — all checks pass
    await expect(page.getByText("Identity contract linked")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Transfer permitted")).toBeVisible({ timeout: 15000 });
  });

  test("should show jurisdiction status for Charlie (CN)", async ({ page }) => {
    await injectWalletMock(page, CHARLIE_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Charlie")).toBeVisible({ timeout: 10000 });

    // Charlie has claims — jurisdiction shows China (approved since no restriction module deployed)
    await expect(page.getByText(/China -/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 15000 });
  });

  test("should display portfolio balances when connected", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("eUSD Balance")).toBeVisible({ timeout: 15000 });
  });

  test("should show purchase form enabled when eligible", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });
    // Purchase form should be accessible
    await expect(page.getByText("Purchase Bond Tokens")).toBeVisible();
  });
});
