// Demo data for Guardian population — grounded in ICMA with blockchain additions

export const BOND_FRAMEWORK = {
  BondName: "Coppice Green Bond",
  BondSymbol: "CPC",
  ISIN: "XS0000000009",
  Issuer: "Coppice Finance",
  Currency: "eUSD",
  TotalIssuanceAmount: 100000,
  CouponRate: "4.25%",
  MaturityDate: "2028-03-15",
  CouponStepUpBps: 25,
  SustainabilityPerformanceTarget:
    "Avoid 10,000 tCO2e per coupon period across all funded projects",
  EligibleICMACategories: "Renewable Energy, Sustainable Water Management",
  ReportingStandard: "ICMA Green Bond Principles (June 2025)",
  RegulatoryFrameworks: "ICMA GBP June 2025, EU Taxonomy Regulation 2020/852",
  EUTaxonomyAlignmentPercent: 85,
  BondContractAddress: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
  LCCFContractAddress: "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350",
  ExternalReviewProvider: "Simulated VVB (Hackathon Demo)",
};

export const PROJECTS = [
  {
    ProjectName: "Sunridge Solar Farm",
    ICMACategory: "Renewable Energy",
    SubCategory: "Solar PV",
    Country: "KE",
    Location: "Nairobi, Kenya",
    Capacity: 50,
    CapacityUnit: "MW",
    ProjectLifetimeYears: 25,
    AnnualTargetCO2e: 6000,
    EUTaxonomyActivityID: "4.1",
    NACECode: "D35.11",
    EnvironmentalObjective: "Climate Change Mitigation",
    TaxonomyAlignmentStatus: "aligned",
  },
  {
    ProjectName: "Baltic Wind Park",
    ICMACategory: "Renewable Energy",
    SubCategory: "Onshore Wind",
    Country: "EE",
    Location: "Tallinn, Estonia",
    Capacity: 120,
    CapacityUnit: "MW",
    ProjectLifetimeYears: 20,
    AnnualTargetCO2e: 8000,
    EUTaxonomyActivityID: "4.3",
    NACECode: "D35.11",
    EnvironmentalObjective: "Climate Change Mitigation",
    TaxonomyAlignmentStatus: "aligned",
  },
  {
    ProjectName: "AquaPure Reclamation",
    ICMACategory: "Sustainable Water Management",
    SubCategory: "Water Treatment",
    Country: "SG",
    Location: "Singapore",
    Capacity: 50000,
    CapacityUnit: "m3/day",
    ProjectLifetimeYears: 30,
    AnnualTargetCO2e: 1200,
    EUTaxonomyActivityID: "5.3",
    NACECode: "E36.00",
    EnvironmentalObjective: "Sustainable Use of Water and Marine Resources",
    TaxonomyAlignmentStatus: "aligned",
  },
];

export const ALLOCATIONS = [
  {
    ProjectName: "Sunridge Solar Farm",
    SignedAmountEUSD: 45000,
    AllocatedAmountEUSD: 45000,
    ShareofFinancingPercent: 45,
    AllocationDate: "2026-03-15",
    Purpose: "Equipment Procurement & Construction",
    HederaTransactionID: "0.0.8213176@1773600000.000000000",
  },
  {
    ProjectName: "Baltic Wind Park",
    SignedAmountEUSD: 35000,
    AllocatedAmountEUSD: 35000,
    ShareofFinancingPercent: 35,
    AllocationDate: "2026-03-15",
    Purpose: "Equipment Procurement",
    HederaTransactionID: "0.0.8213176@1773600001.000000000",
  },
  {
    ProjectName: "AquaPure Reclamation",
    SignedAmountEUSD: 15000,
    AllocatedAmountEUSD: 15000,
    ShareofFinancingPercent: 15,
    AllocationDate: "2026-03-16",
    Purpose: "Construction & Operations",
    HederaTransactionID: "0.0.8213176@1773600002.000000000",
  },
];

