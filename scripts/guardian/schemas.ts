// Guardian schema definitions grounded in ICMA Harmonised Framework
// Each schema is formatted as a Guardian-compatible SchemaDTO with a JSON Schema document

import { randomUUID } from "crypto";

interface SchemaField {
  title: string;
  description: string;
  type: string;
  required: boolean;
}

interface SchemaDefinition {
  name: string;
  description: string;
  entity: string;
  fields: SchemaField[];
}

// Converts our field definitions into a Guardian-compatible JSON Schema document
function buildSchemaDTO(schema: SchemaDefinition) {
  const uuid = randomUUID();
  const properties: Record<string, unknown> = {
    "@context": {
      oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
      readOnly: true,
    },
    type: {
      oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
      readOnly: true,
    },
    id: { type: "string", readOnly: true },
    // System fields injected by Guardian into every credential subject
    policyId: { type: "string", readOnly: true },
    guardianVersion: { type: "string", readOnly: true },
  };

  const required: string[] = ["@context", "type"];

  for (const field of schema.fields) {
    const fieldKey = field.title.replace(/[^a-zA-Z0-9]/g, "");
    properties[fieldKey] = {
      title: field.title,
      description: field.description,
      type: field.type === "number" ? "number" : "string",
      readOnly: false,
      $comment: JSON.stringify({
        term: fieldKey,
        "@id": `https://www.schema.org/${field.type === "number" ? "Number" : "text"}`,
      }),
    };
    if (field.required) {
      required.push(fieldKey);
    }
  }

  return {
    uuid,
    name: schema.name,
    description: schema.description,
    entity: "VC",
    status: "DRAFT",
    readonly: false,
    document: {
      $id: `#${uuid}`,
      $comment: JSON.stringify({
        term: uuid,
        "@id": `https://localhost/schema#${uuid}`,
      }),
      title: schema.name,
      description: schema.description,
      type: "object",
      properties,
      required,
      additionalProperties: true,
    },
  };
}

const BOND_FRAMEWORK_DEF: SchemaDefinition = {
  name: "BondFramework",
  description:
    "Green Bond Framework — root of trust chain. Declares environmental commitments, eligible categories, and sustainability performance target per ICMA GBP.",
  entity: "VC",
  fields: [
    { title: "Bond Name", description: "Name of the bond instrument", type: "string", required: true },
    { title: "Bond Symbol", description: "Ticker symbol", type: "string", required: true },
    { title: "ISIN", description: "International Securities Identification Number", type: "string", required: true },
    { title: "Issuer", description: "Issuing entity", type: "string", required: true },
    { title: "Currency", description: "Settlement currency", type: "string", required: true },
    { title: "Total Issuance Amount", description: "Total bond issuance in currency units", type: "number", required: true },
    { title: "Coupon Rate", description: "Annual coupon rate", type: "string", required: true },
    { title: "Maturity Date", description: "Bond maturity date", type: "string", required: true },
    { title: "Coupon Step Up Bps", description: "Basis points penalty if SPT missed", type: "number", required: true },
    { title: "Sustainability Performance Target", description: "SPT threshold for penalty avoidance", type: "string", required: true },
    { title: "Eligible ICMA Categories", description: "Comma-separated ICMA categories", type: "string", required: true },
    { title: "Reporting Standard", description: "E.g. ICMA Green Bond Principles (June 2025)", type: "string", required: true },
    { title: "Regulatory Frameworks", description: "Comma-separated applicable frameworks", type: "string", required: false },
    { title: "EU Taxonomy Alignment Percent", description: "Percentage of proceeds taxonomy-aligned", type: "number", required: false },
    { title: "Bond Contract Address", description: "On-chain bond token contract address", type: "string", required: true },
    { title: "LCCF Contract Address", description: "LifeCycleCashFlow mass payout contract", type: "string", required: true },
    { title: "External Review Provider", description: "Third-party reviewer", type: "string", required: false },
  ],
};

