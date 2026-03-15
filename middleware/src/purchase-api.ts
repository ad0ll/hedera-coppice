import express from "express";
import cors from "cors";
import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicId,
} from "@hashgraph/sdk";
import { ethers } from "ethers";
import { getClient, getOperatorKey, JSON_RPC_URL, MIRROR_NODE_URL } from "./config.js";

const TOKEN_ABI = ["function mint(address to, uint256 amount)"];

const EUSD_TOKEN_ID = process.env.EUSD_TOKEN_ID!;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

// Map EVM addresses to Hedera account IDs + private keys for demo wallets
const WALLET_KEYS: Record<string, { accountId: string; privateKey: string }> = {};

function loadWalletKeys() {
  const wallets = [
    { env: "ALICE", accountId: process.env.ALICE_ACCOUNT_ID },
    { env: "DIANA", accountId: process.env.DIANA_ACCOUNT_ID },
    { env: "DEPLOYER", accountId: process.env.HEDERA_ACCOUNT_ID },
  ];

  for (const w of wallets) {
    const pk = process.env[`${w.env}_PRIVATE_KEY`];
    if (pk && w.accountId) {
      const keyHex = pk.startsWith("0x") ? pk : `0x${pk}`;
      const wallet = new ethers.Wallet(keyHex);
      WALLET_KEYS[wallet.address.toLowerCase()] = {
        accountId: w.accountId,
        privateKey: pk,
      };
    }
  }
}

async function resolveAccountId(evmAddress: string): Promise<string | null> {
  const cached = WALLET_KEYS[evmAddress.toLowerCase()];
  if (cached) return cached.accountId;

  try {
    const res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { account?: string };
    return data.account || null;
  } catch {
    return null;
  }
}

async function getEusdBalance(accountId: string): Promise<number> {
  try {
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { tokens?: Array<{ token_id: string; balance: number }> };
    const entry = data.tokens?.find((t) => t.token_id === EUSD_TOKEN_ID);
    return entry ? entry.balance / 100 : 0; // eUSD has 2 decimals
  } catch {
    return 0;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/purchase", async (req, res) => {
  const { investorAddress, amount } = req.body as { investorAddress?: string; amount?: number };

  if (!investorAddress || !amount || amount <= 0) {
    res.status(400).json({ error: "Invalid request: need investorAddress and positive amount" });
    return;
  }

  try {
    // 1. Resolve investor's Hedera account ID
    const investorAccountId = await resolveAccountId(investorAddress);
    if (!investorAccountId) {
      res.status(400).json({ error: "Could not resolve investor account" });
      return;
    }

    // 2. Check eUSD balance
    const balance = await getEusdBalance(investorAccountId);
    if (balance < amount) {
      res.status(400).json({ error: `Insufficient eUSD balance: ${balance} < ${amount}` });
      return;
    }

    // 3. Transfer eUSD from investor to treasury (deployer)
    const client = getClient();
    const treasuryAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
    const tokenId = TokenId.fromString(EUSD_TOKEN_ID);

    // Get investor's private key for signing (demo wallets only)
    const walletInfo = WALLET_KEYS[investorAddress.toLowerCase()];
    if (!walletInfo) {
      res.status(400).json({ error: "Unknown wallet - only demo wallets are supported" });
      return;
    }

    const investorKey = PrivateKey.fromStringECDSA(
      walletInfo.privateKey.startsWith("0x") ? walletInfo.privateKey.slice(2) : walletInfo.privateKey
    );

    // eUSD has 2 decimals
    const eusdAmount = Math.round(amount * 100);

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, AccountId.fromString(investorAccountId), -eusdAmount)
      .addTokenTransfer(tokenId, treasuryAccountId, eusdAmount)
      .freezeWith(client)
      .sign(investorKey);

    const transferResult = await transferTx.execute(client);
    const transferReceipt = await transferResult.getReceipt(client);
    console.log(`  eUSD transfer: ${transferReceipt.status} (${amount} eUSD from ${investorAccountId} to treasury)`);

    // 4. Mint CPC tokens to investor via EVM
    const deployerKeyHex = DEPLOYER_KEY.startsWith("0x") ? DEPLOYER_KEY : `0x${DEPLOYER_KEY}`;
    const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
    const deployerWallet = new ethers.Wallet(deployerKeyHex, provider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, deployerWallet);

    const mintTx = await tokenContract.mint(investorAddress, ethers.parseEther(String(amount)));
    const mintReceipt = await mintTx.wait();
    console.log(`  CPC mint: ${mintReceipt?.hash} (${amount} CPC to ${investorAddress})`);

    client.close();

    res.json({
      success: true,
      eusdTxId: transferReceipt.transactionId?.toString(),
      mintTxHash: mintReceipt?.hash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    console.error("Purchase error:", message);
    res.status(500).json({ error: message.slice(0, 200) });
  }
});

app.post("/api/allocate", async (req, res) => {
  const { project, category, amount, currency } = req.body as {
    project?: string;
    category?: string;
    amount?: number;
    currency?: string;
  };

  if (!project || !category || !amount) {
    res.status(400).json({ error: "Missing project, category, or amount" });
    return;
  }

  try {
    const client = getClient();
    const operatorKey = getOperatorKey();
    const impactTopicId = process.env.IMPACT_TOPIC_ID;
    if (!impactTopicId) {
      res.status(500).json({ error: "IMPACT_TOPIC_ID not configured" });
      return;
    }

    const payload = {
      type: "PROCEEDS_ALLOCATED",
      ts: Date.now(),
      data: {
        project,
        category,
        amount: String(amount),
        currency: currency || "USD",
      },
    };

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(impactTopicId))
      .setMessage(JSON.stringify(payload))
      .freezeWith(client)
      .sign(operatorKey);

    const result = await tx.execute(client);
    const receipt = await result.getReceipt(client);
    console.log(`  Proceeds allocated: ${project} - $${amount} ${category} (${receipt.status})`);

    client.close();

    res.json({ success: true, status: receipt.status.toString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Allocation failed";
    console.error("Allocate error:", message);
    res.status(500).json({ error: message.slice(0, 200) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.API_PORT || 5000;

loadWalletKeys();
console.log(`Purchase API starting on port ${PORT}`);
console.log(`  Known wallets: ${Object.keys(WALLET_KEYS).length}`);

app.listen(PORT, () => {
  console.log(`  Listening at http://localhost:${PORT}`);
});
