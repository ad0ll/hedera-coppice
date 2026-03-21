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
  Transfer:
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  TokenPaused:
    "0xf017c0de579727a3cd3ee18077ee8b4c43bf21892985952d1d5a0d52f983502d",
  TokenUnpaused:
    "0xf38578ed892ce2ce655ca8ae03c73464ad74915a1331a9b4085e637534daeedf",
  AddressFrozen:
    "0x7fa523c84ab8d7fc5b72f08b9e46dbbf10c39e119a075b3e317002d14bc9f436",
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
      const isIssuance = from.toLowerCase() === ZERO_ADDR;
      return {
        ...base,
        type: isIssuance ? "ISSUANCE" : "TRANSFER",
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

async function fetchAllContractLogs(
  contractAddress: string,
): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];
  let path: string | null = `/api/v1/contracts/${contractAddress}/results/logs?order=asc&limit=100`;

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
