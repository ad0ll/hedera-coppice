import { test, expect } from "@playwright/test";
import { injectWalletMock } from "../fixtures/wallet-mock";
import { DEPLOYER_KEY, ALICE_KEY, BOB_KEY } from "../fixtures/test-keys";

test.describe("Issuer Dashboard", () => {
  test("should require wallet connection", async ({ page }) => {
    await page.goto("/issue");
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible();
  });

  test("should show self-promotion UI for non-agent wallet (Alice)", async ({ page }) => {
    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Become an Issuer")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: "Grant Agent Role" })).toBeVisible();
    await expect(page.getByText("Demo only")).toBeVisible();
    // Should NOT show issuer controls
    await expect(page.getByText("Mint Tokens")).not.toBeVisible();
  });

  test("should show full dashboard with stats and holders when connected as deployer", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Stats banner
    await expect(page.getByText("Total Supply")).toBeVisible();
    await expect(page.getByText("Holders")).toBeVisible();
    await expect(page.getByText("Token Status")).toBeVisible();
    await expect(page.getByText("Proceeds Allocated")).toBeVisible();

    // Holders table
    await expect(page.getByText("Token Holders")).toBeVisible();

    // Operation cards
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze")).toBeVisible();
    await expect(page.getByText("Token Pause Control")).toBeVisible();

    // Activity feed
    await expect(page.getByText("Recent Activity")).toBeVisible();
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

  test("should show allocate proceeds form", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByPlaceholder("Project name")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Record Allocation" })).toBeVisible();
  });

  test("deployer should NOT see demo banner", async ({ page }) => {
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You have the agent role for this demo session")).not.toBeVisible();
  });

  test("self-promotion flow grants agent role and shows full dashboard (Bob)", async ({ page }) => {
    await injectWalletMock(page, BOB_KEY);
    await page.goto("/issue");

    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Bob may already be an agent from a previous test run
    const promoteButton = page.getByRole("button", { name: "Grant Agent Role" });
    const dashboard = page.getByText("Issuer Dashboard");

    // Wait for either the promote CTA or the dashboard to appear
    await expect(promoteButton.or(dashboard)).toBeVisible({ timeout: 30000 });

    if (await promoteButton.isVisible()) {
      // Bob is not yet an agent — trigger the self-promotion flow
      await promoteButton.click();

      // Wait for the dashboard to appear after promotion
      await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 60000 });
    }

    // Bob should see the demo banner (not the owner)
    await expect(page.getByText("You have the agent role for this demo session")).toBeVisible();
    // Bob should now see ALL operation cards including allocate (visible to all agents)
    await expect(page.getByText("Mint Tokens")).toBeVisible();
    await expect(page.getByText("Freeze / Unfreeze")).toBeVisible();
    await expect(page.getByText("Allocate Proceeds")).toBeVisible();
  });
});
