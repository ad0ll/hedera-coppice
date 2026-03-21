# Mirror Node & Guardian Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the HCS-dependent event feeds with Mirror Node contract logs (for on-chain events) and Guardian API (for allocations), eliminating the event logger background service dependency.

**Architecture:** The frontend currently reads events from HCS topics via `useHCSAudit`, which requires a separate `services/src/event-logger.ts` daemon to copy on-chain EVM events into HCS. Instead, we'll read contract logs directly from Mirror Node's `/api/v1/contracts/{id}/results/logs` endpoint. Allocation recording will switch from HCS Impact topic to Guardian's `req_allocation_14` policy tag, making allocations appear as verified VCs in the Impact page. The `AuditEvent` type and all downstream consumers keep the same shape — only the data source changes.

**Tech Stack:** Next.js 16 App Router, React Query, Hedera Mirror Node REST API, Guardian API, Zod, vitest

**Key insight — what HCS is for vs what we use it for:** HCS is a decentralized append-only log for anchoring off-chain data that has no on-chain representation. Our on-chain events (Transfer, Pause, Freeze) are already immutably recorded as EVM event logs and indexed by Mirror Node — HCS adds no value. Our allocations are off-chain actions where HCS would add value, but Guardian already anchors them to HCS automatically when creating VCs. So HCS is redundant in both cases.

**ATS event signatures (verified against real contract logs):**
The ATS contract does NOT use standard OpenZeppelin event names. The correct topic hashes are:

| Event | Solidity Signature | Topic Hash |
|-------|-------------------|------------|
| Transfer | `Transfer(address,address,uint256)` | `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` |
| Pause | `TokenPaused(address)` | `0xf017c0de579727a3cd3ee18077ee8b4c43bf21892985952d1d5a0d52f983502d` |
| Unpause | `TokenUnpaused(address)` | `0xf38578ed892ce2ce655ca8ae03c73464ad74915a1331a9b4085e637534daeedf` |
| Freeze | `AddressFrozen(address,bool,address)` | `0x7fa523c84ab8d7fc5b72f08b9e46dbbf10c39e119a075b3e317002d14bc9f436` |

**ATS event encoding (verified from real logs):**
- **Transfer**: `topics[1]`=from (indexed), `topics[2]`=to (indexed), `data`=value (uint256, 66 bytes)
- **TokenPaused**: `topics[1]`=account (indexed), `data`=`0x` (empty)
- **TokenUnpaused**: `topics[1]`=account (indexed), `data`=`0x` (empty)
- **AddressFrozen**: `topics[1]`=addr (indexed), `topics[2]`=isFrozen bool (indexed), `topics[3]`=owner (indexed), `data`=`0x` (empty)

Note: The contract also emits coupon-related events (`0xbeb7fdc8...` for coupon creation, `0x0eec0abd...` for snapshot scheduling) but we don't need to parse them — coupon data is already handled by `useCoupons` which reads the bond contract directly.

---

## Task 1: Create `useContractEvents` hook with `AuditEvent` type (Mirror Node data source)

This replaces `useHCSAudit("audit")` as the source of on-chain events. The `AuditEvent` type is defined here (previously in `use-hcs-audit.ts`) so consumers can import it from the new module immediately.

**Files:**
- Create: `frontend/hooks/use-contract-events.ts`
- Create: `frontend/__tests__/hooks/use-contract-events.test.ts`

**Step 1: Write the failing test**

