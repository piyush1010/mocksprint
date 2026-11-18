import { notFound } from "next/navigation";
import { db, normalizeTest } from "@/lib/db";
import { maxMarks, fmtTime, scoreAttempt, qualifies, qType, judge } from "@/lib/score";
import { examLabel } from "@/lib/exams";
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
  const re = scoreAttempt(test, answers);
  // Section breakdown is recomputed from the current test; only show it if the test hasn't changed since.
  const showSections = re.sections.length > 0 && re.score === Number(att.score);
  const qual = qualifies(test, Number(att.score));
  const negLoss = Math.round(answers.reduce((s, a, i) => s + (test.questions[i] && qType(test.questions[i]) === "mcq" && judge(test.questions[i], a) === "wrong" ? test.marks_wrong : 0), 0) * 100) / 100;

  return (
    <main>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="card">
          <p className="small muted">{test.title}{test.exam !== "custom" ? ` · ${examLabel(test.exam)}` : ""}</p>
          <h1>{att.student_name}, you scored {Number(att.score)} / {maxMarks(test)}</h1>
          <div className="grid3" style={{ marginTop: 14 }}>
            <div className="stat"><b>#{rank}</b><span className="small muted">of {board.length}</span></div>
            <div className="stat"><b>{att.correct} / {att.wrong} / {att.unanswered}</b><span className="small muted">correct / wrong / blank</span></div>
            <div className="stat"><b>{fmtTime(att.time_taken_sec)}</b><span className="small muted">time taken</span></div>
          </div>
          {qual !== null && (
            <div className={`notice ${qual ? "ok" : "bad"}`} style={{ marginTop: 12 }}>
              {qual ? "Qualified" : "Not qualified"}: the qualifying mark is {test.qualifying_percent}% ({Math.round(test.qualifying_percent * maxMarks(test)) / 100} marks).
            </div>
          )}
          {showSections && (
            <table style={{ marginTop: 12 }}>
              <thead><tr><th>Section</th><th>Score</th><th>✓ / ✗ / –</th></tr></thead>
              <tbody>{re.sections.map((x) => <tr key={x.name}><td>{x.name}</td><td>{x.score} / {x.max}</td><td>{x.correct} / {x.wrong} / {x.unanswered}</td></tr>)}</tbody>
            </table>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>
            Scoring: +{test.marks_correct} per correct, −{test.marks_wrong} per wrong{test.questions.some((q) => qType(q) === "tita") ? " (typed answers: no negative)" : ""}{test.marks_blank > 0 ? `, −${test.marks_blank} per question left fully blank` : ""}.
            {" "}Negative marking cost you {negLoss} marks{re.blankPenalised > 0 && re.score === Number(att.score) ? `, and blanks cost ${Math.round(re.blankPenalised * test.marks_blank * 100) / 100}` : ""}.
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
              <div><span className="qnum">Q{i + 1}.</span><span style={{ whiteSpace: "pre-wrap" }}>{q.question}</span>{showSections && test.sections[q.section] ? <span className="small muted"> · {test.sections[q.section].name}</span> : null}</div>
              {qType(q) === "tita" ? (
                <div style={{ marginTop: 8 }}>
                  <div className={`opt ${judge(q, a) === "correct" ? "right" : judge(q, a) === "wrong" ? "wrong" : ""}`} style={{ cursor: "default" }}>
                    <span>Your answer: <b>{a === null || a === undefined || a === "" ? "(blank)" : String(a)}</b></span>
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>Correct answer: <b>{q.answer}</b></div>
                </div>
              ) : (
                <>
                  {q.options.map((o, k) => (
                    <div key={k} className={`opt ${k === q.correct ? "right" : a === k ? "wrong" : ""}`} style={{ cursor: "default" }}>
                      <span><b>{LETTERS[k]}.</b> {o}{k === q.correct ? " ✓" : a === k ? " (your answer)" : ""}</span>
                    </div>
                  ))}
                  {a === "E" && <div className="small muted" style={{ marginTop: 6 }}>Marked E: Not attempted (no penalty)</div>}
                  {(a === null || a === undefined) && <div className="small muted" style={{ marginTop: 6 }}>Left blank{test.marks_blank > 0 ? ` (−${test.marks_blank})` : ""}</div>}
                </>
              )}
              {q.explanation && <div className="small" style={{ marginTop: 8 }}><b>Why:</b> {q.explanation}</div>}
            </div>
          );
        })}
        <MadeWith />
      </div>
    </main>
  );
}
