import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/auth";
import { getVotedQuestionIds, listQuestions } from "@/lib/questions";

export async function GET() {
  const deviceId = await getOrCreateDeviceId();
  const questions = await listQuestions(true);
  const voted = await getVotedQuestionIds(deviceId);

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        sort_order: o.sort_order,
      })),
      hasVoted: voted.has(q.id),
    })),
  });
}