Create `frontend/__tests__/hooks/use-contract-events.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseContractLog } from "@/hooks/use-contract-events";

// ATS event signatures (keccak256 hashes — verified against real contract logs)
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PAUSED_TOPIC = "0xf017c0de579727a3cd3ee18077ee8b4c43bf21892985952d1d5a0d52f983502d";
const UNPAUSED_TOPIC = "0xf38578ed892ce2ce655ca8ae03c73464ad74915a1331a9b4085e637534daeedf";
const FROZEN_TOPIC = "0x7fa523c84ab8d7fc5b72f08b9e46dbbf10c39e119a075b3e317002d14bc9f436";

const ZERO_ADDR_TOPIC = "0x" + "0".repeat(64);

describe("parseContractLog", () => {
  it("parses a Transfer (mint) log", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x00000000000000000000000000000000000000000000152d02c7e14af6800000", // 100000e18
      topics: [
        TRANSFER_TOPIC,
        ZERO_ADDR_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773714572.217023287",
      transaction_hash: "0x7b494ed6fd458bf3a9d23636bafe2e03f4238b7311a908feb9c73a1f69457a36",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("MINT");
    expect(event!.data.to).toMatch(/0xeb974ba/i);
    expect(event!.data.amount).toBe("100000.0");
    expect(event!.consensusTimestamp).toBe("1773714572.217023287");
  });

  it("parses a Transfer (non-mint) log", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x00000000000000000000000000000000000000000000003635c9adc5dea00000", // 1000e18
      topics: [
        TRANSFER_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
        "0x0000000000000000000000004f9ad4fd6623b23bed45e47824b1f224da21d762",
      ],
      timestamp: "1773714717.676133191",
      transaction_hash: "0xdba36566d9f6ba371eae6ba86606e67ffcb97402d11f6b085a402ad3c60e9d22",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("TRANSFER");
    expect(event!.data.from).toMatch(/0xeb974ba/i);
    expect(event!.data.to).toMatch(/0x4f9ad4/i);
  });

  it("parses a TokenPaused log (ATS-specific, not OZ Paused)", () => {
    // ATS emits TokenPaused(address indexed account) with data=0x
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: [
        PAUSED_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773756761.599462000",
      transaction_hash: "0xb67fd36a35e55f275109fc44b69590a3b0fb307c02c727cbb1db2816ecf52d26",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("TOKEN_PAUSED");
    expect(event!.data.by).toMatch(/0xeb974ba/i);
  });

  it("parses a TokenUnpaused log", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: [
        UNPAUSED_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773757038.472281000",
      transaction_hash: "0xac35eaebeadb0f75f631e99ed52d3ec07ad9d971c9877eb6c17ca85dc94c7642",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("TOKEN_UNPAUSED");
    expect(event!.data.by).toMatch(/0xeb974ba/i);
  });

  it("parses an AddressFrozen log (all 3 params indexed, data=0x)", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: [
        FROZEN_TOPIC,
        "0x00000000000000000000000035bccfff4fcafd35ff5b3c412d85fba6ee04bcdf", // addr (Diana)
        "0x0000000000000000000000000000000000000000000000000000000000000001", // isFrozen = true
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee", // owner
      ],
      timestamp: "1773755842.577692679",
      transaction_hash: "0xc1867820f7eef46e02908e899e3e8cbef378e4350e0fb397c7b869329c19cbe5",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("WALLET_FROZEN");
    expect(event!.data.wallet).toMatch(/0x35bccfff/i);
    expect(event!.data.by).toMatch(/0xeb974ba/i);
  });

  it("parses AddressFrozen with isFrozen=false as WALLET_UNFROZEN", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: [
        FROZEN_TOPIC,
        "0x00000000000000000000000035bccfff4fcafd35ff5b3c412d85fba6ee04bcdf",
        "0x0000000000000000000000000000000000000000000000000000000000000000", // isFrozen = false
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773755856.653584000",
      transaction_hash: "0x35d3f61cb3bccb6e6b51d20007ac542598052dd988eb15702018e2ffd5c48520",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("WALLET_UNFROZEN");
  });

  it("returns null for unknown event topics", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: ["0xbeb7fdc8c5c160b79de3e9c869bf2f6b287cbe29eb05d7623537a427231942ee"],
      timestamp: "1773714580.433672635",
      transaction_hash: "0x37226e3c9710db02",
      index: 0,
    };
    expect(parseContractLog(log)).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run __tests__/hooks/use-contract-events.test.ts`
Expected: FAIL — module `@/hooks/use-contract-events` doesn't exist.

**Step 3: Write the implementation**

