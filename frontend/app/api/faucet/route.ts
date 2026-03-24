import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TokenMintTransaction, TransferTransaction, TokenId, AccountId } from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";
import { getErrorMessage } from "@/lib/format";
import { getHederaAccountId } from "@/lib/mirror-node";
import { parseRequestBody, normalizeAddress, requireEnv } from "@/lib/api-helpers";

const FAUCET_AMOUNT = 100_000; // 1,000.00 eUSD (2 decimals)

const faucetBodySchema = z.object({
  walletAddress: z.string().nonempty(),
});

export { faucetResponseSchema, type FaucetResponse } from "@/lib/api-schemas";

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, faucetBodySchema);
  if ("error" in bodyResult) return bodyResult.error;

  const addrResult = normalizeAddress(bodyResult.data.walletAddress);
  if ("error" in addrResult) return addrResult.error;
  const walletAddress = addrResult.address;

  const eusdEnv = requireEnv("EUSD_TOKEN_ID");
  if ("error" in eusdEnv) return eusdEnv.error;
  const eusdTokenId = eusdEnv.value;

  const accountEnv = requireEnv("HEDERA_ACCOUNT_ID");
  if ("error" in accountEnv) return accountEnv.error;
  const hederaAccountId = accountEnv.value;

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
  } finally {
    client.close();
  }
}
