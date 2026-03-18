import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, verifyAuthOrError, requireEnv } from "@/lib/api-helpers";
import { BOND_ABI, LCCF_ABI } from "@/lib/abis";

const distributeBodySchema = z.object({
  couponId: z.number().int().nonnegative(),
  address: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const distributeResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
  status: z.string(),
});
export type DistributeResponse = z.infer<typeof distributeResponseSchema>;

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, distributeBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { couponId, address, message: authMessage, signature } = bodyResult.data;

  const signerAddress = ethers.getAddress(address);

  const authError = await verifyAuthOrError(authMessage, signature, signerAddress);
  if (authError) return authError;

  const lccfEnv = requireEnv("LIFECYCLE_CASH_FLOW_ADDRESS");
  if ("error" in lccfEnv) return lccfEnv.error;
  const lccfAddress = lccfEnv.value;

  try {
    const wallet = getDeployerWallet();

    const bond = new ethers.Contract(CPC_SECURITY_ID, BOND_ABI, wallet);
    const lccf = new ethers.Contract(lccfAddress, LCCF_ABI, wallet);

    // Check coupon state — verify execution date has passed
    const couponData = await bond.getCoupon(couponId);
    const executionDate = Number(couponData.coupon.executionDate);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (executionDate > nowSeconds) {
      return NextResponse.json(
        { error: `Coupon execution date has not passed (${executionDate} > ${nowSeconds})` },
        { status: 400 },
      );
    }

    // If snapshotId is 0, take a snapshot first
    const snapshotId = Number(couponData.snapshotId);
    if (snapshotId === 0) {
      const snapshotTx = await bond.takeSnapshot({ gasLimit: BigInt(3_000_000) });
      await snapshotTx.wait();
    }

    // Execute the coupon distribution via LCCF
    const distributeTx = await lccf.executeDistribution(
      CPC_SECURITY_ID,
      couponId,
      0,
      100,
      { gasLimit: BigInt(10_000_000) },
    );
    const receipt = await distributeTx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      status: "DISTRIBUTED",
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Distribution failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
