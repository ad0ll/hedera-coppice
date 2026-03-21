// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseContractLog } from "@/hooks/use-contract-events";

// ATS event signatures (keccak256 hashes — verified against real contract logs)
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PAUSED_TOPIC =
  "0xf017c0de579727a3cd3ee18077ee8b4c43bf21892985952d1d5a0d52f983502d";
const UNPAUSED_TOPIC =
  "0xf38578ed892ce2ce655ca8ae03c73464ad74915a1331a9b4085e637534daeedf";
const FROZEN_TOPIC =
  "0x7fa523c84ab8d7fc5b72f08b9e46dbbf10c39e119a075b3e317002d14bc9f436";

const ZERO_ADDR_TOPIC = "0x" + "0".repeat(64);

describe("parseContractLog", () => {
  it("parses a Transfer from zero address as ISSUANCE", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x00000000000000000000000000000000000000000000152d02c7e14af6800000",
      topics: [
        TRANSFER_TOPIC,
        ZERO_ADDR_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773714572.217023287",
      transaction_hash:
        "0x7b494ed6fd458bf3a9d23636bafe2e03f4238b7311a908feb9c73a1f69457a36",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("ISSUANCE");
    expect(event!.data.to).toMatch(/0xeb974ba/i);
    expect(event!.data.amount).toBe("100000.0");
    expect(event!.consensusTimestamp).toBe("1773714572.217023287");
  });

  it("parses a Transfer (non-issuance) log", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x00000000000000000000000000000000000000000000003635c9adc5dea00000",
      topics: [
        TRANSFER_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
        "0x0000000000000000000000004f9ad4fd6623b23bed45e47824b1f224da21d762",
      ],
      timestamp: "1773714717.676133191",
      transaction_hash:
        "0xdba36566d9f6ba371eae6ba86606e67ffcb97402d11f6b085a402ad3c60e9d22",
      index: 0,
    };
    const event = parseContractLog(log);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("TRANSFER");
    expect(event!.data.from).toMatch(/0xeb974ba/i);
    expect(event!.data.to).toMatch(/0x4f9ad4/i);
  });

  it("parses a TokenPaused log (ATS-specific, not OZ Paused)", () => {
    const log = {
      address: "0xcfbb4b74edbeb4fe33cd050d7a1203d1486047d9",
      data: "0x",
      topics: [
        PAUSED_TOPIC,
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773756761.599462000",
      transaction_hash:
        "0xb67fd36a35e55f275109fc44b69590a3b0fb307c02c727cbb1db2816ecf52d26",
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
      transaction_hash:
        "0xac35eaebeadb0f75f631e99ed52d3ec07ad9d971c9877eb6c17ca85dc94c7642",
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
        "0x00000000000000000000000035bccfff4fcafd35ff5b3c412d85fba6ee04bcdf",
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773755842.577692679",
      transaction_hash:
        "0xc1867820f7eef46e02908e899e3e8cbef378e4350e0fb397c7b869329c19cbe5",
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
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x000000000000000000000000eb974ba96c4912499c3b3bbd5a40617e1f6eecee",
      ],
      timestamp: "1773755856.653584000",
      transaction_hash:
        "0x35d3f61cb3bccb6e6b51d20007ac542598052dd988eb15702018e2ffd5c48520",
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
      topics: [
        "0xbeb7fdc8c5c160b79de3e9c869bf2f6b287cbe29eb05d7623537a427231942ee",
      ],
      timestamp: "1773714580.433672635",
      transaction_hash: "0x37226e3c9710db02",
      index: 0,
    };
    expect(parseContractLog(log)).toBeNull();
  });
});
