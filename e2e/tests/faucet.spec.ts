import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { ALICE_KEY } from "../fixtures/test-keys";

test.describe("eUSD Faucet", () => {
  test("faucet button is visible when wallet is connected", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("faucet button is not visible when wallet is disconnected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).not.toBeVisible();
  });

  test("clicking faucet claims eUSD for pre-associated wallet", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for portfolio to load
    await expect(page.getByText("eUSD Balance")).toBeVisible({ timeout: 15000 });

    // Click faucet
    const faucetButton = page.getByRole("button", { name: /get 1,000 test eusd/i });
    await faucetButton.click();

    // Should show claiming state
    await expect(page.getByRole("button", { name: /claiming eusd/i })).toBeVisible({ timeout: 5000 });

    // Should show success
    await expect(page.getByRole("button", { name: /1,000 eusd claimed/i })).toBeVisible({
      timeout: 30000,
    });

    // Button should reset to idle after 3 seconds
    await expect(page.getByRole("button", { name: /get 1,000 test eusd/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
