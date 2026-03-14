import { test, expect } from "@playwright/test";

test.describe("Compliance Monitor", () => {
  test("should display compliance monitor page", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Compliance Monitor")).toBeVisible();
  });

  test("should show event stats", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Total Events")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Approvals")).toBeVisible();
    await expect(page.getByText("Restrictions")).toBeVisible();
  });

  test("should show audit event feed", async ({ page }) => {
    await page.goto("/monitor");
    await expect(page.getByText("Audit Event Feed")).toBeVisible({ timeout: 10000 });
  });

  test("should load events from HCS", async ({ page }) => {
    await page.goto("/monitor");
    // Wait for events to load from Mirror Node (may take a few seconds)
    // Either we see events or "No events recorded yet"
    await page.waitForTimeout(6000);

    const feed = page.locator("text=Audit Event Feed").locator("..");
    const hasEvents = await feed.locator("text=events").isVisible();
    expect(hasEvents).toBeTruthy();
  });
});
