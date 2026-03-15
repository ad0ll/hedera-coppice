import { NextRequest, NextResponse } from "next/server";
import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera";

export async function POST(request: NextRequest) {
  const { project, category, amount, currency } = await request.json();

  if (
    !project ||
    typeof project !== "string" ||
    !category ||
    typeof category !== "string" ||
    !amount ||
    typeof amount !== "number"
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const impactTopicId = process.env.IMPACT_TOPIC_ID;
  if (!impactTopicId) {
    return NextResponse.json({ error: "IMPACT_TOPIC_ID not configured" }, { status: 500 });
  }

  const client = getClient();
  try {
    const operatorKey = getOperatorKey();

    const payload = {
      type: "PROCEEDS_ALLOCATED",
      ts: Date.now(),
      data: {
        project,
        category,
        amount: String(amount),
        currency: typeof currency === "string" ? currency : "USD",
      },
    };

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(impactTopicId))
      .setMessage(JSON.stringify(payload))
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
