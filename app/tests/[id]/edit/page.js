import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentMentor } from "@/lib/auth";
import { db, normalizeTest } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import { maxMarks, fmtTime } from "@/lib/score";
import Editor from "./Editor";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }) {
  const { id } = await params;
  const mentor = await currentMentor();
  if (!mentor) redirect("/login");
  const sql = await db();
  const [row] = await sql`select * from tests where id = ${id} and mentor_id = ${mentor.id}`;
  if (!row) notFound();
  const test = normalizeTest(row);
  const attempts = await sql`
    select student_name, score, correct, wrong, unanswered, time_taken_sec, created_at
    from attempts where test_id = ${id} order by score desc, time_taken_sec asc, created_at asc limit 50`;
  const base = await baseUrl();

  return (
    <main>
      <div className="wrap">
        <p className="small"><Link href="/dashboard">← All tests</Link></p>
        <Editor
          initial={{
            id: test.id,
            title: test.title,
            topic: test.topic,
            duration_minutes: test.duration_minutes,
            marks_correct: test.marks_correct,
            marks_wrong: test.marks_wrong,
            questions: test.questions,
            status: test.status,
            source: test.source,
          }}
          studentUrl={`${base}/t/${test.id}`}
          attemptCount={attempts.length}
        />

        <div className="card" id="results">
          <div className="row between">
            <h2>Results &amp; leaderboard</h2>
            <span className="small muted">{attempts.length} attempt{attempts.length === 1 ? "" : "s"} · out of {maxMarks(test)} marks</span>
          </div>
          {attempts.length === 0 ? (
            <p className="muted small">No attempts yet. Publish the test and share the student link.</p>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Score</th><th>✓ / ✗ / –</th><th>Time</th></tr></thead>
              <tbody>
                {attempts.map((a, i) => (
                  <tr key={i} className={i === 0 ? "rank1" : ""}>
                    <td>{i + 1}</td>
                    <td>{a.student_name}</td>
                    <td>{Number(a.score)}</td>
                    <td>{a.correct} / {a.wrong} / {a.unanswered}</td>
                    <td>{fmtTime(a.time_taken_sec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
