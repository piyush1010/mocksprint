"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, newId, normalizeTest } from "@/lib/db";
import { setSession, clearSession, currentMentor } from "@/lib/auth";
import { scoreAttempt } from "@/lib/score";

// ---------- Accounts ----------
export async function login(_prev, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const sql = await db();
  const [m] = await sql`select id, password_hash from mentors where email = ${email}`;
  if (!m || !(await bcrypt.compare(password, m.password_hash))) {
    return { error: "Wrong email or password." };
  }
  await setSession(m.id);
  redirect("/dashboard");
}

export async function signup(_prev, formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const sql = await db();
  const [exists] = await sql`select id from mentors where email = ${email}`;
  if (exists) return { error: "An account with this email already exists. Log in instead." };
  const id = newId();
  await sql`insert into mentors (id, name, email, password_hash, mcp_key)
            values (${id}, ${name}, ${email}, ${await bcrypt.hash(password, 10)}, ${newId(24)})`;
  await setSession(id);
  redirect("/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

// ---------- Mentor: tests ----------
async function ownTest(id) {
  const mentor = await currentMentor();
  if (!mentor) throw new Error("Please log in again.");
  const sql = await db();
  const [row] = await sql`select * from tests where id = ${id} and mentor_id = ${mentor.id}`;
  if (!row) throw new Error("Test not found.");
  return { sql, test: normalizeTest(row) };
}

function cleanTest(data) {
  const errors = [];
  const title = String(data.title || "").trim();
  if (title.length < 3) errors.push("Title is too short.");
  const duration = Math.round(Number(data.duration_minutes));
  if (!(duration >= 1 && duration <= 180)) errors.push("Duration must be 1 to 180 minutes.");
  const mc = Number(data.marks_correct);
  const mw = Number(data.marks_wrong);
  if (!(mc > 0 && mc <= 10)) errors.push("Marks for a correct answer must be between 0 and 10.");
  if (!(mw >= 0 && mw <= 10)) errors.push("Negative marks must be between 0 and 10.");
  const questions = (Array.isArray(data.questions) ? data.questions : []).map((q, i) => {
    const question = String(q.question || "").trim();
    const options = (q.options || []).slice(0, 4).map((o) => String(o || "").trim());
    while (options.length < 4) options.push("");
    const correct = Number(q.correct);
    if (!question) errors.push(`Question ${i + 1} has no text.`);
    if (options.some((o) => !o)) errors.push(`Question ${i + 1} needs all four options.`);
    if (!(correct >= 0 && correct <= 3)) errors.push(`Question ${i + 1} needs a correct answer.`);
    return { question, options, correct, explanation: String(q.explanation || "").trim() };
  });
  if (questions.length === 0) errors.push("Add at least one question.");
  return {
    errors,
    value: { title, topic: String(data.topic || "").trim(), duration_minutes: duration, marks_correct: mc, marks_wrong: mw, questions },
  };
}

export async function saveTest(id, data) {
  try {
    const { sql, test } = await ownTest(id);
    const { errors, value } = cleanTest(data);
    if (errors.length) return { error: errors.slice(0, 4).join(" ") };
    // Editing a reviewed test sends it back to draft so it gets checked again.
    const status = test.status === "reviewed" ? "draft" : test.status;
    await sql`update tests set title = ${value.title}, topic = ${value.topic}, duration_minutes = ${value.duration_minutes},
              marks_correct = ${value.marks_correct}, marks_wrong = ${value.marks_wrong}, questions = ${sql.json(value.questions)},
              status = ${status}, updated_at = now() where id = ${id}`;
    revalidatePath(`/tests/${id}/edit`);
    return { ok: true, status, message: test.status === "reviewed" ? "Saved. Edits moved the test back to Draft, so review it again." : "Saved." };
  } catch (e) {
    return { error: e.message };
  }
}

export async function setStatus(id, next) {
  try {
    const { sql, test } = await ownTest(id);
    const allowed = { draft: ["reviewed"], reviewed: ["published", "draft"], published: ["draft"] };
    if (!(allowed[test.status] || []).includes(next)) return { error: `Can't move from ${test.status} to ${next}.` };
    if (next === "published") {
      await sql`update tests set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where id = ${id}`;
    } else {
      await sql`update tests set status = ${next}, updated_at = now() where id = ${id}`;
    }
    revalidatePath(`/tests/${id}/edit`);
    revalidatePath("/dashboard");
    return { ok: true, status: next };
  } catch (e) {
    return { error: e.message };
  }
}

export async function createBlankTest() {
  const mentor = await currentMentor();
  if (!mentor) redirect("/login");
  const sql = await db();
  const id = newId(8);
  const questions = [{ question: "", options: ["", "", "", ""], correct: 0, explanation: "" }];
  await sql`insert into tests (id, mentor_id, title, topic, questions, status, source)
            values (${id}, ${mentor.id}, ${"Untitled test"}, ${""}, ${sql.json(questions)}, 'draft', 'manual')`;
  redirect(`/tests/${id}/edit`);
}

export async function deleteTest(id) {
  const { sql } = await ownTest(id);
  await sql`delete from tests where id = ${id}`;
  redirect("/dashboard");
}

// ---------- Students ----------
export async function submitAttempt(testId, name, answers, timeTakenSec) {
  const studentName = String(name || "").trim().slice(0, 60);
  if (!studentName) return { error: "Please enter your name." };
  const sql = await db();
  const [row] = await sql`select * from tests where id = ${testId} and status = 'published'`;
  if (!row) return { error: "This test is not available right now." };
  const test = normalizeTest(row);
  const clean = test.questions.map((_, i) => {
    const a = answers?.[i];
    return a === null || a === undefined || a === "" ? null : Math.max(0, Math.min(3, Number(a)));
  });
  const { correct, wrong, unanswered, score } = scoreAttempt(test, clean);
  const limit = test.duration_minutes * 60;
  const taken = Number(timeTakenSec);
  const time = Number.isFinite(taken) ? Math.max(1, Math.min(limit, Math.round(taken))) : limit;
  const id = newId(10);
  await sql`insert into attempts (id, test_id, student_name, answers, score, correct, wrong, unanswered, time_taken_sec)
            values (${id}, ${testId}, ${studentName}, ${sql.json(clean)}, ${score}, ${correct}, ${wrong}, ${unanswered}, ${time})`;
  return { ok: true, attemptId: id };
}

export async function removeAttempt(testId, attemptId) {
  try {
    const { sql } = await ownTest(testId);
    await sql`delete from attempts where id = ${attemptId} and test_id = ${testId}`;
    revalidatePath(`/tests/${testId}/edit`);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}
