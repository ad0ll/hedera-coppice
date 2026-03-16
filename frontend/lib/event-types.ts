/** Canonical HCS audit/impact event type identifiers. */
export const EVENT_TYPES = {
  TRANSFER: "TRANSFER",
  MINT: "MINT",
  TOKEN_PAUSED: "TOKEN_PAUSED",
  TOKEN_UNPAUSED: "TOKEN_UNPAUSED",
  WALLET_FROZEN: "WALLET_FROZEN",
  WALLET_UNFROZEN: "WALLET_UNFROZEN",
  PROCEEDS_ALLOCATED: "PROCEEDS_ALLOCATED",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Event types that represent approvals / positive actions. */
export const APPROVAL_EVENTS: ReadonlySet<string> = new Set([
  EVENT_TYPES.TRANSFER,
  EVENT_TYPES.MINT,
  EVENT_TYPES.TOKEN_UNPAUSED,
  EVENT_TYPES.WALLET_UNFROZEN,
]);

/** Event types that represent restrictions / negative actions. */
export const RESTRICTION_EVENTS: ReadonlySet<string> = new Set([
  EVENT_TYPES.TOKEN_PAUSED,
  EVENT_TYPES.WALLET_FROZEN,
]);

/** Badge color classes keyed by event type. */
export const EVENT_BADGE_CLASSES: Record<string, string> = {
  [EVENT_TYPES.TRANSFER]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.MINT]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.TOKEN_PAUSED]: "bg-bond-red/15 text-bond-red",
  [EVENT_TYPES.TOKEN_UNPAUSED]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.WALLET_FROZEN]: "bg-bond-red/15 text-bond-red",
  [EVENT_TYPES.WALLET_UNFROZEN]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.PROCEEDS_ALLOCATED]: "bg-bond-amber/15 text-bond-amber",
};

/** Bond proceeds allocation categories with their display colors. */
export const BOND_CATEGORIES = [
  "Renewable Energy",
  "Energy Efficiency",
  "Clean Transportation",
  "Sustainable Water",
  "Green Buildings",
] as const;

export type BondCategory = (typeof BOND_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  "Renewable Energy": "bg-bond-green",
  "Energy Efficiency": "bg-bond-amber",
  "Clean Transportation": "bg-bond-red",
  "Sustainable Water": "bg-bond-green-dim",
  "Green Buildings": "bg-bond-teal",
  Other: "bg-text-muted",
};

/** ISO 3166-1 numeric country codes used in demo wallets and onboarding. */
export const COUNTRY_NAMES: Record<number, string> = {
  156: "China",
  250: "France",
  276: "Germany",
  392: "Japan",
  702: "Singapore",
  756: "Switzerland",
  826: "United Kingdom",
  840: "United States",
  // Fictional country — demos jurisdiction banning without targeting a real nation
  999: "Narnia",
};
