import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { DEPLOYER_KEY, ALICE_KEY, BOB_KEY, CHARLIE_KEY } from "../fixtures/test-keys";

test.describe("Full Demo Flow", () => {
  test("complete demo script — navigation and wallet states", async ({ page }) => {
    // Step 1: Visit Investor Portal without wallet
    await page.goto("/");
    await expect(page.getByText("Coppice Green Bond")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
    await expect(page.getByText("Connect your wallet to check compliance")).toBeVisible();

    // Step 2: Connect as Alice - should be eligible
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });

    // Step 3: Navigate to Issuer Dashboard
    // wagmi persists connection state, so disconnect first then re-inject with Deployer key
    await page.getByRole("button", { name: "Disconnect" }).click();
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Mint Tokens")).toBeVisible();

    // Step 4: Navigate to Compliance Monitor
    await page.goto("/monitor");
    await expect(page.getByText("Compliance Monitor")).toBeVisible();
    await expect(page.getByText("Total Events")).toBeVisible();

    // Step 5: Connect as Bob - should be ineligible
    await page.getByRole("button", { name: "Disconnect" }).click();
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Bob")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Not Eligible")).toBeVisible({ timeout: 30000 });

    // Step 6: Connect as Charlie - country restricted
    await page.getByRole("button", { name: "Disconnect" }).click();
    await injectWalletMock(page, CHARLIE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Charlie")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("China - Restricted")).toBeVisible({ timeout: 30000 });
  });

  test("all three pages are accessible via navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Coppice Green Bond")).toBeVisible();

    // Navigate to Issuer
    await page.getByRole("link", { name: "Issuer" }).click();
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible();

    // Navigate to Compliance
    await page.getByRole("link", { name: "Compliance" }).click();
    await expect(page.getByText("Compliance Monitor")).toBeVisible();

    // Navigate back to Invest
    await page.getByRole("link", { name: "Invest" }).click();
    await expect(page.getByText("Coppice Green Bond")).toBeVisible();
  });
});
