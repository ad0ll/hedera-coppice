/**
 * Generate a new claim issuer signing key and add it to the ClaimIssuer contract.
 *
 * The original signing key generated during deployment was lost (not persisted
 * to any .env file). This script adds a new CLAIM key so the onboard API can
 * sign new claims. Existing claims remain valid — the old key is still
 * registered on the ClaimIssuer contract.
 *
 * Usage: npx hardhat run scripts/rotate-claim-key.ts --network hederaTestnet
 *
 * After running, add the printed private key to:
 *   - frontend/.env      → CLAIM_ISSUER_SIGNING_KEY=0x...
 *   - contracts/.env     → CLAIM_ISSUER_SIGNING_KEY=0x...
 */
import hre from "hardhat";
import { keccak256, encodeAbiParameters } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadAddresses, saveAddresses } from "./helpers";

async function main() {
  const addresses = loadAddresses();
  const publicClient = await hre.viem.getPublicClient();

  const claimIssuer = await hre.viem.getContractAt(
    "ClaimIssuer",
    addresses.claimIssuer,
  );

  // Generate new signing key
  const newPrivateKey = generatePrivateKey();
  const newAccount = privateKeyToAccount(newPrivateKey);
  console.log("New signing key address:", newAccount.address);
  console.log("New signing key private:", newPrivateKey);

  // Add new key as CLAIM key (purpose=3, type=1/ECDSA)
  console.log("\nAdding new CLAIM key to ClaimIssuer...");
  const keyHash = keccak256(
    encodeAbiParameters([{ type: "address" }], [newAccount.address]),
  );
  const hash = await claimIssuer.write.addKey([keyHash, 3n, 1n]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`TX: ${receipt.transactionHash} (${receipt.status})`);

  // Save to deployed-addresses.json
  addresses.claimIssuerSigningKey = newPrivateKey;
  saveAddresses(addresses);
  console.log("\nSaved to deployed-addresses.json");

  console.log("\n=== ADD TO .env FILES ===");
  console.log(`CLAIM_ISSUER_SIGNING_KEY=${newPrivateKey}`);
  console.log(`IDENTITY_IMPL_AUTHORITY_ADDRESS=${addresses.identityImplAuthority}`);
  console.log(`CLAIM_ISSUER_ADDRESS=${addresses.claimIssuer}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
