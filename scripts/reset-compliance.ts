/**
 * Reset compliance state for a wallet address.
 * Removes the identity from the T-REX IdentityRegistry so the address
 * can go through the onboarding flow again.
 *
 * Usage: npx tsx scripts/reset-compliance.ts <address>
 * Requires: DEPLOYER_PRIVATE_KEY in .env
 */

import { ethers } from "ethers";
import "dotenv/config";

const IDENTITY_REGISTRY = "0x03ecdB8673d65b81752AC14dAaCa797D846c1B31";
const JSON_RPC_URL = "https://testnet.hashio.io/api";

const REGISTRY_ABI = [
  "function contains(address) view returns (bool)",
  "function deleteIdentity(address) external",
  "function identity(address) view returns (address)",
];

async function main() {
  const address = process.argv[2];
  if (!address || !ethers.isAddress(address)) {
    console.error("Usage: npx tsx scripts/reset-compliance.ts <0xAddress>");
    process.exit(1);
  }

  const checksummed = ethers.getAddress(address);
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("DEPLOYER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL, undefined, { staticNetwork: true });
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, REGISTRY_ABI, wallet);

  console.log(`Checking identity for ${checksummed}...`);
  const registered: boolean = await registry.contains(checksummed);
  if (!registered) {
    console.log("Address is not registered in IdentityRegistry. Nothing to purge.");
    return;
  }

  const identityAddr: string = await registry.identity(checksummed);
  console.log(`Found identity contract: ${identityAddr}`);
  console.log("Deleting identity from registry...");

  const tx = await registry.deleteIdentity(checksummed, { gasLimit: BigInt(500_000) });
  console.log(`Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Identity deleted. Status: ${receipt?.status === 1 ? "SUCCESS" : "REVERTED"}`);
  console.log(`HashScan: https://hashscan.io/testnet/transaction/${receipt?.hash}`);

  // Verify
  const stillRegistered: boolean = await registry.contains(checksummed);
  console.log(`Verification: contains(${checksummed}) = ${stillRegistered}`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
