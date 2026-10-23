import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/auth";
import { castVote } from "@/lib/questions";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    questionId?: string;
    optionId?: string;
  } | null;

  if (!body?.questionId || !body?.optionId) {
    return NextResponse.json(
      { error: "Faltan questionId u optionId" },
      { status: 400 },
    );
  }

  const deviceId = await getOrCreateDeviceId();
  const result = await castVote({
    deviceId,
    questionId: body.questionId,
    optionId: body.optionId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
