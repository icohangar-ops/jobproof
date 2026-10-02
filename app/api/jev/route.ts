import { NextResponse } from "next/server";
import { decideProof } from "@/lib/jev/client";
import { buildProofState, parseProofInput } from "@/lib/jev/jobproof";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 48_000;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY || /data:image|;base64,/i.test(text)) {
    return NextResponse.json({ error: "Send photo metadata only, not image bytes." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }
  const input = parseProofInput(body);
  if (!input) {
    return NextResponse.json({ error: "Expected photo and note metadata." }, { status: 400 });
  }
  const state = buildProofState(input);
  const aid = await decideProof(state, { env: process.env });
  return NextResponse.json(aid);
}
