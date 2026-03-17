import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { z } from "zod";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { getDeployerWallet, getServerProvider } from "@/lib/deployer";
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

const tokenAbi = [
  "function isAgent(address account) view returns (bool)",
  "function addAgent(address account)",
];

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

  let address: string;
  try {
    address = ethers.getAddress(investorAddress);
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
    const provider = getServerProvider();
    const wallet = getDeployerWallet();
    const tokenContract = new ethers.Contract(CPC_SECURITY_ID, tokenAbi, wallet);
    const readOnlyContract = new ethers.Contract(CPC_SECURITY_ID, tokenAbi, provider);

    // Check if already an agent
    const alreadyAgent = await readOnlyContract.isAgent(address);

    if (alreadyAgent) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }

    // Call token.addAgent(address) as deployer (owner)
    const tx = await tokenContract.addAgent(address);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed");
    }

    return NextResponse.json({ success: true, txHash: receipt.hash });
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