Create `frontend/hooks/use-contract-events.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { formatEther } from "ethers";
import { z } from "zod";
import { MIRROR_NODE_URL, CONTRACT_ADDRESSES } from "@/lib/constants";

/** Shared event type — previously defined in use-hcs-audit.ts */
export interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
  sequenceNumber: number;
  consensusTimestamp: string;
}

// ATS event topic0 hashes (verified against real contract logs on testnet)
// NOTE: ATS uses TokenPaused/TokenUnpaused, NOT standard OZ Paused/Unpaused
const TOPICS = {
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  TokenPaused: "0xf017c0de579727a3cd3ee18077ee8b4c43bf21892985952d1d5a0d52f983502d",
  TokenUnpaused: "0xf38578ed892ce2ce655ca8ae03c73464ad74915a1331a9b4085e637534daeedf",
  AddressFrozen: "0x7fa523c84ab8d7fc5b72f08b9e46dbbf10c39e119a075b3e317002d14bc9f436",
} as const;

const ZERO_ADDR = "0x" + "0".repeat(40);

/** Extract a 20-byte address from a 32-byte topic. */
function topicToAddress(topic: string): string {
  return "0x" + topic.slice(26);
}

/** Mirror Node contract log entry. */
export interface MirrorContractLog {
  address: string;
  data: string;
  topics: string[];
  timestamp: string;
  transaction_hash: string;
  index: number;
}

/** Parse a single Mirror Node contract log into an AuditEvent, or null if unrecognized. */
export function parseContractLog(log: MirrorContractLog): AuditEvent | null {
  const topic0 = log.topics[0];
  if (!topic0) return null;

  const base = {
    tx: log.transaction_hash,
    sequenceNumber: log.index,
    consensusTimestamp: log.timestamp,
  };

  switch (topic0) {
    case TOPICS.Transfer: {
      const from = topicToAddress(log.topics[1] ?? "");
      const to = topicToAddress(log.topics[2] ?? "");
      const value = log.data !== "0x" ? BigInt(log.data) : BigInt(0);
      const isMint = from.toLowerCase() === ZERO_ADDR;
      return {
        ...base,
        type: isMint ? "MINT" : "TRANSFER",
        ts: Math.floor(parseFloat(log.timestamp) * 1000),
        data: { from, to, amount: formatEther(value) },
      };
    }
    case TOPICS.TokenPaused: {
      // ATS: TokenPaused(address indexed account) — account in topics[1], data=0x
      const account = topicToAddress(log.topics[1] ?? "");
      return {
        ...base,
        type: "TOKEN_PAUSED",
        ts: Math.floor(parseFloat(log.timestamp) * 1000),
        data: { by: account },
      };
    }
    case TOPICS.TokenUnpaused: {
      const account = topicToAddress(log.topics[1] ?? "");
      return {
        ...base,
        type: "TOKEN_UNPAUSED",
        ts: Math.floor(parseFloat(log.timestamp) * 1000),
        data: { by: account },
      };
    }
    case TOPICS.AddressFrozen: {
      // ATS: AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)
      // All params indexed — data=0x
      const addr = topicToAddress(log.topics[1] ?? "");
      const isFrozen = log.topics[2]
        ? BigInt(log.topics[2]) === BigInt(1)
        : false;
      const owner = topicToAddress(log.topics[3] ?? "");
      return {
        ...base,
        type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN",
        ts: Math.floor(parseFloat(log.timestamp) * 1000),
        data: { wallet: addr, by: owner },
      };
    }
    default:
      return null;
  }
}

const contractLogSchema = z.object({
  address: z.string(),
  data: z.string(),
  topics: z.array(z.string()),
  timestamp: z.string(),
  transaction_hash: z.string(),
  index: z.number(),
});

const contractLogsResponseSchema = z.object({
  logs: z.array(contractLogSchema).optional(),
  links: z.object({ next: z.string().nullish() }).optional(),
});

async function fetchAllContractLogs(contractAddress: string): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];
  let path: string | null =
    `/api/v1/contracts/${contractAddress}/results/logs?order=asc&limit=100`;

  while (path) {
    const res = await fetch(`${MIRROR_NODE_URL}${path}`);
    if (!res.ok) break;

    const data = contractLogsResponseSchema.parse(await res.json());
    for (const log of data.logs ?? []) {
      const event = parseContractLog(log);
      if (event) events.push(event);
    }

    path = data.links?.next ?? null;
  }

  return events;
}

/**
 * Fetches on-chain events (Transfer, Pause, Freeze) directly from
 * Mirror Node contract logs. Drop-in replacement for useHCSAudit("audit").
 */
export function useContractEvents() {
  const contractAddress = CONTRACT_ADDRESSES.token;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["contract-events", contractAddress],
    queryFn: () => fetchAllContractLogs(contractAddress),
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  return { events, loading: isLoading };
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run __tests__/hooks/use-contract-events.test.ts`
Expected: All 7 tests PASS.

**Step 5: Commit**

```
feat: add useContractEvents hook — reads on-chain events from Mirror Node
```

