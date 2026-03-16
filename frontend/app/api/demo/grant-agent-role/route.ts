import { NextRequest, NextResponse } from "next/server";
import { getAddress, type Address } from "viem";
import { z } from "zod";
import { tokenAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getDeployerWalletClient, getServerPublicClient } from "@/lib/deployer";
import { verifyAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { investorAddress, message, signature } = parsed.data;

  let address: Address;
  try {
    address = getAddress(investorAddress);
  } catch {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    await verifyAuth(message, signature, address);
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 0, "Auth failed");
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
    const publicClient = getServerPublicClient();
    const walletClient = getDeployerWalletClient();

    // Check if already an agent
    const alreadyAgent = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.token,
      abi: tokenAbi,
      functionName: "isAgent",
      args: [address],
    });

    if (alreadyAgent) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }

    // Call token.addAgent(address) as deployer (owner)
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.token,
      abi: tokenAbi,
      functionName: "addAgent",
      args: [address],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: receipt.transactionHash });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Failed to grant agent role");
    // Handle race condition: addAgent reverts with "already has role" if
    // a concurrent request promoted the same address between our isAgent check and addAgent call
    if (message.includes("already has role")) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
