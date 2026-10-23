import { nanoid } from "nanoid";
import {
  ensureSchema,
  type Option,
  type Question,
  type QuestionWithOptions,
} from "./db";

export async function listQuestions(
  activeOnly = false,
): Promise<QuestionWithOptions[]> {
  const db = await ensureSchema();
  const result = activeOnly
    ? await db.execute(
        "SELECT * FROM questions WHERE is_active = 1 ORDER BY created_at DESC",
      )
    : await db.execute("SELECT * FROM questions ORDER BY created_at DESC");

  const questions = result.rows as unknown as Question[];
  if (questions.length === 0) return [];

  const ids = questions.map((q) => q.id);
  const placeholders = ids.map(() => "?").join(",");

  const optionsResult = await db.execute({
    sql: `SELECT * FROM options WHERE question_id IN (${placeholders}) ORDER BY sort_order ASC, label ASC`,
    args: ids,
  });
  const options = optionsResult.rows as unknown as Option[];

  const votesResult = await db.execute({
    sql: `SELECT option_id, COUNT(*) as count FROM votes WHERE question_id IN (${placeholders}) GROUP BY option_id`,
    args: ids,
  });

  const voteMap = new Map<string, number>();
  for (const row of votesResult.rows) {
    voteMap.set(String(row.option_id), Number(row.count));
  }

  return questions.map((q) => {
    const qOptions = options
      .filter((o) => o.question_id === q.id)
      .map((o) => ({
        ...o,
        votes: voteMap.get(o.id) ?? 0,
      }));
    const total_votes = qOptions.reduce((sum, o) => sum + o.votes, 0);
    return { ...q, options: qOptions, total_votes };
  });
}

export async function getVotedQuestionIds(
  deviceId: string,
): Promise<Set<string>> {
  const db = await ensureSchema();
  const result = await db.execute({
    sql: "SELECT question_id FROM ballots WHERE device_id = ?",
    args: [deviceId],
  });
  return new Set(result.rows.map((r) => String(r.question_id)));
}

export async function createQuestion(input: {
  title: string;
  description?: string;
  options: string[];
  is_active?: boolean;
}): Promise<QuestionWithOptions> {
  const db = await ensureSchema();
  const id = nanoid(12);
  const created_at = new Date().toISOString();
  const is_active = input.is_active ? 1 : 0;

  await db.execute({
    sql: "INSERT INTO questions (id, title, description, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, input.title.trim(), (input.description ?? "").trim(), is_active, created_at],
  });

  const optionRows = input.options
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: nanoid(12),
      question_id: id,
      label,
      sort_order: index,
    }));

  for (const opt of optionRows) {
    await db.execute({
      sql: "INSERT INTO options (id, question_id, label, sort_order) VALUES (?, ?, ?, ?)",
      args: [opt.id, opt.question_id, opt.label, opt.sort_order],
    });
  }

  const list = await listQuestions();
  return list.find((q) => q.id === id)!;
}

export async function updateQuestion(
  id: string,
  input: { title?: string; description?: string; is_active?: boolean },
): Promise<void> {
  const db = await ensureSchema();
  const existing = await db.execute({
    sql: "SELECT * FROM questions WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    throw new Error("NOT_FOUND");
  }

  const row = existing.rows[0];
  const title =
    input.title !== undefined ? input.title.trim() : String(row.title);
  const description =
    input.description !== undefined
      ? input.description.trim()
      : String(row.description);
  const is_active =
    input.is_active !== undefined
      ? input.is_active
        ? 1
        : 0
      : Number(row.is_active);

  await db.execute({
    sql: "UPDATE questions SET title = ?, description = ?, is_active = ? WHERE id = ?",
    args: [title, description, is_active, id],
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({
    sql: "DELETE FROM votes WHERE question_id = ?",
    args: [id],
  });
  await db.execute({
    sql: "DELETE FROM ballots WHERE question_id = ?",
    args: [id],
  });
  await db.execute({
    sql: "DELETE FROM options WHERE question_id = ?",
    args: [id],
  });
  await db.execute({
    sql: "DELETE FROM questions WHERE id = ?",
    args: [id],
  });
}

export async function addOption(
  questionId: string,
  label: string,
): Promise<Option> {
  const db = await ensureSchema();
  const q = await db.execute({
    sql: "SELECT id FROM questions WHERE id = ?",
    args: [questionId],
  });
  if (q.rows.length === 0) throw new Error("NOT_FOUND");

  const maxOrder = await db.execute({
    sql: "SELECT COALESCE(MAX(sort_order), -1) as m FROM options WHERE question_id = ?",
    args: [questionId],
  });
  const sort_order = Number(maxOrder.rows[0]?.m ?? -1) + 1;
  const id = nanoid(12);
  const trimmed = label.trim();

  await db.execute({
    sql: "INSERT INTO options (id, question_id, label, sort_order) VALUES (?, ?, ?, ?)",
    args: [id, questionId, trimmed, sort_order],
  });

  return { id, question_id: questionId, label: trimmed, sort_order };
}

export async function deleteOption(optionId: string): Promise<void> {
  const db = await ensureSchema();
  await db.execute({
    sql: "DELETE FROM votes WHERE option_id = ?",
    args: [optionId],
  });
  await db.execute({
    sql: "DELETE FROM options WHERE id = ?",
    args: [optionId],
  });
}

export async function castVote(input: {
  deviceId: string;
  questionId: string;
  optionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await ensureSchema();

  const question = await db.execute({
    sql: "SELECT * FROM questions WHERE id = ? AND is_active = 1",
    args: [input.questionId],
  });
  if (question.rows.length === 0) {
    return { ok: false, error: "La pregunta no está activa" };
  }

  const option = await db.execute({
    sql: "SELECT * FROM options WHERE id = ? AND question_id = ?",
    args: [input.optionId, input.questionId],
  });
  if (option.rows.length === 0) {
    return { ok: false, error: "Opción no válida" };
  }

  const existing = await db.execute({
    sql: "SELECT 1 FROM ballots WHERE device_id = ? AND question_id = ?",
    args: [input.deviceId, input.questionId],
  });
  if (existing.rows.length > 0) {
    return { ok: false, error: "Ya has votado en esta pregunta" };
  }

  const now = new Date().toISOString();
  const voteId = nanoid(16);

  try {
    await db.batch(
      [
        {
          sql: "INSERT INTO ballots (device_id, question_id, created_at) VALUES (?, ?, ?)",
          args: [input.deviceId, input.questionId, now],
        },
        {
          sql: "INSERT INTO votes (id, question_id, option_id, created_at) VALUES (?, ?, ?, ?)",
          args: [voteId, input.questionId, input.optionId, now],
        },
      ],
      "write",
    );
  } catch {
    return { ok: false, error: "Ya has votado en esta pregunta" };
  }

  return { ok: true };
}
