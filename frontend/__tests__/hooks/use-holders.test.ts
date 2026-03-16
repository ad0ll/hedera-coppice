import { describe, it, expect } from "vitest";
import { extractHolderAddresses } from "@/hooks/use-holders";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

function makeEvent(type: string, data: Record<string, string>, seq: number): AuditEvent {
  return { type, ts: seq, tx: `0x${seq}`, data, sequenceNumber: seq, consensusTimestamp: `${seq}.0` };
}

describe("extractHolderAddresses", () => {
  it("extracts unique non-zero to-addresses from MINT events", () => {
    const events = [
      makeEvent("MINT", { from: "0x" + "0".repeat(40), to: "0xaaa1", amount: "100" }, 1),
      makeEvent("MINT", { from: "0x" + "0".repeat(40), to: "0xbbb2", amount: "50" }, 2),
      makeEvent("MINT", { from: "0x" + "0".repeat(40), to: "0xaaa1", amount: "200" }, 3),
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toHaveLength(2);
    expect(addresses).toContain("0xaaa1");
    expect(addresses).toContain("0xbbb2");
  });

  it("extracts both from and to from TRANSFER events, excludes zero address", () => {
    const events = [
      makeEvent("TRANSFER", { from: "0xaaa1", to: "0xccc3", amount: "10" }, 1),
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toContain("0xaaa1");
    expect(addresses).toContain("0xccc3");
    expect(addresses).not.toContain("0x" + "0".repeat(40));
  });

  it("returns empty array for non-transfer events", () => {
    const events = [
      makeEvent("TOKEN_PAUSED", { by: "0xadmin" }, 1),
      makeEvent("WALLET_FROZEN", { address: "0xfoo" }, 2),
    ];
    expect(extractHolderAddresses(events)).toHaveLength(0);
  });

  it("normalizes addresses to lowercase for deduplication", () => {
    const events = [
      makeEvent("MINT", { from: "0x" + "0".repeat(40), to: "0xABCD1234" }, 1),
      makeEvent("MINT", { from: "0x" + "0".repeat(40), to: "0xabcd1234" }, 2),
    ];
    const addresses = extractHolderAddresses(events);
    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toBe("0xabcd1234");
  });
});
