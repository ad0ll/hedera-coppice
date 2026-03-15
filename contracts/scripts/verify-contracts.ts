import { run } from "hardhat";

const CONTRACTS_TO_VERIFY = [
  { name: "Token (CPC)", address: "0x17e19B53981370a904d0003Ba2D336837a43cbf0" },
  { name: "IdentityRegistry", address: "0x03ecdB8673d65b81752AC14dAaCa797D846c1B31" },
  { name: "ModularCompliance", address: "0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf" },
  { name: "ClaimIssuer", address: "0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A" },
];

async function main() {
  console.log("Starting contract verification on HashScan (Sourcify)...\n");

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
