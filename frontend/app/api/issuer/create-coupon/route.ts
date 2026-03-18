import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, verifyAuthOrError } from "@/lib/api-helpers";
import { BOND_ABI } from "@/lib/abis";

const createCouponBodySchema = z.object({
  rate: z.number().positive(),
  startDate: z.string().nonempty(),
  recordDate: z.string().nonempty(),
  executionDate: z.string().nonempty(),
  endDate: z.string().nonempty(),
  address: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});
type CreateCouponBody = z.infer<typeof createCouponBodySchema>;

export const createCouponResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
  couponId: z.number(),
});
export type CreateCouponResponse = z.infer<typeof createCouponResponseSchema>;

/** Convert a percentage rate (e.g. 4.25) to ATS rate format (rate=425, rateDecimals=4). */
function convertRate(percentRate: number): { rate: number; rateDecimals: number } {
  // User enters 4.25% -> fraction 0.0425 -> rate=425, rateDecimals=4
  // Multiply by 100 to remove decimal places, set rateDecimals=4
  const rate = Math.round(percentRate * 100);
  return { rate, rateDecimals: 4 };
}

function toUnixTimestamp(isoString: string): number {
  const ms = new Date(isoString).getTime();
  if (isNaN(ms)) {
    throw new Error(`Invalid date: ${isoString}`);
  }
  return Math.floor(ms / 1000);
}

function validateDates(body: CreateCouponBody, nowSeconds: number): string | null {
  const start = toUnixTimestamp(body.startDate);
  const record = toUnixTimestamp(body.recordDate);
  const execution = toUnixTimestamp(body.executionDate);
  const end = toUnixTimestamp(body.endDate);

  if (start <= nowSeconds) {
    return "Start date must be in the future";
  }
  if (record <= start) {
    return "Record date must be after start date";
  }
  if (execution <= record) {
    return "Execution date must be after record date";
  }
  if (end <= start) {
    return "End date must be after start date";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, createCouponBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.data;

  const signerAddress = ethers.getAddress(body.address);

  const authError = await verifyAuthOrError(body.message, body.signature, signerAddress);
  if (authError) return authError;

  try {
    const wallet = getDeployerWallet();

    // Get current block timestamp for validation
    const block = await wallet.provider?.getBlock("latest");
    const nowSeconds = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

    const dateError = validateDates(body, nowSeconds);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const { rate, rateDecimals } = convertRate(body.rate);

    const recordDate = toUnixTimestamp(body.recordDate);
    const couponTuple = {
      recordDate,
      executionDate: toUnixTimestamp(body.executionDate),
      startDate: toUnixTimestamp(body.startDate),
      endDate: toUnixTimestamp(body.endDate),
      fixingDate: recordDate, // convention: fixingDate = recordDate
      rate,
      rateDecimals,
      rateStatus: 1, // SET/active
    };

    const bond = new ethers.Contract(CPC_SECURITY_ID, BOND_ABI, wallet);
    const tx = await bond.setCoupon(couponTuple, { gasLimit: BigInt(3_000_000) });
    const receipt = await tx.wait();

    // Get the new coupon count to determine the ID
    const couponCount = await bond.getCouponCount();
    const couponId = Number(couponCount);

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      couponId,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Create coupon failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
