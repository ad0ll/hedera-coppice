import { NextRequest, NextResponse } from "next/server";
import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { z } from "zod";
import { getClient, getOperatorKey } from "@/lib/hedera";
import { verifyAuth } from "@/lib/auth";

const allocateBodySchema = z.object({
  project: z.string().nonempty(),
  category: z.string().nonempty(),
  amount: z.number().positive(),
  currency: z.string().optional().default("USD"),
  message: z.string().nonempty().optional(),
  signature: z.string().nonempty().optional(),
});

type AllocateBody = z.infer<typeof allocateBodySchema>;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = allocateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const { project, category, amount, currency, message: authMessage, signature } = parsed.data;

  // Verify wallet signature — only the deployer (issuer) can allocate proceeds
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  if (!deployerAddress) {
    return NextResponse.json({ error: "DEPLOYER_ADDRESS not configured" }, { status: 500 });
  }
  if (!authMessage || !signature) {
    return NextResponse.json({ error: "Missing authentication signature" }, { status: 401 });
  }
  try {
    await verifyAuth(authMessage, signature, deployerAddress);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Auth failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const impactTopicId = process.env.IMPACT_TOPIC_ID;
  if (!impactTopicId) {
    return NextResponse.json({ error: "IMPACT_TOPIC_ID not configured" }, { status: 500 });
  }

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
    const message = err instanceof Error ? err.message.slice(0, 200) : "Allocation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.close();
  }
}
