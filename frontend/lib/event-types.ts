/** Canonical audit event type identifiers. */
export const EVENT_TYPES = {
  TRANSFER: "TRANSFER",
  ISSUANCE: "ISSUANCE",
  TOKEN_PAUSED: "TOKEN_PAUSED",
  TOKEN_UNPAUSED: "TOKEN_UNPAUSED",
  WALLET_FROZEN: "WALLET_FROZEN",
  WALLET_UNFROZEN: "WALLET_UNFROZEN",
  PROCEEDS_ALLOCATED: "PROCEEDS_ALLOCATED",
  COUPON_CREATED: "COUPON_CREATED",
  COUPON_DISTRIBUTED: "COUPON_DISTRIBUTED",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Event types that represent approvals / positive actions. */
export const APPROVAL_EVENTS: ReadonlySet<string> = new Set([
  EVENT_TYPES.TRANSFER,
  EVENT_TYPES.ISSUANCE,
  EVENT_TYPES.TOKEN_UNPAUSED,
  EVENT_TYPES.WALLET_UNFROZEN,
  EVENT_TYPES.COUPON_CREATED,
  EVENT_TYPES.COUPON_DISTRIBUTED,
]);

/** Event types that represent restrictions / negative actions. */
export const RESTRICTION_EVENTS: ReadonlySet<string> = new Set([
  EVENT_TYPES.TOKEN_PAUSED,
  EVENT_TYPES.WALLET_FROZEN,
]);

/** Badge color classes keyed by event type. */
export const EVENT_BADGE_CLASSES: Record<string, string> = {
  [EVENT_TYPES.TRANSFER]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.ISSUANCE]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.TOKEN_PAUSED]: "bg-bond-red/15 text-bond-red",
  [EVENT_TYPES.TOKEN_UNPAUSED]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.WALLET_FROZEN]: "bg-bond-red/15 text-bond-red",
  [EVENT_TYPES.WALLET_UNFROZEN]: "bg-bond-green/15 text-bond-green",
  [EVENT_TYPES.PROCEEDS_ALLOCATED]: "bg-bond-amber/15 text-bond-amber",
  [EVENT_TYPES.COUPON_CREATED]: "bg-bond-teal/15 text-bond-teal",
  [EVENT_TYPES.COUPON_DISTRIBUTED]: "bg-bond-green/15 text-bond-green",
};

/** Coupon status → badge variant mapping. */
export const COUPON_STATUS_VARIANT: Record<string, "green" | "amber"> = {
  paid: "green",
  executable: "green",
  record: "amber",
  upcoming: "amber",
};

/** Coupon status → display label mapping. */
export const COUPON_STATUS_LABEL: Record<string, string> = {
  paid: "Distributed",
  executable: "Ready",
  record: "Record Date Passed",
  upcoming: "Upcoming",
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
