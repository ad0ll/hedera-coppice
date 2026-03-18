import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { EUSD_EVM_ADDRESS, CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
import { getErrorMessage, eusdFromRaw } from "@/lib/format";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";
import { parseRequestBody, verifyAuthOrError, requireEnv } from "@/lib/api-helpers";
import { ERC20_ABI, SECURITY_MINT_ABI, EUSD_DECIMALS } from "@/lib/abis";

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
  const bodyResult = await parseRequestBody(request, purchaseBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { investorAddress, amount, message, signature } = bodyResult.data;

  const investor = ethers.getAddress(investorAddress);

  const authError = await verifyAuthOrError(message, signature, investor);
  if (authError) return authError;

  try {
    // 1. Check eUSD balance via Mirror Node
    const eusdEnv = requireEnv("EUSD_TOKEN_ID");
    if ("error" in eusdEnv) return eusdEnv.error;
    const eusdTokenId = eusdEnv.value;
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
    const balance = eusdFromRaw(rawBalance);
    if (balance < amount) {
      return NextResponse.json(
        { error: `Insufficient eUSD: ${balance} < ${amount}` },
        { status: 400 },
      );
    }

    const wallet = getDeployerWallet();

    // 2. Transfer eUSD from investor to treasury via ERC-20 transferFrom
    const eusdContract = new ethers.Contract(EUSD_EVM_ADDRESS, ERC20_ABI, wallet);
    const eusdAmount = BigInt(Math.round(amount * 10 ** EUSD_DECIMALS));
    const treasuryAddress = wallet.address;

    const transferTx = await eusdContract.transferFrom(investor, treasuryAddress, eusdAmount, {
      gasLimit: BigInt(300_000),
    });
    const transferReceipt = await transferTx.wait();
    if (!transferReceipt || transferReceipt.status !== 1) {
      return NextResponse.json(
        { error: "eUSD transfer failed — did you approve the spending amount?" },
        { status: 500 },
      );
    }

    // 3. Mint CPC tokens to investor via ATS security contract
    let mintTxHash: string | undefined;
    try {
      const securityContract = new ethers.Contract(CPC_SECURITY_ID, SECURITY_MINT_ABI, wallet);
      const mintAmount = ethers.parseEther(String(amount));
      const mintTx = await securityContract.issue(investor, mintAmount, "0x");
      const mintReceipt = await mintTx.wait();
      mintTxHash = mintReceipt?.hash;
    } catch (mintErr: unknown) {
      // Mint failed after eUSD was already transferred — refund
      console.error("CPC mint failed, refunding eUSD...");
      let refundSucceeded = false;
      try {
        const refundTx = await eusdContract.transfer(investor, eusdAmount, {
          gasLimit: BigInt(300_000),
        });
        const refundReceipt = await refundTx.wait();
        refundSucceeded = refundReceipt?.status === 1;
        console.log(`eUSD refund: ${refundReceipt?.status === 1 ? "success" : "reverted"}`);
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
      transferTxHash: transferReceipt.hash,
      mintTxHash,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Purchase failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
