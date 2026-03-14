import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// These tests verify no hook creates its own JsonRpcProvider.
// The singleton lives in lib/provider.ts; hooks should import it.
// This catches the regression where someone adds `new JsonRpcProvider()` inside a hook.

const hooksDir = resolve(__dirname, "../hooks");

function readHook(filename: string): string {
  return readFileSync(resolve(hooksDir, filename), "utf-8");
}

describe("hooks use provider singleton (no inline provider creation)", () => {
  it("useToken.ts does not create a new JsonRpcProvider", () => {
    const source = readHook("useToken.ts");
    expect(source).not.toMatch(/new\s+(ethers\.)?JsonRpcProvider/);
    expect(source).toContain('from "../lib/provider"');
  });

  it("useIdentity.ts does not create a new JsonRpcProvider", () => {
    const source = readHook("useIdentity.ts");
    expect(source).not.toMatch(/new\s+(ethers\.)?JsonRpcProvider/);
    expect(source).toContain('from "../lib/provider"');
  });

  it("useCompliance.ts does not create a new JsonRpcProvider", () => {
    const source = readHook("useCompliance.ts");
    expect(source).not.toMatch(/new\s+(ethers\.)?JsonRpcProvider/);
    expect(source).toContain('from "../lib/provider"');
  });
});