---

## Task 2: Rewire Issuer page from `useHCSAudit` to `useContractEvents`

**Files:**
- Modify: `frontend/app/issue/page.tsx` (lines 8, 49)

**Step 1: Replace the import and hook call**

In `frontend/app/issue/page.tsx`:

- Change `import { useHCSAudit } from "@/hooks/use-hcs-audit";` to `import { useContractEvents } from "@/hooks/use-contract-events";`
- Change `const { events: auditEvents, loading: auditLoading } = useHCSAudit("audit");` to `const { events: auditEvents, loading: auditLoading } = useContractEvents();`

No other changes needed — `auditEvents` has the same `AuditEvent[]` type.

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```
refactor: issuer page reads events from Mirror Node instead of HCS
```

---

## Task 3: Rewire Compliance Monitor from `useHCSAudit` to `useContractEvents`

**Files:**
- Modify: `frontend/app/monitor/page.tsx` (lines 6, 15)

**Step 1: Replace the import and hook call**

In `frontend/app/monitor/page.tsx`:

- Change `import { useHCSAudit } from "@/hooks/use-hcs-audit";` to `import { useContractEvents } from "@/hooks/use-contract-events";`
- Change `const { events } = useHCSAudit("audit");` to `const { events } = useContractEvents();`

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```
refactor: compliance monitor reads events from Mirror Node instead of HCS
```

---

## Task 4: Rewire AuditEventFeed to use `useContractEvents`

**Files:**
- Modify: `frontend/components/audit-event-feed.tsx`
- Modify: `frontend/app/monitor/page.tsx` (line 121)

**Step 1: Replace the import and hook call**

In `frontend/components/audit-event-feed.tsx`:

- Change `import { useHCSAudit } from "@/hooks/use-hcs-audit";` to `import { useContractEvents } from "@/hooks/use-contract-events";`
- Remove the `topicType` prop — Mirror Node doesn't have topic types
- Change `const { events, loading, topicMissing } = useHCSAudit(topicType);` to `const { events, loading } = useContractEvents();`
- Remove the `topicMissing` early return block (lines 20-32) — Mirror Node doesn't have this failure mode. React Query handles errors via `isError` state automatically.
- Update the component signature: `export function AuditEventFeed()` (remove `topicType` prop)
- Remove the heading's dynamic text that references `topicType` — just use "Audit Event Feed" everywhere
- Remove the loading state heading's reference to `topicType`

**Step 2: Update callers**

In `frontend/app/monitor/page.tsx` line 121:
- Change `<AuditEventFeed topicType="audit" />` to `<AuditEventFeed />`

**Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```
refactor: AuditEventFeed reads from Mirror Node, remove topicType prop
```

---

## Task 5: Remove `useHolders` dependency on HCS events

The `useHolders` hook currently takes `events: AuditEvent[]` as a parameter for supplementary holder discovery. Since holders are already discovered from Mirror Node's token balances API (primary source), and we're removing HCS, we should remove the events parameter.

**Files:**
- Modify: `frontend/hooks/use-holders.ts`
- Modify: `frontend/app/issue/page.tsx` (line 50)
- Delete: `frontend/__tests__/hooks/use-holders.test.ts` (tests `extractHolderAddresses` which is being removed)

**Step 1: Update `useHolders` to remove `events` parameter**

In `frontend/hooks/use-holders.ts`:

- Remove `import type { AuditEvent } from "@/hooks/use-hcs-audit";` (or `use-contract-events` if already updated)
- Remove the `extractHolderAddresses` export and function
- Remove the `events` parameter from `fetchHolderData` and `useHolders`
- Remove the supplementary HCS address discovery block (lines 59-63)
- Change `queryKey: ["holders", events.length]` to `queryKey: ["holders"]`

The hook should become:

