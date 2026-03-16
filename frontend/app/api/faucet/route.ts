import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { z } from "zod";
import { TokenMintTransaction, TransferTransaction, TokenId, AccountId } from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";
import { getErrorMessage } from "@/lib/format";
import { getHederaAccountId } from "@/lib/mirror-node";

const FAUCET_AMOUNT = 100_000; // 1,000.00 eUSD (2 decimals)

const faucetBodySchema = z.object({
  walletAddress: z.string().nonempty(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = faucetBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let walletAddress;
  try {
    walletAddress = getAddress(parsed.data.walletAddress);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const eusdTokenId = process.env.EUSD_TOKEN_ID;
  if (!eusdTokenId) {
    return NextResponse.json({ error: "EUSD_TOKEN_ID not configured" }, { status: 500 });
  }

  const hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
  if (!hederaAccountId) {
    return NextResponse.json({ error: "HEDERA_ACCOUNT_ID not configured" }, { status: 500 });
  }

  // Resolve EVM address to Hedera account ID for the transfer
  let recipientAccountId: string;
  try {
    recipientAccountId = await getHederaAccountId(walletAddress);
  } catch {
    return NextResponse.json(
      { error: "Could not resolve wallet to Hedera account — is the wallet funded with HBAR?" },
      { status: 400 },
    );
  }

  const client = getClient();
  try {
    // Mint fresh eUSD to treasury
    const mintTx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(eusdTokenId))
      .setAmount(FAUCET_AMOUNT);
    const mintResult = await mintTx.execute(client);
    await mintResult.getReceipt(client);

    // Transfer from treasury to recipient
    const transferTx = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(eusdTokenId), AccountId.fromString(hederaAccountId), -FAUCET_AMOUNT)
      .addTokenTransfer(TokenId.fromString(eusdTokenId), AccountId.fromString(recipientAccountId), FAUCET_AMOUNT);
    const transferResult = await transferTx.execute(client);
    await transferResult.getReceipt(client);

    return NextResponse.json({ success: true, amount: 1000 });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Faucet failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
