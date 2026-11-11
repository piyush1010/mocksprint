import { notFound } from "next/navigation";
import { db, normalizeTest } from "@/lib/db";
import TakeTest from "./TakeTest";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sql = await db();
  const [row] = await sql`select title from tests where id = ${id} and status = 'published'`;
  return { title: row ? `${row.title} · MockSprint` : "MockSprint" };
}

export default async function TestPage({ params }) {
  const { id } = await params;
  const sql = await db();
  const [row] = await sql`select t.*, m.name as mentor_name from tests t join mentors m on m.id = t.mentor_id where t.id = ${id}`;
  if (!row) notFound();
  if (row.status !== "published") {
    return (
      <main><div className="wrap" style={{ maxWidth: 560 }}>
        <div className="card"><h1>Not open yet</h1><p className="muted">This test hasn&rsquo;t been published by the mentor. Check back later.</p></div>
      </div></main>
    );
  }
  const test = normalizeTest(row);
  // Never send answer keys or explanations to the browser before submission.
  const safe = {
    id: test.id,
    title: test.title,
    topic: test.topic,
    mentor: row.mentor_name,
    duration_minutes: test.duration_minutes,
    marks_correct: test.marks_correct,
    marks_wrong: test.marks_wrong,
    questions: test.questions.map((q) => ({ question: q.question, options: q.options })),
  };
  return <TakeTest test={safe} />;
}