const PROJECT_REGISTRATION_DEF: SchemaDefinition = {
  name: "ProjectRegistration",
  description:
    "Green project funded by bond proceeds. Fields map to ICMA Harmonised Framework template columns A-I. Optional EU Taxonomy Tier 1 classification.",
  entity: "VC",
  fields: [
    { title: "Project Name", description: "ICMA col C", type: "string", required: true },
    { title: "ICMA Category", description: "ICMA col A: Renewable Energy, Sustainable Water Management, etc.", type: "string", required: true },
    { title: "Sub Category", description: "ICMA col B: Solar PV, Onshore Wind, Water Treatment, etc.", type: "string", required: true },
    { title: "Country", description: "ISO 3166-1 alpha-2 country code", type: "string", required: true },
    { title: "Location", description: "City or region", type: "string", required: true },
    { title: "Capacity", description: "Installed or planned capacity", type: "number", required: true },
    { title: "Capacity Unit", description: "MW, MWh, m3/day", type: "string", required: true },
    { title: "Project Lifetime Years", description: "ICMA col I", type: "number", required: true },
    { title: "Annual Target CO2e", description: "SPT enforcement target in tonnes CO2e", type: "number", required: true },
    { title: "EU Taxonomy Activity ID", description: "E.g. 4.1 (Solar PV)", type: "string", required: false },
    { title: "NACE Code", description: "E.g. D35.11", type: "string", required: false },
    { title: "Environmental Objective", description: "EU Taxonomy environmental objective", type: "string", required: false },
    { title: "Taxonomy Alignment Status", description: "aligned, eligible_not_aligned, not_eligible", type: "string", required: false },
  ],
};

const FUND_ALLOCATION_DEF: SchemaDefinition = {
  name: "FundAllocation",
  description:
    "Records bond proceeds allocated to a project. References on-chain eUSD transfer.",
  entity: "VC",
  fields: [
    { title: "Project Name", description: "Project receiving funds", type: "string", required: true },
    { title: "Signed Amount EUSD", description: "ICMA col D: Total committed", type: "number", required: true },
    { title: "Allocated Amount EUSD", description: "ICMA col H: Actually transferred", type: "number", required: true },
    { title: "Share of Financing Percent", description: "ICMA col E", type: "number", required: true },
    { title: "Allocation Date", description: "Date of allocation", type: "string", required: true },
    { title: "Purpose", description: "Equipment Procurement, Construction, Operations", type: "string", required: true },
    { title: "Hedera Transaction ID", description: "On-chain eUSD transfer proof", type: "string", required: true },
  ],
};

const MRV_REPORT_DEF: SchemaDefinition = {
  name: "MRVMonitoringReport",
  description:
    "Environmental outcome data using ICMA Core Indicators. icmaCategory determines which core indicators apply. annualGHGReduced (tCO2e) is universal across ALL ICMA categories.",
  entity: "VC",
  fields: [
    { title: "Project Name", description: "Project being measured", type: "string", required: true },
    { title: "ICMA Category", description: "Renewable Energy, Sustainable Water Management, etc.", type: "string", required: true },
    { title: "Reporting Period Start", description: "ISO 8601 date", type: "string", required: true },
    { title: "Reporting Period End", description: "ISO 8601 date", type: "string", required: true },
    { title: "Annual GHG Reduced", description: "ICMA Core #1 — tonnes CO2e, universal", type: "number", required: true },
    { title: "Methodology", description: "E.g. IEA Grid Emission Factor 2025", type: "string", required: true },
    { title: "Reporting Standard", description: "E.g. ICMA Harmonised Framework 2024", type: "string", required: true },
    { title: "Core Indicators JSON", description: "JSON array of {name,value,unit} — category-specific ICMA Core Indicators", type: "string", required: true },
    { title: "Additional Indicators JSON", description: "JSON array of {name,value,unit} — optional sustainability indicators", type: "string", required: false },
  ],
};

const VERIFICATION_STATEMENT_DEF: SchemaDefinition = {
  name: "VerificationStatement",
  description:
    "Independent Verifier (VVB) assessment of an MRV report. Confirmed figures may differ from claimed values.",
  entity: "VC",
  fields: [
    { title: "Project Name", description: "Project being verified", type: "string", required: true },
    { title: "Reporting Period", description: "E.g. 2026-H1", type: "string", required: true },
    { title: "Verified GHG Reduced", description: "Verifier-confirmed tonnes CO2e", type: "number", required: true },
    { title: "Opinion", description: "Approved, Conditional, Rejected", type: "string", required: true },
    { title: "Verified Core Indicators JSON", description: "JSON array of {name,value,unit}", type: "string", required: false },
    { title: "Verifier Notes", description: "Assessment notes", type: "string", required: false },
  ],
};

const ALL_DEFINITIONS = [
  BOND_FRAMEWORK_DEF,
  PROJECT_REGISTRATION_DEF,
  FUND_ALLOCATION_DEF,
  MRV_REPORT_DEF,
  VERIFICATION_STATEMENT_DEF,
];

export const ALL_SCHEMAS = ALL_DEFINITIONS.map(buildSchemaDTO);

// Export names for lookup
export const SCHEMA_NAMES = ALL_DEFINITIONS.map((d) => d.name);
