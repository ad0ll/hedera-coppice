import { test, expect } from "@playwright/test";
import { injectWalletMock, readContract, getTokenBalance } from "../fixtures/wallet-mock";
import { ethers } from "ethers";

const DEPLOYER_KEY = "DEPLOYER_PRIVATE_KEY_REDACTED";
const ALICE_ADDR = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";
const DIANA_ADDR = "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf";
const TOKEN = "0x17e19B53981370a904d0003Ba2D336837a43cbf0";

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function paused() view returns (bool)",
  "function isFrozen(address) view returns (bool)",
];

// These tests perform real transactions on Hedera testnet.
// They use the deployer wallet and must run serially.
test.describe.configure({ mode: "serial" });

test.describe("Write Operations (Testnet)", () => {
  test("should mint tokens to Alice via Issuer Dashboard", async ({ page }) => {
    // Get Alice's balance before
    const balanceBefore = await getTokenBalance(TOKEN, ALICE_ADDR);
    const balanceBeforeNum = parseFloat(balanceBefore);

    // Connect as deployer (issuer)
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Fill mint form
    await page.getByPlaceholder("Recipient address (0x...)").fill(ALICE_ADDR);
    await page.getByPlaceholder("Amount (CPC)").fill("10");
    await page.getByRole("button", { name: "Mint" }).click();

    // Wait for success message (transaction takes ~5-10s on Hedera testnet)
    await expect(page.getByText("Minted 10 CPC")).toBeVisible({ timeout: 30000 });

    // Verify on-chain: Alice's balance increased by 10
    // Wait a bit for the testnet to finalize
    await page.waitForTimeout(3000);
    const balanceAfter = await getTokenBalance(TOKEN, ALICE_ADDR);
    const balanceAfterNum = parseFloat(balanceAfter);
    expect(balanceAfterNum).toBeCloseTo(balanceBeforeNum + 10, 0);
  });

  test("should freeze Diana and verify frozen status", async ({ page }) => {
    // Verify Diana is NOT frozen before
    const frozenBefore = await readContract(TOKEN, TOKEN_ABI, "isFrozen", [DIANA_ADDR]);
    expect(frozenBefore).toBe(false);

    // Connect as deployer
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Freeze Diana
    await page.getByPlaceholder("Wallet address (0x...)").fill(DIANA_ADDR);
    await page.getByRole("button", { name: "Freeze", exact: true }).click();

    // Wait for success
    await expect(page.getByText(/Froze 0x35bccFFf/i)).toBeVisible({ timeout: 30000 });

    // Verify on-chain
    await page.waitForTimeout(3000);
    const frozenAfter = await readContract(TOKEN, TOKEN_ABI, "isFrozen", [DIANA_ADDR]);
    expect(frozenAfter).toBe(true);
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

    // Wait for success
    await expect(page.getByText(/Unfroze 0x35bccFFf/i)).toBeVisible({ timeout: 30000 });

    // Verify on-chain
    await page.waitForTimeout(3000);
    const frozenAfter = await readContract(TOKEN, TOKEN_ABI, "isFrozen", [DIANA_ADDR]);
    expect(frozenAfter).toBe(false);
  });

  test("should pause and unpause token", async ({ page }) => {
    // Verify not paused initially
    const pausedBefore = await readContract(TOKEN, TOKEN_ABI, "paused", []);
    expect(pausedBefore).toBe(false);

    // Connect as deployer
    await injectWalletMock(page, DEPLOYER_KEY);
    await page.goto("/issue");
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await expect(page.getByText("Issuer Dashboard")).toBeVisible({ timeout: 10000 });

    // Pause the token
    await page.getByRole("button", { name: "Pause Token" }).click();
    await expect(page.getByText("Token paused")).toBeVisible({ timeout: 30000 });

    // Verify on-chain
    await page.waitForTimeout(3000);
    const pausedAfter = await readContract(TOKEN, TOKEN_ABI, "paused", []);
    expect(pausedAfter).toBe(true);

    // Now unpause
    await page.getByRole("button", { name: "Unpause Token" }).click();
    await expect(page.getByText("Token unpaused")).toBeVisible({ timeout: 30000 });

    // Verify on-chain
    await page.waitForTimeout(3000);
    const pausedFinal = await readContract(TOKEN, TOKEN_ABI, "paused", []);
    expect(pausedFinal).toBe(false);
  });

  test("should run Alice compliance checks and purchase flow UI", async ({ page }) => {
    // Tests the full investor portal: 4 compliance checks + purchase via backend API
    // REQUIRES: middleware purchase-api running (npm run purchase-api)
    const ALICE_KEY = "ALICE_PRIVATE_KEY_REDACTED";

    await injectWalletMock(page, ALICE_KEY);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    // Wait for all 4 compliance checks to pass
    await expect(page.getByText("Eligible to Invest")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("ONCHAINID linked")).toBeVisible();
    await expect(page.getByText("All claims verified")).toBeVisible();
    await expect(page.getByText("Germany - Approved")).toBeVisible();
    await expect(page.getByText("Transfer permitted")).toBeVisible();

    // Alice should see her portfolio with CPC and eUSD balances
    await expect(page.getByText("CPC Balance")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("eUSD Balance")).toBeVisible();

    // Purchase flow: enter amount and click Purchase
    await page.getByPlaceholder("Amount (CPC)").fill("5");
    await page.getByRole("button", { name: "Purchase" }).click();

    // All 4 steps should pass (steps 1-2 are contract reads, steps 3-4 via backend API)
    await expect(page.getByText("Identity verified")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Compliance verified")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("eUSD payment processed")).toBeVisible({ timeout: 45000 });
    await expect(page.getByText("Bond tokens issued")).toBeVisible({ timeout: 15000 });
  });

  test("should load and filter HCS audit events", async ({ page }) => {
    // The compliance monitor should display real HCS events and support filtering
    await page.goto("/monitor");

    // Wait for events to load from mirror node
    await expect(page.getByText(/\d+ events/)).toBeVisible({ timeout: 15000 });

    // Verify stats cards show non-zero values
    const totalText = await page.locator('.text-3xl').first().textContent();
    expect(parseInt(totalText || "0")).toBeGreaterThan(0);

    // Verify filter buttons appear for event types
    await expect(page.getByRole("button", { name: "ALL", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "MINT", exact: true })).toBeVisible();

    // Click a filter and verify the list updates
    await page.getByRole("button", { name: "MINT", exact: true }).click();
    // All visible event badges should be MINT
    const badges = page.locator('span:has-text("MINT")');
    await expect(badges.first()).toBeVisible();

    // Click ALL to reset
    await page.getByRole("button", { name: "ALL", exact: true }).click();
    const allEventsText = await page.getByText(/\d+ events/).textContent();
    expect(parseInt(allEventsText?.match(/\d+/)?.[0] || "0")).toBeGreaterThan(0);
  });
});
