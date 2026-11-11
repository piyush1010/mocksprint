import { notFound } from "next/navigation";
import { db, normalizeTest } from "@/lib/db";
import { maxMarks, fmtTime } from "@/lib/score";
import MadeWith from "@/app/MadeWith";

export const dynamic = "force-dynamic";
const LETTERS = ["A", "B", "C", "D"];

export default async function ResultPage({ params }) {
  const { id, attemptId } = await params;
  const sql = await db();
  const [row] = await sql`select * from tests where id = ${id}`;
  const [att] = await sql`select * from attempts where id = ${attemptId} and test_id = ${id}`;
  if (!row || !att) notFound();
  const test = normalizeTest(row);
  const board = await sql`
    select id, student_name, score, time_taken_sec from attempts where test_id = ${id}
    order by score desc, time_taken_sec asc, created_at asc`;
  const rank = board.findIndex((b) => b.id === att.id) + 1;
  const answers = Array.isArray(att.answers) ? att.answers : [];

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="card">
          <p className="small muted">{test.title}</p>
          <h1>{att.student_name}, you scored {Number(att.score)} / {maxMarks(test)}</h1>
          <div className="grid3" style={{ marginTop: 14 }}>
            <div className="stat"><b>#{rank}</b><span className="small muted">of {board.length}</span></div>
            <div className="stat"><b>{att.correct} / {att.wrong} / {att.unanswered}</b><span className="small muted">correct / wrong / blank</span></div>
            <div className="stat"><b>{fmtTime(att.time_taken_sec)}</b><span className="small muted">time taken</span></div>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Scoring: +{test.marks_correct} per correct, −{test.marks_wrong} per wrong. Negative marking cost you {Math.round(att.wrong * test.marks_wrong * 100) / 100} marks.
          </p>
        </div>

        <div className="card">
          <h2>Leaderboard</h2>
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Time</th></tr></thead>
            <tbody>
              {board.slice(0, 20).map((b, i) => (
                <tr key={b.id} style={b.id === att.id ? { background: "var(--brand-soft)", fontWeight: 700 } : undefined}>
                  <td>{i + 1}</td><td>{b.student_name}{b.id === att.id ? " (you)" : ""}</td><td>{Number(b.score)}</td><td>{fmtTime(b.time_taken_sec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Answer review</h2>
        {test.questions.map((q, i) => {
          const a = answers[i];
          return (
            <div className="q" key={i}>
              <div><span className="qnum">Q{i + 1}.</span>{q.question}</div>
              {q.options.map((o, k) => (
                <div key={k} className={`opt ${k === q.correct ? "right" : a === k ? "wrong" : ""}`} style={{ cursor: "default" }}>
                  <span><b>{LETTERS[k]}.</b> {o}{k === q.correct ? " ✓" : a === k ? " (your answer)" : ""}</span>
                </div>
              ))}
              {a === null && <div className="small muted" style={{ marginTop: 6 }}>Not answered</div>}
              {q.explanation && <div className="small" style={{ marginTop: 8 }}><b>Why:</b> {q.explanation}</div>}
            </div>
          );
        })}
        <MadeWith />
      </div>
    </main>
  );
}
