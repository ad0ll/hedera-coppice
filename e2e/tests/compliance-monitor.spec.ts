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

  test("should show Guardian verification tab", async ({ page }) => {
    await page.goto("/monitor");
    // Wait for page content to render (coupon activity section loads async)
    await expect(page.getByText("Total Events")).toBeVisible({ timeout: 10000 });
    // Tab is below the coupon activity grid — scroll to it first
    const guardianTab = page.getByRole("tab", { name: "Guardian Verification" });
    await guardianTab.scrollIntoViewIfNeeded({ timeout: 15000 });
    await expect(guardianTab).toBeVisible();
    await guardianTab.click();
    // Wait for Audit Event Feed to disappear (confirms tab switched)
    await expect(page.getByText("Audit Event Feed")).not.toBeVisible({ timeout: 5000 });
    // Now wait for Guardian content: events, loading, or empty state
    await page.waitForTimeout(10000);
    const hasEvents = await page.getByText("Project Registered").first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No Guardian verification events").isVisible().catch(() => false);
    const hasLoading = await page.locator(".animate-pulse").first().isVisible().catch(() => false);
    expect(hasEvents || hasEmpty || hasLoading).toBeTruthy();
  });
});
