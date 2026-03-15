import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  erc20Abi,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { tokenAbi } from "@coppice/abi";
import { MIRROR_NODE_URL, JSON_RPC_URL } from "@/lib/hedera";
import { hederaTestnet } from "@/lib/wagmi";
import { verifyAuth } from "@/lib/auth";
import { EUSD_EVM_ADDRESS } from "@/lib/constants";
import { withRetry } from "@/lib/retry";

const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

interface MirrorTokenEntry {
  token_id: string;
  balance: number;
}

async function getEusdBalance(accountId: string): Promise<number> {
  const eusdTokenId = process.env.EUSD_TOKEN_ID;
  if (!eusdTokenId) return 0;
  try {
    return await withRetry(async () => {
      const res = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${eusdTokenId}`,
      );
      if (!res.ok) throw new Error(`Mirror Node returned ${res.status}`);
      const data: { tokens?: MirrorTokenEntry[] } = await res.json();
      const entry = data.tokens?.find((t) => t.token_id === eusdTokenId);
      return entry ? entry.balance / 100 : 0;
    });
  } catch {
    return 0;
  }
}

function getDeployerAccount() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  }
  // Typecast required: env var string needs to be narrowed to viem's branded hex type for privateKeyToAccount
  const keyHex = (deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`) as `0x${string}`;
  return privateKeyToAccount(keyHex);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = purchaseBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { investorAddress, amount, message, signature } = parsed.data;

  let investor;
  try {
    investor = getAddress(investorAddress);
  } catch {
    return NextResponse.json({ error: "Invalid investor address" }, { status: 400 });
  }

  // Verify wallet signature — proves caller owns the investor wallet
  try {
    await verifyAuth(message, signature, investor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Auth failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const deployerAccount = getDeployerAccount();

    // 1. Check eUSD balance via Mirror Node (uses Hedera account ID format)
    // Look up the Hedera account ID from the EVM address
    const accountData = await withRetry(async () => {
      const accountRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${investor}`,
      );
      if (!accountRes.ok) throw new Error(`Mirror Node returned ${accountRes.status}`);
      return accountRes.json() as Promise<{ account: string }>;
    }).catch(() => null);
    if (!accountData) {
      return NextResponse.json(
        { error: "Could not look up investor account" },
        { status: 400 },
      );
    }
    const balance = await getEusdBalance(accountData.account);
    if (balance < amount) {
      return NextResponse.json(
        { error: `Insufficient eUSD: ${balance} < ${amount}` },
        { status: 400 },
      );
    }

    const walletClient = createWalletClient({
      account: deployerAccount,
      chain: hederaTestnet,
      transport: http(JSON_RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: hederaTestnet,
      transport: http(JSON_RPC_URL),
    });

    // 2. Transfer eUSD from investor to treasury via ERC-20 transferFrom
    // Investor must have already called eUSD.approve(deployerAddress, amount) client-side
    const eusdAmount = BigInt(Math.round(amount * 100)); // eUSD has 2 decimals
    const treasuryAddress = deployerAccount.address;

    const transferHash = await walletClient.writeContract({
      address: EUSD_EVM_ADDRESS,
      abi: erc20Abi,
      functionName: "transferFrom",
      args: [investor, treasuryAddress, eusdAmount],
      gas: BigInt(300_000),
    });

    const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
    if (transferReceipt.status !== "success") {
      return NextResponse.json(
        { error: "eUSD transfer failed — did you approve the spending amount?" },
        { status: 500 },
      );
    }

    // 3. Mint CPC tokens to investor via viem
    let mintTxHash: string | undefined;
    try {
      const tokenAddressRaw = process.env.TOKEN_ADDRESS;
      if (!tokenAddressRaw) {
        throw new Error("Missing TOKEN_ADDRESS");
      }
      const tokenAddress = getAddress(tokenAddressRaw);

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "mint",
        args: [investor, parseEther(String(amount))],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      mintTxHash = receipt.transactionHash;
    } catch (mintErr: unknown) {
      // Mint failed after eUSD was already transferred — refund via transfer back to investor
      console.error("CPC mint failed, refunding eUSD...");
      let refundSucceeded = false;
      try {
        const refundHash = await walletClient.writeContract({
          address: EUSD_EVM_ADDRESS,
          abi: erc20Abi,
          functionName: "transfer",
          args: [investor, eusdAmount],
          gas: BigInt(300_000),
        });
        const refundReceipt = await publicClient.waitForTransactionReceipt({ hash: refundHash });
        refundSucceeded = refundReceipt.status === "success";
        console.log(`eUSD refund: ${refundReceipt.status}`);
      } catch (refundErr: unknown) {
        const refundMsg = refundErr instanceof Error ? refundErr.message : "unknown";
        console.error(`eUSD refund FAILED: ${refundMsg} — manual intervention needed`);
      }
      const mintMsg = mintErr instanceof Error ? mintErr.message : "Mint failed";
      const refundStatus = refundSucceeded
        ? "eUSD refunded"
        : "eUSD refund FAILED — contact support";
      return NextResponse.json(
        { error: `CPC mint failed (${refundStatus}): ${mintMsg.slice(0, 150)}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      transferTxHash: transferReceipt.transactionHash,
      mintTxHash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 200) : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
