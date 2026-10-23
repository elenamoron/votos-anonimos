import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteQuestion, updateQuestion } from "@/lib/questions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string;
    is_active?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    await updateQuestion(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await deleteQuestion(id);
  return NextResponse.json({ ok: true });
}
