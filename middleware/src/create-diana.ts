/**
 * Creates Diana's Hedera testnet account with an ECDSA key.
 * Run once, then add the output to .env.
 */
import { AccountCreateTransaction, Hbar, PrivateKey } from "@hashgraph/sdk";
import { getClient } from "./config.js";

async function main() {
  const client = getClient();

  // Generate ECDSA key for Diana
  const dianaKey = PrivateKey.generateECDSA();
  const dianaPublicKey = dianaKey.publicKey;

  console.log("Creating Diana's account on Hedera testnet...");

  const tx = await new AccountCreateTransaction()
    .setKey(dianaPublicKey)
    .setInitialBalance(new Hbar(50)) // 50 HBAR for gas
    .setAlias(dianaPublicKey.toEvmAddress())
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const accountId = receipt.accountId!;

  console.log("\n=== Diana Account Created ===");
  console.log(`Account ID:  ${accountId.toString()}`);
  console.log(`EVM Address: 0x${dianaPublicKey.toEvmAddress()}`);
  console.log(`Private Key: 0x${dianaKey.toStringRaw()}`);
  console.log("\nAdd to .env:");
  console.log(`DIANA_ACCOUNT_ID=${accountId.toString()}`);
  console.log(`DIANA_ADDRESS=0x${dianaPublicKey.toEvmAddress()}`);
  console.log(`DIANA_PRIVATE_KEY=0x${dianaKey.toStringRaw()}`);

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
