import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";

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

const BOND_ABI = [
  "function getCoupon(uint256 couponID) view returns (tuple(tuple(uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint8 rateDecimals, uint8 rateStatus) coupon, uint256 snapshotId))",
  "function takeSnapshot() returns (uint256)",
];

const LCCF_ABI = [
  "function executeDistribution(address asset, uint256 distributionID, uint256 pageIndex, uint256 pageLength) returns (address[], address[], uint256[], bool)",
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = distributeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { couponId, address, message: authMessage, signature } = parsed.data;

  const signerAddress = ethers.getAddress(address);

  try {
    await verifyAuth(authMessage, signature, signerAddress);
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const lccfAddress = process.env.LIFECYCLE_CASH_FLOW_ADDRESS;
  if (!lccfAddress) {
    return NextResponse.json(
      { error: "LIFECYCLE_CASH_FLOW_ADDRESS not configured" },
      { status: 500 },
    );
  }

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
