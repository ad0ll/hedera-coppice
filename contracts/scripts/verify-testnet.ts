import hre from "hardhat";
import fs from "fs";
import { formatEther, parseEther, type Address } from "viem";

async function main() {
  const a = JSON.parse(fs.readFileSync("deployments/deployed-addresses.json", "utf-8"));
  const token = await hre.viem.getContractAt("Token", a.token);
  const registry = await hre.viem.getContractAt("IdentityRegistry", a.identityRegistry);
  const compliance = await hre.viem.getContractAt("ModularCompliance", a.modularCompliance);

  const ALICE: Address = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";
  const BOB: Address = "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7";
  const CHARLIE: Address = "0xFf3a3D1fEc979BB1C6b3b368752b61B249a76F90";
  const DIANA: Address = "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf";
  const DEPLOYER: Address = "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE";

  console.log("=== Identity Registry Status ===");
  console.log("Alice registered:", await registry.read.contains([ALICE]));
  console.log("Alice verified:", await registry.read.isVerified([ALICE]));
  console.log("Alice country:", Number(await registry.read.investorCountry([ALICE])));
  console.log("Bob registered:", await registry.read.contains([BOB]));
  console.log("Charlie registered:", await registry.read.contains([CHARLIE]));
  console.log("Charlie verified:", await registry.read.isVerified([CHARLIE]));
  console.log("Charlie country:", Number(await registry.read.investorCountry([CHARLIE])));
  console.log("Diana registered:", await registry.read.contains([DIANA]));
  console.log("Diana verified:", await registry.read.isVerified([DIANA]));
  console.log("Diana country:", Number(await registry.read.investorCountry([DIANA])));

  console.log("\n=== Compliance Checks ===");
  async function safeCanTransfer(label: string, from: Address, to: Address) {
    try {
      const result = await compliance.read.canTransfer([from, to, parseEther("100")]);
      console.log(`canTransfer to ${label}:`, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`canTransfer to ${label}: REVERTED (${msg.includes("identity not found") ? "no identity" : msg.slice(0, 60)})`);
    }
  }
  await safeCanTransfer("Alice", DEPLOYER, ALICE);
  await safeCanTransfer("Bob", DEPLOYER, BOB);
  await safeCanTransfer("Charlie", DEPLOYER, CHARLIE);
  await safeCanTransfer("Diana", DEPLOYER, DIANA);

  console.log("\n=== Token Status ===");
  console.log("paused:", await token.read.paused());
  console.log("totalSupply:", formatEther(await token.read.totalSupply()));
  console.log("deployer balance:", formatEther(await token.read.balanceOf([DEPLOYER])));
  console.log("Alice balance:", formatEther(await token.read.balanceOf([ALICE])));
  console.log("Diana frozen:", await token.read.isFrozen([DIANA]));
}

main().catch(console.error);
