// ICMA Green Bond Principles (June 2025) — eligible project categories
// Source: https://www.icmagroup.org/assets/documents/Sustainable-finance/2025-updates/Green-Bond-Principles-GBP-June-2025.pdf
// This is the canonical list. All validation (API, Guardian schema, frontend) references this.

export const ICMA_CATEGORIES = [
  "Renewable Energy",
  "Energy Efficiency",
  "Pollution Prevention and Control",
  "Environmentally Sustainable Management of Living Natural Resources and Land Use",
  "Terrestrial and Aquatic Biodiversity Conservation",
  "Clean Transportation",
  "Sustainable Water and Wastewater Management",
  "Climate Change Adaptation",
  "Circular Economy Adapted Products, Production Technologies and Processes",
  "Green Buildings",
] as const;

export type ICMACategory = (typeof ICMA_CATEGORIES)[number];