```typescript
"use client";

import { ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, CPC_TOKEN_ID } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
import { getTokenHolders, getEvmAddress } from "@/lib/mirror-node";

const ZERO = ethers.ZeroAddress.toLowerCase();

export interface HolderInfo {
  address: string;
  balance: bigint;
  frozen: boolean;
  verified: boolean;
}

async function fetchHolderData(): Promise<HolderInfo[]> {
  const provider = getReadProvider();
  const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, tokenAbi, provider);
  const registryContract = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, identityRegistryAbi, provider);

  const allAddresses = new Set<string>();
  try {
    if (CPC_TOKEN_ID) {
      const holderAccountIds = await getTokenHolders(CPC_TOKEN_ID);
      const evmPromises = holderAccountIds.map(async (accountId) => {
        try {
          return await getEvmAddress(accountId);
        } catch {
          return null;
        }
      });
      const evmAddresses = await Promise.all(evmPromises);
      for (const addr of evmAddresses) {
        if (addr) allAddresses.add(addr.toLowerCase());
      }
    }
  } catch {
    // Mirror Node unavailable
  }

  const validAddresses = [...allAddresses].filter((a) => ethers.isAddress(a));

  const promises = validAddresses.map(async (address) => {
    try {
      const [balance, frozen, verified] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.isFrozen(address).catch(() => false),
        registryContract.isVerified(address).catch(() => false),
      ]);
      return { address, balance, frozen, verified };
    } catch {
      return { address, balance: BigInt(0), frozen: false, verified: false };
    }
  });

  const results = await Promise.all(promises);
  results.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  return results;
}

/**
 * Hook that discovers token holders from Mirror Node token balances API,
 * then reads on-chain data (balance, frozen, verified).
 */
export function useHolders() {
  const { data: holders = [], isLoading } = useQuery({
    queryKey: ["holders"],
    queryFn: () => fetchHolderData(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  return { holders, loading: isLoading };
}
```

**Step 2: Update caller in `issue/page.tsx`**

- Change `const { holders, loading: holdersLoading } = useHolders(auditEvents);` to `const { holders, loading: holdersLoading } = useHolders();`

**Step 3: Delete test file**

Delete `frontend/__tests__/hooks/use-holders.test.ts` — it tests `extractHolderAddresses` which no longer exists. The hook itself is a thin React Query wrapper over Mirror Node + RPC calls that requires integration testing.

**Step 4: Run tests**

Run: `npm run test:unit`
Expected: All tests pass (minus the deleted file).

**Step 5: Commit**

```
refactor: useHolders no longer depends on HCS events — Mirror Node only
```

---

## Task 6: Rewrite allocate API route to submit to Guardian instead of HCS

This is the key change that makes allocations appear in Guardian data (Impact page, SPT, Use of Proceeds).

**Files:**
- Modify: `frontend/app/api/issuer/allocate/route.ts`
- Modify: `frontend/__tests__/api/allocate.test.ts`

**Step 1: Rewrite the allocate route**

Replace the current implementation that submits to HCS Impact topic with one that submits to Guardian's `req_allocation_14` tag. The route needs to:

1. Validate the request body (keep existing validation schema and response schema)
2. Recover the wallet address from signature (keep existing auth)
3. Login to Guardian as issuer (same pattern as `frontend/app/api/guardian/data/route.ts:29-50`)
4. POST to `/api/v1/policies/{policyId}/tag/req_allocation_14/blocks` with a `FundAllocationCS`-shaped document (same format as `scripts/guardian/demo-data.ts:72-81`)
5. Return success

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, recoverAddressOrError } from "@/lib/api-helpers";
import { GUARDIAN_API_URL, GUARDIAN_POLICY_ID } from "@/lib/constants";

const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";

const ALLOCATION_TAG = "req_allocation_14";

const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const allocateResponseSchema = z.object({
  success: z.literal(true),
  status: z.string(),
});
export type AllocateResponse = z.infer<typeof allocateResponseSchema>;

async function guardianLogin(): Promise<string> {
  const loginRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ISSUER_USERNAME, password: ISSUER_PASSWORD }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!loginRes.ok) throw new Error(`Guardian login failed: ${loginRes.status}`);
  const { refreshToken } = (await loginRes.json()) as { refreshToken: string };

  const tokenRes = await fetch(`${GUARDIAN_API_URL}/api/v1/accounts/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`Guardian token exchange failed: ${tokenRes.status}`);
  const { accessToken } = (await tokenRes.json()) as { accessToken: string };
  return accessToken;
}

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, allocateBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { project, category, amount, message: authMessage, signature } = bodyResult.data;

  const authResult = recoverAddressOrError(authMessage, signature);
  if ("error" in authResult) return authResult.error;

  if (!GUARDIAN_POLICY_ID) {
    return NextResponse.json(
      { error: "GUARDIAN_POLICY_ID not configured" },
      { status: 500 },
    );
  }

  try {
    const token = await guardianLogin();

    // FundAllocationCS document — matches the schema from scripts/guardian/demo-data.ts
    const document = {
      ProjectName: project,
      SignedAmountEUSD: amount,
      AllocatedAmountEUSD: amount,
      ShareofFinancingPercent: 0,
      AllocationDate: new Date().toISOString().split("T")[0],
      Purpose: category,
      HederaTransactionID: `manual-${Date.now()}`,
    };

    const res = await fetch(
      `${GUARDIAN_API_URL}/api/v1/policies/${GUARDIAN_POLICY_ID}/tag/${ALLOCATION_TAG}/blocks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ document, ref: null }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Guardian allocation failed: ${res.status} ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, status: "GUARDIAN_SUBMITTED" });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Allocation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Rewrite the allocate test**

