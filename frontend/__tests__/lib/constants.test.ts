import { describe, it, expect } from "vitest";
import { DEMO_WALLETS, BOND_DETAILS, CONTRACT_ADDRESSES } from "@/lib/constants";

describe("constants", () => {
  describe("DEMO_WALLETS", () => {
    it("contains all 5 demo wallets", () => {
      expect(Object.keys(DEMO_WALLETS)).toHaveLength(5);
    });

    it("uses lowercase addresses as keys", () => {
      for (const key of Object.keys(DEMO_WALLETS)) {
        expect(key).toBe(key.toLowerCase());
      }
    });

    it("looks up Alice by lowercase address", () => {
      const alice = DEMO_WALLETS["0x4f9ad4fd6623b23bed45e47824b1f224da21d762"];
      expect(alice).toBeDefined();
      expect(alice.label).toBe("Alice");
      expect(alice.country).toBe("DE");
      expect(alice.role).toBe("verified");
    });

    it("returns undefined for unknown address", () => {
      expect(DEMO_WALLETS["0x0000000000000000000000000000000000000000"]).toBeUndefined();
    });
  });

  describe("BOND_DETAILS", () => {
    it("has correct symbol", () => {
      expect(BOND_DETAILS.symbol).toBe("CPC");
    });

    it("has correct coupon rate", () => {
      expect(BOND_DETAILS.couponRate).toBe("4.25%");
    });
  });

  describe("CONTRACT_ADDRESSES", () => {
    it("has all three contract addresses", () => {
      expect(CONTRACT_ADDRESSES.token).toBeDefined();
      expect(CONTRACT_ADDRESSES.identityRegistry).toBeDefined();
      expect(CONTRACT_ADDRESSES.compliance).toBeDefined();
    });

    it("all addresses start with 0x", () => {
      expect(CONTRACT_ADDRESSES.token).toMatch(/^0x/);
      expect(CONTRACT_ADDRESSES.identityRegistry).toMatch(/^0x/);
      expect(CONTRACT_ADDRESSES.compliance).toMatch(/^0x/);
    });
  });
});
