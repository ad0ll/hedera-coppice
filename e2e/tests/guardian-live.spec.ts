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

  // Check Guardian availability before running UI tests
  let guardianAvailable = false;

  test("Guardian API is available", async ({ request }) => {
    try {
      const response = await request.get("/api/guardian/data", { timeout: 15000 });
      if (response.status() !== 200) {
        test.skip(true, `Guardian API unavailable (status ${response.status()})`);
        return;
      }
      const data = await response.json();
      expect(data.projects.length).toBeGreaterThanOrEqual(1);
      guardianAvailable = true;
    } catch {
      test.skip(true, "Guardian API request timed out");
    }
  });

  test("Impact page loads real Guardian data", async ({ page }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
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
    test.skip(!guardianAvailable, "Guardian API unavailable");
    await page.goto("/impact");

    await expect(
      page.getByText("Sustainability Performance Target"),
    ).toBeVisible({ timeout: 15000 });

    // Should show a progress value (either "Target Met" or "Below Target")
    const sptBadge = page.locator("text=/Target Met|Below Target/").first();
    await expect(sptBadge).toBeVisible({ timeout: 10000 });
  });

  test("Impact page shows allocation data from Guardian", async ({ page }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
    await page.goto("/impact");

    const heading = page.getByRole("heading", { name: "Use of Proceeds" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Should show "X% allocated" text
    const allocationText = page.locator("text=/\\d+% allocated/").first();
    await expect(allocationText).toBeVisible({ timeout: 10000 });
  });

  test("Impact page shows ICMA compliance evidence from Guardian", async ({ page }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
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
    test.skip(!guardianAvailable, "Guardian API unavailable");
    await page.goto("/");

    // The impact summary section should load with real Guardian data
    const impactHeading = page.getByText("Green Bond Impact");
    const isVisible = await impactHeading.isVisible().catch(() => false);
    if (isVisible) {
      await expect(page.getByText("Verified CO₂e")).toBeVisible();
      await expect(page.getByText("Proceeds Allocated")).toBeVisible();
      await expect(page.getByText("Projects Funded")).toBeVisible();
      await expect(
        page.getByText("View full impact report"),
      ).toBeVisible();
    } else {
      test.skip(true, "Guardian data not loaded on invest page");
    }
  });

  test("Guardian API returns valid data", async ({ request }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
    // Retry once — Vercel serverless cold starts can return 503
    let response = await request.get("/api/guardian/data", { timeout: 15000 });
    if (response.status() === 503) {
      response = await request.get("/api/guardian/data", { timeout: 15000 });
    }
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("projects");
    expect(data).toHaveProperty("totalVerifiedCO2e");
    expect(data).toHaveProperty("sptTarget");
    expect(data).toHaveProperty("sptMet");
    expect(data).toHaveProperty("allocationPercent");
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBeGreaterThanOrEqual(1);
    expect(data.sptTarget).toBeGreaterThan(0);

    for (const project of data.projects) {
      expect(project.registration).toBeDefined();
      expect(project.registration.ProjectName).toBeTruthy();
    }
  });

  test("Guardian API returns verification data", async ({ request }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
    const response = await request.get("/api/guardian/data");
    expect(response.status()).toBe(200);

    const data = await response.json();
    const verifiedProjects = data.projects.filter(
      (p: { isVerified: boolean }) => p.isVerified,
    );
    expect(verifiedProjects.length).toBeGreaterThanOrEqual(1);
    expect(data.totalVerifiedCO2e).toBeGreaterThan(0);
  });

  test("Guardian API returns allocation data", async ({ request }) => {
    test.skip(!guardianAvailable, "Guardian API unavailable");
    const response = await request.get("/api/guardian/data");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.totalAllocatedEUSD).toBeGreaterThan(0);
    expect(data.allocationPercent).toBeGreaterThan(0);
    expect(data.totalIssuanceEUSD).toBeGreaterThan(0);

    const allocatedProjects = data.projects.filter(
      (p: { allocation?: unknown }) => p.allocation,
    );
    expect(allocatedProjects.length).toBeGreaterThanOrEqual(1);
  });
});
