import { NextRequest, NextResponse } from "next/server";
import {
  parseEther,
  erc20Abi,
  getAddress,
} from "viem";
import { z } from "zod";
import { tokenAbi } from "@coppice/common";
import { verifyAuth } from "@/lib/auth";
import { EUSD_EVM_ADDRESS } from "@/lib/constants";
import { getDeployerAccount, getDeployerWalletClient, getServerPublicClient } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";

const purchaseBodySchema = z.object({
  investorAddress: z.string().nonempty(),
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const purchaseResponseSchema = z.object({
  success: z.literal(true),
  transferTxHash: z.string(),
  mintTxHash: z.string(),
});
export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;

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
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const deployerAccount = getDeployerAccount();

    // 1. Check eUSD balance via Mirror Node (uses Hedera account ID format)
    const eusdTokenId = process.env.EUSD_TOKEN_ID;
    if (!eusdTokenId) {
      return NextResponse.json({ error: "EUSD_TOKEN_ID not configured" }, { status: 500 });
    }
    let accountId: string;
    try {
      accountId = await getHederaAccountId(investor);
    } catch {
      return NextResponse.json(
        { error: "Could not look up investor account" },
        { status: 400 },
      );
    }
    const rawBalance = await getHtsTokenBalance(accountId, eusdTokenId);
    const balance = rawBalance / 100; // eUSD has 2 decimals
    if (balance < amount) {
      return NextResponse.json(
        { error: `Insufficient eUSD: ${balance} < ${amount}` },
        { status: 400 },
      );
    }

    const walletClient = getDeployerWalletClient();
    const publicClient = getServerPublicClient();

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
        const refundMsg = getErrorMessage(refundErr, 0, "unknown");
        console.error(`eUSD refund FAILED: ${refundMsg} — manual intervention needed`);
      }
      const mintMsg = getErrorMessage(mintErr, 150, "Mint failed");
      const refundStatus = refundSucceeded
        ? "eUSD refunded"
        : "eUSD refund FAILED — contact support";
      return NextResponse.json(
        { error: `CPC mint failed (${refundStatus}): ${mintMsg}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      transferTxHash: transferReceipt.transactionHash,
      mintTxHash,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Purchase failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
