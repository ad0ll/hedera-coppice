import { run } from "hardhat";
import { loadAddresses } from "./helpers";

async function main() {
  console.log("Starting contract verification on HashScan (Sourcify)...\n");

  const addresses = loadAddresses();

  const CONTRACTS_TO_VERIFY = [
    { name: "Token (CPC)", address: addresses.token },
    { name: "IdentityRegistry", address: addresses.identityRegistry },
    { name: "ModularCompliance", address: addresses.modularCompliance },
    { name: "ClaimIssuer", address: addresses.claimIssuer },
  ];

  for (const contract of CONTRACTS_TO_VERIFY) {
    console.log(`Verifying ${contract.name} at ${contract.address}...`);
    try {
      await run("verify", {
        address: contract.address,
        network: "hederaTestnet",
      });
      console.log(`  Verified\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Already Verified") || message.includes("already verified")) {
        console.log(`  Already verified\n`);
      } else {
        console.log(`  Failed: ${message.slice(0, 150)}\n`);
      }
    }
  }

  console.log("Verification complete.");
}

main().catch(console.error);
