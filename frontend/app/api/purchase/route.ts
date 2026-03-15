import { NextRequest, NextResponse } from "next/server";
import {
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Status,
} from "@hashgraph/sdk";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tokenAbi } from "@coppice/abi";
import { getClient, getOperatorKey, MIRROR_NODE_URL, JSON_RPC_URL } from "@/lib/hedera";
import { hederaTestnet } from "@/lib/wagmi";

function buildWalletKeys(): Map<string, { accountId: string; privateKey: string }> {
  const map = new Map<string, { accountId: string; privateKey: string }>();

  const wallets = [
    { envPrefix: "ALICE", accountIdEnv: "ALICE_ACCOUNT_ID" },
    { envPrefix: "DIANA", accountIdEnv: "DIANA_ACCOUNT_ID" },
    { envPrefix: "DEPLOYER", accountIdEnv: "HEDERA_ACCOUNT_ID" },
  ];

  for (const w of wallets) {
    const pk = process.env[`${w.envPrefix}_PRIVATE_KEY`];
    const accountId = process.env[w.accountIdEnv];
    if (pk && accountId) {
      // Typecast required: env var string needs to be narrowed to viem's branded hex type for privateKeyToAccount
      const keyHex = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
      const account = privateKeyToAccount(keyHex);
      map.set(account.address.toLowerCase(), { accountId, privateKey: pk });
    }
  }

  return map;
}

const walletKeys = buildWalletKeys();

interface MirrorTokenEntry {
  token_id: string;
  balance: number;
}

async function getEusdBalance(accountId: string): Promise<number> {
  const eusdTokenId = process.env.EUSD_TOKEN_ID;
  if (!eusdTokenId) return 0;
  try {
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${eusdTokenId}`,
    );
    if (!res.ok) return 0;
    const data: { tokens?: MirrorTokenEntry[] } = await res.json();
    const entry = data.tokens?.find((t) => t.token_id === eusdTokenId);
    return entry ? entry.balance / 100 : 0;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { investorAddress, amount } = body;

  if (
    !investorAddress ||
    typeof investorAddress !== "string" ||
    !amount ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const walletInfo = walletKeys.get(investorAddress.toLowerCase());
  if (!walletInfo) {
    return NextResponse.json({ error: "Unknown wallet — only demo wallets are supported" }, { status: 400 });
  }

  const client = getClient();
  try {
    // 1. Check eUSD balance
    const balance = await getEusdBalance(walletInfo.accountId);
    if (balance < amount) {
      return NextResponse.json(
        { error: `Insufficient eUSD: ${balance} < ${amount}` },
        { status: 400 },
      );
    }

    // 2. Transfer eUSD from investor to treasury via HTS SDK
    const eusdTokenId = TokenId.fromString(process.env.EUSD_TOKEN_ID!);
    const treasuryAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);

    const investorKey = PrivateKey.fromStringECDSA(
      walletInfo.privateKey.startsWith("0x")
        ? walletInfo.privateKey.slice(2)
        : walletInfo.privateKey,
    );

    const eusdAmount = Math.round(amount * 100); // eUSD has 2 decimals

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(eusdTokenId, AccountId.fromString(walletInfo.accountId), -eusdAmount)
      .addTokenTransfer(eusdTokenId, treasuryAccountId, eusdAmount)
      .freezeWith(client)
      .sign(investorKey);

    const transferResult = await transferTx.execute(client);
    const transferReceipt = await transferResult.getReceipt(client);

    if (transferReceipt.status !== Status.Success) {
      return NextResponse.json(
        { error: `eUSD transfer failed: ${transferReceipt.status}` },
        { status: 500 },
      );
    }

    // 3. Mint CPC tokens to investor via viem
    let mintTxHash: string | undefined;
    try {
      const deployerKey = process.env.DEPLOYER_PRIVATE_KEY!;
      // Typecast required: env var string needs to be narrowed to viem's branded hex type
      const deployerKeyHex = (deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`) as `0x${string}`;
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

      // Typecast required: env var string needs to be narrowed to viem's branded hex type for address
      const tokenAddress = process.env.TOKEN_ADDRESS as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "mint",
        args: [investorAddress as `0x${string}`, parseEther(String(amount))],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      mintTxHash = receipt.transactionHash;
    } catch (mintErr: unknown) {
      // Mint failed after eUSD was already transferred — refund
      console.error("CPC mint failed, refunding eUSD...");
      try {
        const refundTx = await new TransferTransaction()
          .addTokenTransfer(eusdTokenId, treasuryAccountId, -eusdAmount)
          .addTokenTransfer(eusdTokenId, AccountId.fromString(walletInfo.accountId), eusdAmount)
          .freezeWith(client)
          .sign(getOperatorKey());

        const refundResult = await refundTx.execute(client);
        const refundReceipt = await refundResult.getReceipt(client);
        console.log(`eUSD refund: ${refundReceipt.status}`);
      } catch (refundErr: unknown) {
        const refundMsg = refundErr instanceof Error ? refundErr.message : "unknown";
        console.error(`eUSD refund FAILED: ${refundMsg} — manual intervention needed`);
      }
      const mintMsg = mintErr instanceof Error ? mintErr.message : "Mint failed";
      return NextResponse.json(
        { error: `CPC mint failed (eUSD refunded): ${mintMsg.slice(0, 150)}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      eusdTxId: transferResult.transactionId.toString(),
      mintTxHash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.close();
  }
}
