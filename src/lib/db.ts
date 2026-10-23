import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "fs";
import { dirname, join } from "path";

let client: Client | null = null;
let initialized = false;

function resolveDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.DATABASE_URL?.startsWith("libsql:")) {
    return process.env.DATABASE_URL;
  }
  // Keep path statically scoped under /data for Turbopack/Next tracing
  const absolute = join(process.cwd(), "data", "votos.db");
  mkdirSync(dirname(absolute), { recursive: true });
  return `file:${absolute}`;
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: resolveDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureSchema(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS options (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        option_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ballots (
        device_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (device_id, question_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id)`,
      `CREATE INDEX IF NOT EXISTS idx_votes_question ON votes(question_id)`,
      `CREATE INDEX IF NOT EXISTS idx_votes_option ON votes(option_id)`,
    ],
    "write",
  );

  initialized = true;
  return db;
}

export type Question = {
  id: string;
  title: string;
  description: string;
  is_active: number;
  created_at: string;
};

export type Option = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

export type OptionWithVotes = Option & {
  votes: number;
};

export type QuestionWithOptions = Question & {
  options: OptionWithVotes[];
  total_votes: number;
};