Rewrite `frontend/__tests__/api/allocate.test.ts`:

- Remove the `@hashgraph/sdk` mock entirely
- Remove the `@/lib/hedera` mock entirely
- Remove the `setMessageCalls` tracking
- Mock global `fetch` to simulate Guardian login + allocation POST
- Keep the validation tests (missing fields, bad types)
- Change env var from `IMPACT_TOPIC_ID` to `GUARDIAN_POLICY_ID`
- Update success assertion from `status: "SUCCESS"` to `status: "GUARDIAN_SUBMITTED"`
- Remove the "rejects payload exceeding 1KB" test (Guardian has no such limit)
- Remove the "defaults currency to USD" test that checked HCS message content (or rewrite to verify the Guardian request body)

**Step 3: Run tests**

Run: `npm run test:unit`
Expected: All tests pass.

**Step 4: Commit**

```
feat: allocate route submits to Guardian API instead of HCS Impact topic
```

---

## Task 7: Add query invalidation for `contract-events` after mutations

The `useContractEvents` hook uses React Query with key `["contract-events", contractAddress]`. After mint/pause/freeze/transfer operations, we should invalidate this query for immediate UI updates.

**Files:**
- Modify: `frontend/app/issue/page.tsx`
- Modify: `frontend/components/transfer-flow.tsx`

**Step 1: Add invalidation calls**

After each mutation that produces an on-chain event, add:

```typescript
queryClient.invalidateQueries({ queryKey: ["contract-events"] });
```

In `frontend/app/issue/page.tsx`, add after:
- `handleMint()` success (after the existing `holders` invalidation)
- `handlePauseToggle()` success (after the existing `paused` invalidation)
- `handleFreeze()` success (after the existing `isFrozen` invalidation)

In `frontend/components/transfer-flow.tsx`, add after:
- Purchase success (after the existing `holders` invalidation)

These already have `queryClient` available.

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```
fix: invalidate contract-events query after on-chain mutations
```

---

## Task 8: Clean up — remove `useHCSAudit` and HCS-only infrastructure

Now that nothing depends on HCS, clean up the dead code.

**Files:**
- Delete: `frontend/hooks/use-hcs-audit.ts`
- Modify: `frontend/lib/constants.ts` (remove `TOPIC_IDS`)
- Modify: `frontend/lib/mirror-node.ts` (remove `mirrorTopicMessageSchema`, `mirrorTopicMessagesResponseSchema`, `MirrorTopicMessage`, `MirrorTopicMessagesResponse`)

**Step 1: Verify no remaining references to `useHCSAudit`**

Run a grep to confirm nothing references `useHCSAudit` or `use-hcs-audit` after the prior tasks. All 6 consumers should already be migrated:
- `frontend/app/issue/page.tsx` (Task 2)
- `frontend/app/monitor/page.tsx` (Task 3)
- `frontend/components/audit-event-feed.tsx` (Task 4)
- `frontend/hooks/use-holders.ts` (Task 5)
- `frontend/components/issuer-activity-feed.tsx` — imports `AuditEvent` type. Repoint to `@/hooks/use-contract-events`.
- `frontend/__tests__/hooks/use-holders.test.ts` (Task 5 — deleted)

**Step 2: Update `issuer-activity-feed.tsx` import**

Change `import type { AuditEvent } from "@/hooks/use-hcs-audit"` to `import type { AuditEvent } from "@/hooks/use-contract-events"`.

**Step 3: Delete `useHCSAudit` hook file**

Delete `frontend/hooks/use-hcs-audit.ts`.

