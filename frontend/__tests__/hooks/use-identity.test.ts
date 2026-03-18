import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getClaimTransactions, CLAIM_TOPICS } from "@/hooks/use-identity";

const CLAIM_ADDED_TOPIC0 =
  "0x46149b18aa084502c3f12bc75e19eda8bda8d102b82cce8474677a6d0d5f43c5";

const IDENTITY_ADDRESS = "0x0336499c3e67b30bDd5B217fcE4E1000c19f4046";

function makeLog(topic: number, txHash: string) {
  return {
    topics: [
      CLAIM_ADDED_TOPIC0,
      "0x" + "ab".repeat(32), // claimId (irrelevant for this test)
      "0x" + topic.toString(16).padStart(64, "0"),
      "0x" + "cd".repeat(20).padStart(64, "0"), // issuer
    ],
    transaction_hash: txHash,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getClaimTransactions", () => {
  it("extracts KYC, AML, and ACCREDITED tx hashes from ClaimAdded logs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [
            makeLog(CLAIM_TOPICS.KYC, "0xkyctx111"),
            makeLog(CLAIM_TOPICS.AML, "0xamltx222"),
            makeLog(CLAIM_TOPICS.ACCREDITED, "0xacctx333"),
          ],
          links: { next: null },
        }),
    });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.get(CLAIM_TOPICS.KYC)).toBe("0xkyctx111");
    expect(result.get(CLAIM_TOPICS.AML)).toBe("0xamltx222");
    expect(result.get(CLAIM_TOPICS.ACCREDITED)).toBe("0xacctx333");
    expect(result.size).toBe(3);
  });

  it("uses the latest tx hash when a topic has multiple ClaimAdded events", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [
            makeLog(CLAIM_TOPICS.KYC, "0xold_kyc"),
            makeLog(CLAIM_TOPICS.KYC, "0xnew_kyc"),
          ],
          links: { next: null },
        }),
    });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.get(CLAIM_TOPICS.KYC)).toBe("0xnew_kyc");
    expect(result.size).toBe(1);
  });

  it("ignores non-ClaimAdded events", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [
            // A different event (e.g., KeyAdded) with a different topic0
            {
              topics: [
                "0x480000bb1edad8ca1470381cc334b1917fbd51c6531f3a623ea8e0ec7e38a6e9",
                "0x" + "00".repeat(32),
                "0x" + "01".padStart(64, "0"),
              ],
              transaction_hash: "0xother_event",
            },
            makeLog(CLAIM_TOPICS.AML, "0xaml_only"),
          ],
          links: { next: null },
        }),
    });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.size).toBe(1);
    expect(result.get(CLAIM_TOPICS.AML)).toBe("0xaml_only");
  });

  it("follows pagination links", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logs: [makeLog(CLAIM_TOPICS.KYC, "0xkyctx")],
            links: { next: "/api/v1/contracts/0x1234/results/logs?limit=100&timestamp=lte:123" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            logs: [makeLog(CLAIM_TOPICS.AML, "0xamltx")],
            links: { next: null },
          }),
      });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.size).toBe(2);
    expect(result.get(CLAIM_TOPICS.KYC)).toBe("0xkyctx");
    expect(result.get(CLAIM_TOPICS.AML)).toBe("0xamltx");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns empty map when Mirror Node returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.size).toBe(0);
  });

  it("returns empty map when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.size).toBe(0);
  });

  it("returns empty map when no logs exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [],
          links: { next: null },
        }),
    });

    const result = await getClaimTransactions(IDENTITY_ADDRESS);

    expect(result.size).toBe(0);
  });

  it("constructs the correct Mirror Node URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          logs: [],
          links: { next: null },
        }),
    });

    await getClaimTransactions(IDENTITY_ADDRESS);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/contracts/${IDENTITY_ADDRESS}/results/logs`),
    );
  });
});
