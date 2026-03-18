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

const AGENT_ROLE = "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6";

const accessControlAbi = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
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
    const tokenContract = new ethers.Contract(CPC_SECURITY_ID, accessControlAbi, wallet);
    const readOnlyContract = new ethers.Contract(CPC_SECURITY_ID, accessControlAbi, provider);

    // Check if already an agent
    const alreadyAgent = await readOnlyContract.hasRole(AGENT_ROLE, address);

    if (alreadyAgent) {
      return NextResponse.json({ error: "Address is already an agent" }, { status: 409 });
    }

    // Call token.grantRole(AGENT_ROLE, address) as deployer (admin)
    const tx = await tokenContract.grantRole(AGENT_ROLE, address);
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
