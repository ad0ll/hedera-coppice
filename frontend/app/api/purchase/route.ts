import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { EUSD_EVM_ADDRESS, CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
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

const ERC20_ABI = [
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// ATS Security mint ABI — the diamond proxy's ERC1400 facet
const SECURITY_MINT_ABI = [
  "function mint(address to, uint256 value) external",
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = purchaseBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { investorAddress, amount, message, signature } = parsed.data;

  const investor = ethers.getAddress(investorAddress);

  try {
    await verifyAuth(message, signature, investor);
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    // 1. Check eUSD balance via Mirror Node
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

    const wallet = getDeployerWallet();

    // 2. Transfer eUSD from investor to treasury via ERC-20 transferFrom
    const eusdContract = new ethers.Contract(EUSD_EVM_ADDRESS, ERC20_ABI, wallet);
    const eusdAmount = BigInt(Math.round(amount * 100)); // eUSD has 2 decimals
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
      const mintTx = await securityContract.mint(investor, mintAmount);
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
