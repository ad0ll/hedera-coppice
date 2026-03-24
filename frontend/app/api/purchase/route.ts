import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { EUSD_EVM_ADDRESS, CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
import { getErrorMessage, eusdFromRaw } from "@/lib/format";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";
import { parseRequestBody, recoverAddressOrError, requireEnv } from "@/lib/api-helpers";
import {
  ERC20_ABI,
  SECURITY_MINT_ABI,
  ATS_KYC_ABI,
  ATS_CONTROL_LIST_ABI,
  ATS_SSI_ABI,
  EUSD_DECIMALS,
} from "@/lib/abis";

const purchaseBodySchema = z.object({
  amount: z.number().positive(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export { purchaseResponseSchema, type PurchaseResponse } from "@/lib/api-schemas";

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, purchaseBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { amount, message, signature } = bodyResult.data;

  const authResult = recoverAddressOrError(message, signature);
  if ("error" in authResult) return authResult.error;
  const investor = authResult.address;

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

    // 3. Ensure investor has ATS KYC and is in the whitelist (control list)
    const cpcContract = new ethers.Contract(
      CPC_SECURITY_ID,
      [...ATS_KYC_ABI, ...ATS_CONTROL_LIST_ABI, ...ATS_SSI_ABI, ...SECURITY_MINT_ABI],
      wallet,
    );

    // 3a. Ensure deployer is registered as a KYC issuer (idempotent)
    const deployerIsIssuer: boolean = await cpcContract.isIssuer(wallet.address);
    if (!deployerIsIssuer) {
      const addIssuerTx = await cpcContract.addIssuer(wallet.address, {
        gasLimit: BigInt(300_000),
      });
      await addIssuerTx.wait();
    }

    // 3b. Grant KYC if not already granted (status 1 = granted)
    const kycStatus: bigint = await cpcContract.getKycStatusFor(investor);
    if (kycStatus !== BigInt(1)) {
      const now = Math.floor(Date.now() / 1000);
      const oneYearFromNow = now + 365 * 24 * 60 * 60;
      const kycTx = await cpcContract.grantKyc(
        investor,
        `vc-purchase-${investor.toLowerCase().slice(2, 10)}`,
        now,
        oneYearFromNow,
        wallet.address,
        { gasLimit: BigInt(300_000) },
      );
      await kycTx.wait();
    }

    // 3c. Add to control list (whitelist) if not already listed
    const isListed: boolean = await cpcContract.isInControlList(investor);
    if (!isListed) {
      const wlTx = await cpcContract.addToControlList(investor, {
        gasLimit: BigInt(300_000),
      });
      await wlTx.wait();
    }

    // 4. Mint CPC tokens to investor via ATS security contract
    let mintTxHash: string | undefined;
    try {
      const mintAmount = ethers.parseEther(String(amount));
      const mintTx = await cpcContract.issue(investor, mintAmount, "0x");
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
