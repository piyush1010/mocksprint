import postgres from "postgres";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const globalForDb = globalThis;

function makeClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return postgres(process.env.DATABASE_URL, {
    prepare: false, // required for Supabase transaction pooler
    max: 3,
    idle_timeout: 20,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1") ? false : "require",
  });
}

export const sql = globalForDb.__msSql || (globalForDb.__msSql = makeClient());

export function newId(len = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

let ready = globalForDb.__msReady;

async function setup() {
  await sql`
    create table if not exists mentors (
      id text primary key,
      name text not null,
      email text unique not null,
      password_hash text not null,
      mcp_key text unique not null,
      created_at timestamptz default now()
    )`;
  await sql`
    create table if not exists tests (
      id text primary key,
      mentor_id text not null references mentors(id) on delete cascade,
      title text not null,
      topic text not null default '',
      duration_minutes int not null default 15,
      marks_correct numeric not null default 2,
      marks_wrong numeric not null default 0.66,
      questions jsonb not null default '[]',
      status text not null default 'draft',
      source text not null default 'claude',
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      published_at timestamptz
    )`;
  await sql`
    create table if not exists attempts (
      id text primary key,
      test_id text not null references tests(id) on delete cascade,
      student_name text not null,
      answers jsonb not null,
      score numeric not null,
      correct int not null,
      wrong int not null,
      unanswered int not null,
      time_taken_sec int not null,
      created_at timestamptz default now()
    )`;
  await sql`create index if not exists attempts_test_idx on attempts(test_id)`;
  await sql`create index if not exists tests_mentor_idx on tests(mentor_id)`;

  // Demo account for reviewers
  const email = (process.env.DEMO_EMAIL || "demo@mocksprint.in").toLowerCase();
  const [existing] = await sql`select id from mentors where email = ${email}`;
  if (!existing) {
    const hash = await bcrypt.hash(process.env.DEMO_PASSWORD || "MockSprint@2026", 10);
    await sql`
      insert into mentors (id, name, email, password_hash, mcp_key)
      values (${newId()}, ${"Demo Mentor"}, ${email}, ${hash}, ${process.env.DEMO_MCP_KEY || newId(24)})
      on conflict (email) do nothing`;
  }
}

export async function db() {
  if (!ready) {
    ready = setup().catch((e) => {
      ready = null;
      globalForDb.__msReady = null;
      throw e;
    });
    globalForDb.__msReady = ready;
  }
  await ready;
  return sql;
}

export function normalizeTest(row) {
  if (!row) return null;
  return {
    ...row,
    marks_correct: Number(row.marks_correct),
    marks_wrong: Number(row.marks_wrong),
    questions: Array.isArray(row.questions) ? row.questions : [],
  };
}
