import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { DEPLOYER_KEY, ALICE_KEY } from "../fixtures/test-keys";

test.describe("Issuer Dashboard", () => {
  test("should require wallet connection", async ({ page }) => {
    await page.goto("/issue");
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible();
  });

  test("should show Not Authorized for non-agent wallet (Alice)", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Not Authorized")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Only the bond issuer")).toBeVisible();
    // Should NOT show issuer controls
    await expect(page.getByText("Mint Tokens")).not.toBeVisible();
  });

  test("should show issuer controls when connected", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze")).toBeVisible();
    await expect(page.getByText("Token Pause Control")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
  });

  test("should display mint form with inputs", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    const mintSection = page.getByText("Mint Tokens").locator("..");
    await expect(mintSection.getByPlaceholder("Recipient address")).toBeVisible({ timeout: 10000 });
    await expect(mintSection.getByPlaceholder("Amount (CPC)")).toBeVisible();
    await expect(mintSection.getByRole("button", { name: "Mint" })).toBeVisible();
  });

  test("should display freeze/unfreeze controls", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByRole("button", { name: "Freeze", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Unfreeze", exact: true })).toBeVisible();
  });

  test("should display pause control with current status", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Token Pause Control")).toBeVisible({ timeout: 10000 });
    // Token should be active (unpaused) after setup
    await expect(page.getByText("Active")).toBeVisible({ timeout: 15000 });
  });

  test("should show proceeds allocation form", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByPlaceholder("Project name")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Allocate to HCS" })).toBeVisible();
  });
});
