import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { addOption } from "@/lib/questions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    label?: string;
  } | null;

  if (!body?.label?.trim()) {
    return NextResponse.json(
      { error: "La opción es obligatoria" },
      { status: 400 },
    );
  }

  try {
    const option = await addOption(id, body.label);
    return NextResponse.json({ option }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    throw e;
  }
}
