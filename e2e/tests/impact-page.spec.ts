import { test, expect } from "@playwright/test";

test.describe("Impact Page", () => {
  test("should display environmental impact heading", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
  });

  test("should show key environmental metrics", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("tCO\u2082e Avoided")).toBeVisible();
    await expect(page.getByText("Clean Energy Generated")).toBeVisible();
    await expect(page.getByText("Renewable Capacity")).toBeVisible();
    await expect(page.getByText("Projects Funded")).toBeVisible();
  });

  test("should display project portfolio", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Project Portfolio")).toBeVisible();
    await expect(page.getByText("Sunridge Solar Farm")).toBeVisible();
    await expect(page.getByText("Baltic Wind Park")).toBeVisible();
  });

  test("should show ICMA Green Bond Principles", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("ICMA Green Bond Principles")).toBeVisible();
    await expect(page.getByText("Use of Proceeds")).toBeVisible();
    await expect(page.getByText("Project Evaluation & Selection")).toBeVisible();
    await expect(page.getByText("Management of Proceeds")).toBeVisible();
    await expect(page.getByText("Reporting", { exact: true })).toBeVisible();
  });

  test("should indicate Guardian MRV integration is coming", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Coming Soon")).toBeVisible();
    await expect(page.getByText(/Hedera Guardian/)).toBeVisible();
  });

  test("should be navigable from main nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Impact" }).click();
    await expect(page).toHaveURL("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
  });
});
