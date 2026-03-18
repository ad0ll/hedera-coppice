import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet, getServerProvider } from "@/lib/deployer";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, verifyAuthOrError, normalizeAddress } from "@/lib/api-helpers";
import { ROLES, ACCESS_CONTROL_ABI } from "@/lib/abis";

const bodySchema = z.object({
  investorAddress: z.string().nonempty(),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const grantAgentRoleResponseSchema = z.object({
  success: z.literal(true),
  txHash: z.string(),
});
export type GrantAgentRoleResponse = z.infer<typeof grantAgentRoleResponseSchema>;

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, bodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { investorAddress, message, signature } = bodyResult.data;

  const addrResult = normalizeAddress(investorAddress);
  if ("error" in addrResult) return addrResult.error;
  const address = addrResult.address;

  const authError = await verifyAuthOrError(message, signature, address);
  if (authError) return authError;

  try {
    const provider = getServerProvider();
    const wallet = getDeployerWallet();
    const tokenContract = new ethers.Contract(CPC_SECURITY_ID, ACCESS_CONTROL_ABI, wallet);
    const readOnlyContract = new ethers.Contract(CPC_SECURITY_ID, ACCESS_CONTROL_ABI, provider);

    // Check if already an agent
    const alreadyAgent = await readOnlyContract.hasRole(ROLES.AGENT, address);

    if (alreadyAgent) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }

    // Call token.grantRole(ROLES.AGENT, address) as deployer (admin)
    const tx = await tokenContract.grantRole(ROLES.AGENT, address);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed");
    }

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Failed to grant agent role");
    // Handle race condition: grantRole reverts with "already has role" if
    // a concurrent request promoted the same address between our hasRole check and grantRole call
    if (message.includes("already has role")) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
