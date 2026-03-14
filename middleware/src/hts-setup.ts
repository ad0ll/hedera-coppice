/**
 * Creates the eUSD mock stablecoin on HTS, associates demo wallets, and distributes funds.
 */
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { getClient, getOperatorKey, getOperatorAccountId, MIRROR_NODE_URL } from "./config.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

interface WalletConfig {
  accountId: string;
  privateKey: string;
  label: string;
  amount: number; // in smallest unit (cents)
}

async function main() {
  const client = getClient();
  const operatorKey = getOperatorKey();
  const operatorAccountId = getOperatorAccountId();

  const wallets: WalletConfig[] = [
    {
      accountId: process.env.ALICE_ACCOUNT_ID!,
      privateKey: process.env.ALICE_PRIVATE_KEY!,
      label: "Alice",
      amount: 1000000, // 10,000.00 eUSD
    },
    {
      accountId: process.env.BOB_ACCOUNT_ID!,
      privateKey: process.env.BOB_PRIVATE_KEY!,
      label: "Bob",
      amount: 1000000,
    },
    {
      accountId: process.env.CHARLIE_ACCOUNT_ID!,
      privateKey: process.env.CHARLIE_PRIVATE_KEY!,
      label: "Charlie",
      amount: 1000000,
    },
    {
      accountId: process.env.DIANA_ACCOUNT_ID!,
      privateKey: process.env.DIANA_PRIVATE_KEY!,
      label: "Diana",
      amount: 1000000,
    },
  ];

  // Validate all required env vars
  for (const w of wallets) {
    if (!w.accountId || !w.privateKey) {
      throw new Error(`Missing account ID or private key for ${w.label}`);
    }
  }

  // ================================================================
  // Step 1: Create eUSD token
  // ================================================================
  console.log("Creating eUSD token on HTS...");

  const createTx = await new TokenCreateTransaction()
    .setTokenName("Coppice USD")
    .setTokenSymbol("eUSD")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000000) // 100,000.00 eUSD
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorAccountId)
    .setAdminKey(operatorKey)
    .setSupplyKey(operatorKey)
    .execute(client);

  const createReceipt = await createTx.getReceipt(client);
  const eusdTokenId = createReceipt.tokenId!;
  console.log(`  eUSD Token ID: ${eusdTokenId.toString()}`);

  // ================================================================
  // Step 2: Associate each demo wallet with eUSD
  // ================================================================
  console.log("\nAssociating wallets with eUSD...");

  for (const wallet of wallets) {
    const keyHex = wallet.privateKey.startsWith("0x")
      ? wallet.privateKey.slice(2)
      : wallet.privateKey;
    const walletKey = PrivateKey.fromStringECDSA(keyHex);
    const walletAccountId = AccountId.fromString(wallet.accountId);

    console.log(`  Associating ${wallet.label} (${wallet.accountId})...`);

    const assocTx = await new TokenAssociateTransaction()
      .setAccountId(walletAccountId)
      .setTokenIds([eusdTokenId])
      .freezeWith(client)
      .sign(walletKey);

    await assocTx.execute(client);
    console.log(`    Associated.`);
  }

  // ================================================================
  // Step 3: Distribute eUSD to demo wallets
  // ================================================================
  console.log("\nDistributing eUSD to wallets...");

  for (const wallet of wallets) {
    const walletAccountId = AccountId.fromString(wallet.accountId);
    const displayAmount = (wallet.amount / 100).toLocaleString();

    console.log(`  Sending ${displayAmount} eUSD to ${wallet.label}...`);

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(eusdTokenId, operatorAccountId, -wallet.amount)
      .addTokenTransfer(eusdTokenId, walletAccountId, wallet.amount)
      .execute(client);

    await transferTx.getReceipt(client);
    console.log(`    Sent.`);
  }

  // ================================================================
  // Step 4: Verify via Mirror Node
  // ================================================================
  console.log("\nVerifying balances via Mirror Node...");
  // Wait for mirror node propagation
  await new Promise((r) => setTimeout(r, 5000));

  const response = await fetch(
    `${MIRROR_NODE_URL}/api/v1/tokens/${eusdTokenId.toString()}/balances`
  );
  const data = await response.json();
  console.log("  Token balances:");
  for (const balance of data.balances || []) {
    const displayBalance = (balance.balance / 100).toLocaleString();
    console.log(`    ${balance.account}: ${displayBalance} eUSD`);
  }

  console.log("\nAdd to .env:");
  console.log(`EUSD_TOKEN_ID=${eusdTokenId.toString()}`);

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
