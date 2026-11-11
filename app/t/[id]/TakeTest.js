"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttempt } from "@/app/actions";
import MadeWith from "@/app/MadeWith";

const LETTERS = ["A", "B", "C", "D"];

export default function TakeTest({ test }) {
  const router = useRouter();
  const total = test.duration_minutes * 60;
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState(() => test.questions.map(() => null));
  const [left, setLeft] = useState(total);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const startAt = useRef(0);
  const sent = useRef(false);
  // Refs always hold the latest values, so the timer's auto-submit never sends stale answers.
  const answersRef = useRef(answers);
  const nameRef = useRef(name);
  answersRef.current = answers;
  nameRef.current = name;

  const submit = async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    const taken = Math.round((Date.now() - startAt.current) / 1000);
    const r = await submitAttempt(test.id, nameRef.current, answersRef.current, taken);
    if (r?.error) { setErr(r.error); setSubmitting(false); sent.current = false; return; }
    router.push(`/t/${test.id}/r/${r.attemptId}`);
  };

  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      const remaining = Math.max(0, total - Math.floor((Date.now() - startAt.current) / 1000));
      setLeft(remaining);
      if (remaining === 0) { clearInterval(iv); submit(); }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const answered = answers.filter((a) => a !== null).length;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  if (!started) {
    return (
      <main><div className="wrap" style={{ maxWidth: 600 }}>
        <div className="card">
          <p className="small muted">{test.mentor} · {test.topic}</p>
          <h1>{test.title}</h1>
          <div className="grid3" style={{ margin: "16px 0" }}>
            <div className="stat"><b>{test.questions.length}</b><span className="small muted">questions</span></div>
            <div className="stat"><b>{test.duration_minutes} min</b><span className="small muted">time limit</span></div>
            <div className="stat"><b>+{test.marks_correct} / −{test.marks_wrong}</b><span className="small muted">marking</span></div>
          </div>
          <p className="small muted">Wrong answers lose {test.marks_wrong} marks, so leave a question blank if you&rsquo;re unsure. The test submits automatically when time runs out. Your name and score are shown to your mentor and on this test&rsquo;s leaderboard.</p>
          <div className="field"><label>Your name (shown on the leaderboard)</label><input type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya S." /></div>
          <button className="btn primary" disabled={!name.trim()} onClick={() => { startAt.current = Date.now(); setStarted(true); }} style={{ width: "100%" }}>Start test</button>
        </div>
        <MadeWith />
      </div></main>
    );
  }

  return (
    <>
      <div className="timer"><div className="wrap">
        <div className="small"><b>{test.title}</b> · {answered}/{test.questions.length} answered</div>
        <div className={`clock ${left <= 60 ? "low" : ""}`}>{mm}:{ss}</div>
      </div></div>
      <main><div className="wrap" style={{ maxWidth: 760 }}>
        {test.questions.map((q, i) => (
          <div className="q" key={i}>
            <div><span className="qnum">Q{i + 1}.</span><span style={{ whiteSpace: "pre-wrap" }}>{q.question}</span></div>
            {q.options.map((o, k) => (
              <label key={k} className={`opt ${answers[i] === k ? "sel" : ""}`} style={{ fontWeight: 400, color: "var(--ink)", fontSize: 15 }}>
                <input type="radio" name={`q${i}`} checked={answers[i] === k} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))} />
                <span><b>{LETTERS[k]}.</b> {o}</span>
              </label>
            ))}
            {answers[i] !== null && (
              <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? null : x)))}>Clear answer</button>
            )}
          </div>
        ))}
        {err && <div className="notice bad">{err}</div>}
        <div className="sticky-bar"><div className="row between">
          <span className="small muted">{test.questions.length - answered} unanswered</span>
          <button className="btn primary" disabled={submitting} onClick={() => { if (confirm("Submit your test now?")) submit(); }}>{submitting ? "Submitting…" : "Submit test"}</button>
        </div></div>
      </div></main>
    </>
  );
}
