import { NextResponse } from "next/server";
import { fetchGuardianData } from "@/lib/guardian-data";

export async function GET() {
  try {
    const data = await fetchGuardianData();
    if (!data) {
      return NextResponse.json(
        { error: "GUARDIAN_POLICY_ID not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Guardian API error:", message);
    return NextResponse.json(
      { error: "Guardian API unavailable", detail: message },
      { status: 503 },
    );
  }
}
