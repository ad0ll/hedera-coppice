import { test, expect } from "@playwright/test";

const MOCK_GUARDIAN_DATA = {
  bondFramework: {
    BondName: "Coppice Green Bond",
    TotalIssuanceAmount: 100000,
    SustainabilityPerformanceTarget: "Avoid 10,000 tCO2e per period",
    EligibleICMACategories: "Renewable Energy, Sustainable Water and Wastewater Management",
    ReportingStandard: "ICMA Green Bond Principles (June 2025)",
    RegulatoryFrameworks: "EU Taxonomy Regulation 2020/852",
    EUTaxonomyAlignmentPercent: 85,
    BondContractAddress: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
    LCCFContractAddress: "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350",
    ExternalReviewProvider: "Simulated VVB",
  },
  projects: [
    {
      registration: {
        ProjectName: "Sunridge Solar Farm",
        ICMACategory: "Renewable Energy",
        SubCategory: "Solar PV",
        Location: "Berlin, Germany",
        Capacity: 50,
        CapacityUnit: "MW",
      },
      isVerified: true,
      verifiedCO2e: 4700,
      verification: { Opinion: "Approved", VerifiedGHGReduced: 4700 },
      allocation: {
        AllocatedAmountEUSD: 50000,
        ShareofFinancingPercent: 50,
        ProjectName: "Sunridge Solar Farm",
      },
    },
    {
      registration: {
        ProjectName: "Baltic Wind Park",
        ICMACategory: "Renewable Energy",
        SubCategory: "Onshore Wind",
        Location: "Copenhagen, Denmark",
        Capacity: 120,
        CapacityUnit: "MW",
      },
      isVerified: false,
      verifiedCO2e: 0,
    },
  ],
  totalAllocatedEUSD: 50000,
  totalIssuanceEUSD: 100000,
  allocationPercent: 50,
  totalVerifiedCO2e: 4700,
  sptTarget: 10000,
  sptMet: false,
};

test.describe("Impact Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Guardian API route
    await page.route("**/api/guardian/data", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_GUARDIAN_DATA),
      }),
    );
  });

  test("should display environmental impact heading", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
  });

  test("should show key environmental metrics", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("tCO\u2082e Verified")).toBeVisible();
    await expect(page.getByText("Proceeds Allocated")).toBeVisible();
    await expect(page.getByText("Projects Funded")).toBeVisible();
    await expect(page.getByText("SPT Status")).toBeVisible();
  });

  test("should display project portfolio", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Project Portfolio")).toBeVisible();
    // Project cards should be rendered (from mock or real data)
    const projectHeadings = page.locator(".card-static h3");
    await expect(projectHeadings.first()).toBeVisible({ timeout: 10000 });
    const count = await projectHeadings.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should show ICMA compliance evidence from Guardian", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("ICMA Compliance Evidence")).toBeVisible();
    // Use stat-label locators to avoid strict mode violations with headings
    await expect(page.locator(".stat-label", { hasText: "Use of Proceeds" })).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "Project Evaluation" })).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "Management of Proceeds" })).toBeVisible();
    await expect(page.locator(".stat-label", { hasText: "Reporting & Frameworks" })).toBeVisible();
  });

  test("should show SPT progress", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Sustainability Performance Target")).toBeVisible();
    await expect(page.getByText("Below Target")).toBeVisible();
  });

  test("should show allocation breakdown", async ({ page }) => {
    await page.goto("/impact");
    const heading = page.getByRole("heading", { name: "Use of Proceeds" });
    await expect(heading).toBeVisible();
    await expect(page.getByText("50% allocated", { exact: true })).toBeVisible();
  });

  test("should be navigable from main nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Impact" }).click();
    await expect(page).toHaveURL("/impact");
    await expect(page.getByText("Environmental Impact")).toBeVisible();
  });

  test("should show error state when Guardian is unavailable", async ({ page }) => {
    // Unroute the beforeEach mock and set up error mock before navigation
    await page.unrouteAll();
    await page.route("**/api/guardian/data", (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "unavailable" }) }),
    );
    await page.goto("/impact");
    await expect(page.getByText(/Guardian MRV data unavailable/)).toBeVisible({
      timeout: 10000,
    });
  });
});