// MRV reports — Sunridge and Baltic hit targets, AquaPure falls short
// Total verified: 1850 + 3150 + 420 = 5420 tCO2e — BELOW 10,000 target (triggers penalty)
export const MRV_REPORTS = [
  {
    ProjectName: "Sunridge Solar Farm",
    ICMACategory: "Renewable Energy",
    ReportingPeriodStart: "2026-01-01",
    ReportingPeriodEnd: "2026-06-30",
    AnnualGHGReduced: 1890,
    Methodology: "IEA Grid Emission Factor (Kenya 2025): 0.45 tCO2e/MWh",
    ReportingStandard: "ICMA Harmonised Framework 2024",
    CoreIndicatorsJSON: JSON.stringify([
      { name: "Annual Energy Generated", value: 4200, unit: "MWh" },
      { name: "Capacity Installed", value: 50, unit: "MW" },
    ]),
    AdditionalIndicatorsJSON: JSON.stringify([
      { name: "Households Served", value: 12500, unit: "households" },
    ]),
  },
  {
    ProjectName: "Baltic Wind Park",
    ICMACategory: "Renewable Energy",
    ReportingPeriodStart: "2026-01-01",
    ReportingPeriodEnd: "2026-06-30",
    AnnualGHGReduced: 3200,
    Methodology: "IEA Grid Emission Factor (Estonia 2025): 0.32 tCO2e/MWh",
    ReportingStandard: "ICMA Harmonised Framework 2024",
    CoreIndicatorsJSON: JSON.stringify([
      { name: "Annual Energy Generated", value: 10000, unit: "MWh" },
      { name: "Capacity Installed", value: 120, unit: "MW" },
    ]),
    AdditionalIndicatorsJSON: JSON.stringify([
      { name: "Jobs Created", value: 84, unit: "FTE" },
    ]),
  },
  {
    ProjectName: "AquaPure Reclamation",
    ICMACategory: "Sustainable Water Management",
    ReportingPeriodStart: "2026-01-01",
    ReportingPeriodEnd: "2026-06-30",
    AnnualGHGReduced: 450,
    Methodology: "IPCC Wastewater Treatment Emission Factors 2019",
    ReportingStandard: "ICMA Harmonised Framework 2024",
    CoreIndicatorsJSON: JSON.stringify([
      { name: "Water Saved", value: 50000, unit: "m3" },
      { name: "Wastewater Treated", value: 30000, unit: "m3" },
      { name: "Water Reduction", value: 15, unit: "%" },
    ]),
    AdditionalIndicatorsJSON: JSON.stringify([
      { name: "Population Served", value: 25000, unit: "people" },
    ]),
  },
];

// Verification statements — Verifier confirms slightly different figures
export const VERIFICATION_STATEMENTS = [
  {
    ProjectName: "Sunridge Solar Farm",
    ReportingPeriod: "2026-H1",
    VerifiedGHGReduced: 1850,
    Opinion: "Approved",
    VerifiedCoreIndicatorsJSON: JSON.stringify([
      { name: "Annual Energy Generated", value: 4110, unit: "MWh" },
      { name: "Capacity Installed", value: 50, unit: "MW" },
    ]),
    VerifierNotes:
      "Minor adjustment to energy generation figure based on meter calibration review. CO2 factor confirmed against IEA 2025 data.",
  },
  {
    ProjectName: "Baltic Wind Park",
    ReportingPeriod: "2026-H1",
    VerifiedGHGReduced: 3150,
    Opinion: "Approved",
    VerifiedCoreIndicatorsJSON: JSON.stringify([
      { name: "Annual Energy Generated", value: 9840, unit: "MWh" },
      { name: "Capacity Installed", value: 120, unit: "MW" },
    ]),
    VerifierNotes:
      "Verified against SCADA data. Slight reduction in wind yield due to below-average wind speeds in Q1.",
  },
  {
    ProjectName: "AquaPure Reclamation",
    ReportingPeriod: "2026-H1",
    VerifiedGHGReduced: 420,
    Opinion: "Conditional",
    VerifiedCoreIndicatorsJSON: JSON.stringify([
      { name: "Water Saved", value: 48000, unit: "m3" },
      { name: "Wastewater Treated", value: 28500, unit: "m3" },
      { name: "Water Reduction", value: 14, unit: "%" },
    ]),
    VerifierNotes:
      "Conditional approval: metering infrastructure for secondary treatment line requires upgrade. Current readings have +/- 5% uncertainty.",
  },
];
