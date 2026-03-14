import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const a = JSON.parse(fs.readFileSync("deployments/deployed-addresses.json", "utf-8"));
  const token = await ethers.getContractAt("Token", a.token);
  const registry = await ethers.getContractAt("IdentityRegistry", a.identityRegistry);
  const compliance = await ethers.getContractAt("ModularCompliance", a.modularCompliance);

  const ALICE = "0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762";
  const BOB = "0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7";
  const CHARLIE = "0xFf3a3D1fEc979BB1C6b3b368752b61B249a76F90";
  const DIANA = "0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf";
  const DEPLOYER = "0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE";

  console.log("=== Identity Registry Status ===");
  console.log("Alice registered:", await registry.contains(ALICE));
  console.log("Alice verified:", await registry.isVerified(ALICE));
  console.log("Alice country:", Number(await registry.investorCountry(ALICE)));
  console.log("Bob registered:", await registry.contains(BOB));
  console.log("Charlie registered:", await registry.contains(CHARLIE));
  console.log("Charlie verified:", await registry.isVerified(CHARLIE));
  console.log("Charlie country:", Number(await registry.investorCountry(CHARLIE)));
  console.log("Diana registered:", await registry.contains(DIANA));
  console.log("Diana verified:", await registry.isVerified(DIANA));
  console.log("Diana country:", Number(await registry.investorCountry(DIANA)));

  console.log("\n=== Compliance Checks ===");
  async function safeCanTransfer(label: string, from: string, to: string) {
    try {
      const result = await compliance.canTransfer(from, to, ethers.parseEther("100"));
      console.log(`canTransfer to ${label}:`, result);
    } catch (e: any) {
      console.log(`canTransfer to ${label}: REVERTED (${e.message.includes("identity not found") ? "no identity" : e.message.slice(0, 60)})`);
    }
  }
  await safeCanTransfer("Alice", DEPLOYER, ALICE);
  await safeCanTransfer("Bob", DEPLOYER, BOB);
  await safeCanTransfer("Charlie", DEPLOYER, CHARLIE);
  await safeCanTransfer("Diana", DEPLOYER, DIANA);

  console.log("\n=== Token Status ===");
  console.log("paused:", await token.paused());
  console.log("totalSupply:", ethers.formatEther(await token.totalSupply()));
  console.log("deployer balance:", ethers.formatEther(await token.balanceOf(DEPLOYER)));
  console.log("Alice balance:", ethers.formatEther(await token.balanceOf(ALICE)));
  console.log("Diana frozen:", await token.isFrozen(DIANA));
}

main().catch(console.error);
