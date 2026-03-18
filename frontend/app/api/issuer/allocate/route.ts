import { NextRequest, NextResponse } from "next/server";
import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { z } from "zod";
import { getClient, getOperatorKey } from "@/lib/hedera";
import { getErrorMessage } from "@/lib/format";
import { parseRequestBody, recoverAddressOrError, requireEnv } from "@/lib/api-helpers";

const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty(),
  signature: z.string().nonempty(),
});

export const allocateResponseSchema = z.object({
  success: z.literal(true),
  status: z.string(),
});
export type AllocateResponse = z.infer<typeof allocateResponseSchema>;

export async function POST(request: NextRequest) {
  const bodyResult = await parseRequestBody(request, allocateBodySchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { project, category, amount, currency, message: authMessage, signature } = bodyResult.data;

  // Recover wallet address from signature — any agent can allocate proceeds (frontend gates via useIsAgent)
  const authResult = recoverAddressOrError(authMessage, signature);
  if ("error" in authResult) return authResult.error;

  const topicEnv = requireEnv("IMPACT_TOPIC_ID");
  if ("error" in topicEnv) return topicEnv.error;
  const impactTopicId = topicEnv.value;

  // Check HCS message size before submitting
  const payload = {
    type: "PROCEEDS_ALLOCATED",
    ts: Date.now(),
    data: {
      project,
      category,
      amount: String(amount),
      currency,
    },
  };

  const messageStr = JSON.stringify(payload);
  if (Buffer.byteLength(messageStr) > 1024) {
    return NextResponse.json(
      { error: "Payload too large for HCS (>1KB). Shorten the project name or category." },
      { status: 400 },
    );
  }

  const client = getClient();
  try {
    const operatorKey = getOperatorKey();

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(impactTopicId))
      .setMessage(messageStr)
      .freezeWith(client)
      .sign(operatorKey);

    const result = await tx.execute(client);
    const receipt = await result.getReceipt(client);

    return NextResponse.json({ success: true, status: receipt.status.toString() });
  } catch (err: unknown) {
    const message = getErrorMessage(err, 200, "Allocation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.close();
  }
}
