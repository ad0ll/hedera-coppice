import { test, expect } from "@playwright/test";

test.describe("Full Demo Flow", () => {
  test("all five pages are accessible via navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Coppice Green Bond" })).toBeVisible({ timeout: 10000 });

    // Navigate to Coupons
    await page.getByRole("link", { name: "Coupons" }).click();
    await expect(page.getByText("Coupon Schedule")).toBeVisible({ timeout: 10000 });

    // Navigate to Impact
    await page.getByRole("link", { name: "Impact" }).click();
    await expect(page.getByText("Environmental Impact")).toBeVisible({ timeout: 10000 });

    // Navigate to Issuer
    await page.getByRole("link", { name: "Issuer" }).click();
    await expect(page.getByText("Connect your issuer wallet")).toBeVisible({ timeout: 10000 });

    // Navigate to Compliance
    await page.getByRole("link", { name: "Compliance" }).click();
    await expect(page.getByText("Compliance Monitor")).toBeVisible({ timeout: 10000 });

    // Navigate back to Invest
    await page.getByRole("link", { name: "Invest" }).click();
    await expect(page.getByRole("heading", { name: "Coppice Green Bond" })).toBeVisible({ timeout: 10000 });
  });
});
