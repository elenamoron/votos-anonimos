import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createQuestion, listQuestions } from "@/lib/questions";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const questions = await listQuestions(false);
  return NextResponse.json({ questions });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string;
    options?: string[];
    is_active?: boolean;
  } | null;

  if (!body?.title?.trim()) {
    return NextResponse.json(
      { error: "El título es obligatorio" },
      { status: 400 },
    );
  }

  const options = (body.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) {
    return NextResponse.json(
      { error: "Añade al menos dos opciones" },
      { status: 400 },
    );
  }

  const question = await createQuestion({
    title: body.title,
    description: body.description,
    options,
    is_active: body.is_active,
  });

  return NextResponse.json({ question }, { status: 201 });
}
