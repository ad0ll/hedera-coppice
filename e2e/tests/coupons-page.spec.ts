import { test, expect } from "@playwright/test";

test.describe("Coupons Page", () => {
  test("should display coupon schedule heading", async ({ page }) => {
    await page.goto("/coupons");
    await expect(page.getByText("Coupon Schedule")).toBeVisible();
  });

  test("should show bond summary and coupon data from chain", async ({ page }) => {
    await page.goto("/coupons");
    // Wait for coupon data to load from the bond contract (Hedera RPC can be slow)
    await expect(page.getByText("Annual Rate")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("4.25%").first()).toBeVisible();
    await expect(page.getByText("Total Coupons")).toBeVisible();
    await expect(page.getByText("Face Value")).toBeVisible();
  });

  test("should display coupon period cards with status", async ({ page }) => {
    await page.goto("/coupons");
    // Wait for coupon data to load from the bond contract
    await expect(page.getByText(/Coupon #\d/).first()).toBeVisible({ timeout: 30000 });
    // At least one coupon should show a status badge (we know paid coupons exist on-chain)
    await expect(page.getByText("Paid").first()).toBeVisible();
  });

  test("should be navigable from main nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Coupons" }).click();
    await expect(page).toHaveURL("/coupons");
    await expect(page.getByText("Coupon Schedule")).toBeVisible();
  });
});
