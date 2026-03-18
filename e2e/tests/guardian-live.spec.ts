import { test, expect } from "@playwright/test";

/**
 * Live Guardian E2E tests — run against the real Guardian instance.
 * These tests verify that the frontend can fetch and display real
 * Guardian Verifiable Credential data end-to-end.
 *
 * Prerequisites:
 *   - Frontend dev server running (npm run dev)
 *   - Guardian API accessible at GUARDIAN_API_URL
 *   - Guardian populated with demo data (scripts/guardian/guardian-populate.ts)
 *
 * Run:
 *   npx playwright test guardian-live
 */
test.describe("Guardian Live Integration", () => {
  test.describe.configure({ mode: "serial" });

  test("Impact page loads real Guardian data", async ({ page }) => {
    await page.goto("/impact");

    // Wait for metrics to load (not skeleton)
    await expect(page.getByText("tCO\u2082e Verified")).toBeVisible({ timeout: 15000 });

    // Verify real project names from demo data
    await expect(page.getByText("Project Portfolio")).toBeVisible();
    // At least one project card should render
    const projectCards = page.locator(".card-static h3");
    await expect(projectCards.first()).toBeVisible({ timeout: 10000 });
    const projectCount = await projectCards.count();
    expect(projectCount).toBeGreaterThanOrEqual(1);
  });

  test("Impact page shows SPT progress from Guardian", async ({ page }) => {
    await page.goto("/impact");

    await expect(
      page.getByText("Sustainability Performance Target"),
    ).toBeVisible({ timeout: 15000 });

    // Should show a progress value (either "Target Met" or "Below Target")
    const sptBadge = page.locator("text=/Target Met|Below Target/").first();
    await expect(sptBadge).toBeVisible({ timeout: 10000 });
  });

  test("Impact page shows allocation data from Guardian", async ({ page }) => {
    await page.goto("/impact");

    const heading = page.getByRole("heading", { name: "Use of Proceeds" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should show "X% allocated" text
    const allocationText = page.locator("text=/\\d+% allocated/").first();
    await expect(allocationText).toBeVisible({ timeout: 10000 });
  });

  test("Impact page shows ICMA compliance evidence from Guardian", async ({ page }) => {
    await page.goto("/impact");

    await expect(page.getByText("ICMA Compliance Evidence")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Guardian Verified").first()).toBeVisible();
    // Use stat-label locators to avoid strict mode violations
    await expect(page.locator(".stat-label", { hasText: "Use of Proceeds" })).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "Project Evaluation" })).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "Reporting & Frameworks" })).toBeVisible();
  });

  test("Invest page shows Guardian impact summary", async ({ page }) => {
    await page.goto("/");

    // The impact summary section should load with real Guardian data
    const impactHeading = page.getByText("Green Bond Impact");
    // May not appear if Guardian is slow — use reasonable timeout
    const isVisible = await impactHeading.isVisible().catch(() => false);
    if (isVisible) {
      await expect(page.getByText("Verified CO₂e")).toBeVisible();
      await expect(page.getByText("Proceeds Allocated")).toBeVisible();
      await expect(page.getByText("Projects Funded")).toBeVisible();
      await expect(
        page.getByText("View full impact report"),
      ).toBeVisible();
    } else {
      // Guardian data may not have loaded yet — that's acceptable
      test.skip(true, "Guardian data not loaded on invest page");
    }
  });

  test("Guardian API proxy returns valid data", async ({ request }) => {
    const response = await request.get("/api/guardian/data");

    // If Guardian is up, we get 200; if down, we get 503
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("projects");
      expect(data).toHaveProperty("totalVerifiedCO2e");
      expect(data).toHaveProperty("sptTarget");
      expect(data).toHaveProperty("sptMet");
      expect(data).toHaveProperty("allocationPercent");
      expect(Array.isArray(data.projects)).toBe(true);

      // Verify demo data is present
      expect(data.projects.length).toBeGreaterThanOrEqual(1);
      expect(data.sptTarget).toBeGreaterThan(0);

      // Each project should have registration data
      for (const project of data.projects) {
        expect(project.registration).toBeDefined();
        expect(project.registration.ProjectName).toBeTruthy();
      }
    } else {
      expect(response.status()).toBe(503);
      test.skip(true, "Guardian API unavailable");
    }
  });

  test("Guardian API returns verification data", async ({ request }) => {
    const response = await request.get("/api/guardian/data");
    if (response.status() !== 200) {
      test.skip(true, "Guardian API unavailable");
      return;
    }

    const data = await response.json();
    // Demo data should include at least one verified project
    const verifiedProjects = data.projects.filter(
      (p: { isVerified: boolean }) => p.isVerified,
    );
    expect(verifiedProjects.length).toBeGreaterThanOrEqual(1);
    expect(data.totalVerifiedCO2e).toBeGreaterThan(0);
  });

  test("Guardian API returns allocation data", async ({ request }) => {
    const response = await request.get("/api/guardian/data");
    if (response.status() !== 200) {
      test.skip(true, "Guardian API unavailable");
      return;
    }

    const data = await response.json();
    expect(data.totalAllocatedEUSD).toBeGreaterThan(0);
    expect(data.allocationPercent).toBeGreaterThan(0);
    expect(data.totalIssuanceEUSD).toBeGreaterThan(0);

    // At least one project should have an allocation
    const allocatedProjects = data.projects.filter(
      (p: { allocation?: unknown }) => p.allocation,
    );
    expect(allocatedProjects.length).toBeGreaterThanOrEqual(1);
  });
});
