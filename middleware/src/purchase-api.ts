import express from "express";
import cors from "cors";
import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicId,
  Status,
} from "@hashgraph/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaTestnet } from "viem/chains";
import { getClient, getOperatorKey, JSON_RPC_URL, MIRROR_NODE_URL } from "./config.js";

const TOKEN_ABI = parseAbi(["function mint(address to, uint256 amount)"]);

const EUSD_TOKEN_ID = process.env.EUSD_TOKEN_ID!;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

// Narrow to viem's branded hex type once for reuse
const tokenAddr = TOKEN_ADDRESS as `0x${string}`; // viem requires branded hex type for addresses

// Map EVM addresses to Hedera account IDs + private keys for demo wallets
const WALLET_KEYS: Record<string, { accountId: string; privateKey: string }> = {};

interface MirrorAccountResponse {
  account?: string;
}

interface MirrorTokenEntry {
  token_id: string;
  balance: number;
}

interface MirrorTokensResponse {
  tokens?: MirrorTokenEntry[];
}

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
      const account = privateKeyToAccount(keyHex as `0x${string}`); // viem requires branded hex for private keys
      WALLET_KEYS[account.address.toLowerCase()] = {
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
    const data: MirrorAccountResponse = await res.json();
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
    const data: MirrorTokensResponse = await res.json();
    const entry = data.tokens?.find((t) => t.token_id === EUSD_TOKEN_ID);
    return entry ? entry.balance / 100 : 0; // eUSD has 2 decimals
  } catch {
    return 0;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("FATAL: API_KEY environment variable is required");
  process.exit(1);
}

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers["x-api-key"] !== API_KEY) {
    res.status(401).json({ error: "Missing or invalid X-API-Key header" });
    return;
  }
  next();
}

app.post("/api/purchase", requireApiKey, async (req, res) => {
  const { investorAddress, amount } = req.body;

  if (!investorAddress || typeof investorAddress !== "string" || !amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Invalid request: need investorAddress (string) and positive amount (number)" });
    return;
  }

  // Validate wallet is known before creating any connections
  const walletInfo = WALLET_KEYS[investorAddress.toLowerCase()];
  if (!walletInfo) {
    res.status(400).json({ error: "Unknown wallet - only demo wallets are supported" });
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
    try {
      const treasuryAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
      const tokenId = TokenId.fromString(EUSD_TOKEN_ID);

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

      if (transferReceipt.status !== Status.Success) {
        res.status(500).json({ error: `eUSD transfer failed: ${transferReceipt.status}` });
        return;
      }
      console.log(`  eUSD transfer: ${transferReceipt.status} (${amount} eUSD from ${investorAccountId} to treasury)`);

      // 4. Mint CPC tokens to investor via EVM
      let mintTxHash: string | undefined;
      try {
        const deployerKeyHex = (DEPLOYER_KEY.startsWith("0x") ? DEPLOYER_KEY : `0x${DEPLOYER_KEY}`) as `0x${string}`; // viem requires branded hex for private keys
        const deployerAccount = privateKeyToAccount(deployerKeyHex);

        const walletClient = createWalletClient({
          account: deployerAccount,
          chain: hederaTestnet,
          transport: http(JSON_RPC_URL),
        });

        const publicClient = createPublicClient({
          chain: hederaTestnet,
          transport: http(JSON_RPC_URL),
        });

        const hash = await walletClient.writeContract({
          address: tokenAddr,
          abi: TOKEN_ABI,
          functionName: "mint",
          args: [investorAddress as `0x${string}`, parseEther(String(amount))], // viem requires branded hex for addresses
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        mintTxHash = receipt.transactionHash;
        console.log(`  CPC mint: ${mintTxHash} (${amount} CPC to ${investorAddress})`);
      } catch (mintErr: unknown) {
        // Mint failed after eUSD was already transferred — refund eUSD
        console.error("  CPC mint failed, refunding eUSD...");
        try {
          const refundTx = await new TransferTransaction()
            .addTokenTransfer(tokenId, treasuryAccountId, -eusdAmount)
            .addTokenTransfer(tokenId, AccountId.fromString(investorAccountId), eusdAmount)
            .freezeWith(client)
            .sign(getOperatorKey());

          const refundResult = await refundTx.execute(client);
          const refundReceipt = await refundResult.getReceipt(client);
          console.log(`  eUSD refund: ${refundReceipt.status}`);
        } catch (refundErr: unknown) {
          const refundMsg = refundErr instanceof Error ? refundErr.message : "unknown";
          console.error(`  eUSD refund FAILED: ${refundMsg} — manual intervention needed`);
        }
        const mintMsg = mintErr instanceof Error ? mintErr.message : "Mint failed";
        res.status(500).json({ error: `CPC mint failed (eUSD refunded): ${mintMsg.slice(0, 150)}` });
        return;
      }

      res.json({
        success: true,
        eusdTxId: transferResult.transactionId.toString(),
        mintTxHash,
      });
    } finally {
      client.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    console.error("Purchase error:", message);
    res.status(500).json({ error: message.slice(0, 200) });
  }
});

app.post("/api/allocate", requireApiKey, async (req, res) => {
  const { project, category, amount, currency } = req.body;

  if (!project || typeof project !== "string" || !category || typeof category !== "string" || !amount || typeof amount !== "number") {
    res.status(400).json({ error: "Missing or invalid project (string), category (string), or amount (number)" });
    return;
  }

  const impactTopicId = process.env.IMPACT_TOPIC_ID;
  if (!impactTopicId) {
    res.status(500).json({ error: "IMPACT_TOPIC_ID not configured" });
    return;
  }

  const client = getClient();
  try {
    const operatorKey = getOperatorKey();

    const payload = {
      type: "PROCEEDS_ALLOCATED",
      ts: Date.now(),
      data: {
        project,
        category,
        amount: String(amount),
        currency: typeof currency === "string" ? currency : "USD",
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

    res.json({ success: true, status: receipt.status.toString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Allocation failed";
    console.error("Allocate error:", message);
    res.status(500).json({ error: message.slice(0, 200) });
  } finally {
    client.close();
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