**Step 4: Remove `TOPIC_IDS` from constants**

In `frontend/lib/constants.ts`, remove:
```typescript
export const TOPIC_IDS = {
  audit: process.env.NEXT_PUBLIC_AUDIT_TOPIC_ID || "",
  impact: process.env.NEXT_PUBLIC_IMPACT_TOPIC_ID || "",
};
```

**Step 5: Remove topic message schemas from mirror-node.ts**

In `frontend/lib/mirror-node.ts`, remove `mirrorTopicMessageSchema`, `mirrorTopicMessagesResponseSchema`, `MirrorTopicMessage`, and `MirrorTopicMessagesResponse`. These are only used by `use-hcs-audit.ts` (verified by grep — no other consumers).

**Step 6: Run full test suite**

Run: `npm run lint && npm run build && npm run test:unit`
Expected: All pass with 0 errors.

**Step 7: Commit**

```
chore: remove useHCSAudit, TOPIC_IDS, and HCS topic schemas
```

---

## Task 9: Update E2E tests

**Files:**
- Modify: `e2e/tests/compliance-monitor.spec.ts`

**Step 1: Update test expectations**

In `e2e/tests/compliance-monitor.spec.ts`:

- Rename test `"should load events from HCS"` to `"should load on-chain events"`. The test body can stay the same — it just waits for events to appear in the Audit Event Feed, which still works since the component name and structure haven't changed.
- The other tests check for "Audit Event Feed" heading and "Total Events" etc — these are unchanged.

**Step 2: Run E2E tests locally**

Run: `cd e2e && npx playwright test compliance-monitor`
Expected: Tests pass.

**Step 3: Commit**

```
test: update e2e test names for Mirror Node event source
```

---

## Task 10: Update env files and documentation

**Files:**
- Modify: `frontend/.env.local.example` (in main worktree — the actual file is `.env.local.example`, not `.env.example`)
- Modify: `frontend/.env` (remove HCS topic vars)
- Modify: `services/.env.example` — add note that event logger is deprecated
- Modify: `CLAUDE.md` — update architecture section

**Step 1: Update frontend env files**

In `frontend/.env.local.example`:
- Remove `NEXT_PUBLIC_AUDIT_TOPIC_ID=0.0.xxx`
- Remove `NEXT_PUBLIC_IMPACT_TOPIC_ID=0.0.xxx`
- Remove `IMPACT_TOPIC_ID=0.0.xxx`

In `frontend/.env`:
- Remove `NEXT_PUBLIC_AUDIT_TOPIC_ID=0.0.8214934`
- Remove `NEXT_PUBLIC_IMPACT_TOPIC_ID=0.0.8214935`
- Remove `IMPACT_TOPIC_ID=0.0.8214935`

Keep `GUARDIAN_POLICY_ID` and `GUARDIAN_API_URL` (already there).

**Step 2: Update services env**

In `services/.env.example`, add a comment at the top:
```
# DEPRECATED: The event logger is no longer required.
# On-chain events are now read directly from Mirror Node contract logs.
# This service remains as a reference implementation only.
```

**Step 3: Update CLAUDE.md**

In the architecture section, note that:
- On-chain events (Transfer, Pause, Freeze) are read directly from Mirror Node contract logs via `useContractEvents`
- Allocations go through Guardian API (`req_allocation_14` policy tag)
- The event logger service (`services/src/event-logger.ts`) is deprecated — no longer required for frontend operation
- HCS topics still exist on-chain but are no longer read by the frontend

**Step 4: Commit**

```
docs: update env examples and CLAUDE.md for Mirror Node migration
```

---

## Dependency Graph

```
Task 1 (useContractEvents hook + AuditEvent type)
  ├── Task 2 (rewire issue page)
  ├── Task 3 (rewire compliance monitor)
  └── Task 4 (rewire AuditEventFeed)

Task 5 (useHolders cleanup) — independent of Tasks 2-4

Task 6 (allocate → Guardian) — independent

Task 7 (query invalidation) — depends on Task 1 (uses contract-events query key)

Task 8 (cleanup) — depends on Tasks 2, 3, 4, 5 (all consumers migrated first)

Task 9 (E2E tests) — depends on Tasks 2, 3, 4
Task 10 (docs) — last
```

**Recommended execution order:** 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 → 9 → 10

Tasks 5 and 6 are independent and can run in parallel with Tasks 2-4.
