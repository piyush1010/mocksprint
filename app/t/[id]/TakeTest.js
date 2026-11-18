"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAttempt } from "@/app/actions";
import MadeWith from "@/app/MadeWith";

const LETTERS = ["A", "B", "C", "D"];
const isAnswered = (a) => a !== null && a !== undefined && a !== "" && a !== "E";

export default function TakeTest({ test }) {
  const router = useRouter();
  const sections = test.sections || [];
  const sectional = sections.length > 0;
  // Without sections the whole test is one timed block.
  const blocks = sectional ? sections.map((s) => ({ name: s.name, sec: Number(s.minutes) * 60 })) : [{ name: null, sec: test.duration_minutes * 60 }];

  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState(() => test.questions.map(() => null));
  const [block, setBlock] = useState(0);
  const [left, setLeft] = useState(blocks[0].sec);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const startAt = useRef(0);
  const blockStart = useRef(0);
  const sent = useRef(false);
  // Refs always hold the latest values, so timer callbacks never act on stale state.
  const attemptId = useRef(
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("")
  );
  const answersRef = useRef(answers);
  const nameRef = useRef(name);
  const blockRef = useRef(block);
  answersRef.current = answers;
  nameRef.current = name;
  blockRef.current = block;

  const submit = async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    setErr(null);
    const taken = Math.round((Date.now() - startAt.current) / 1000);
    let r;
    try {
      r = await Promise.race([
        submitAttempt(test.id, nameRef.current, answersRef.current, taken, attemptId.current),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
      ]);
    } catch {
      r = { error: "Submitting is taking too long. Check your internet, then tap Try again. Your answers are still here." };
    }
    if (r?.error) { setErr(r.error); setSubmitting(false); sent.current = false; return; }
    router.push(`/t/${test.id}/r/${r.attemptId}`);
  };

  const nextBlock = () => {
    const b = blockRef.current;
    if (b >= blocks.length - 1) { submit(); return; }
    blockStart.current = Date.now();
    blockRef.current = b + 1;
    setBlock(b + 1);
    setLeft(blocks[b + 1].sec);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      if (sent.current) return;
      const b = blockRef.current;
      const remaining = Math.max(0, blocks[b].sec - Math.floor((Date.now() - blockStart.current) / 1000));
      setLeft(remaining);
      if (remaining === 0) nextBlock();
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const setA = (i, v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
  const visible = test.questions.map((q, i) => ({ q, i })).filter(({ q }) => !sectional || q.section === block);
  const answered = visible.filter(({ i }) => isAnswered(answers[i])).length;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const hasTita = test.questions.some((q) => q.type === "tita");
  const lastBlock = block === blocks.length - 1;

  if (!started) {
    return (
      <main><div className="wrap" style={{ maxWidth: 600 }}>
        <div className="card">
          <p className="small muted">{test.mentor}{test.exam ? ` · ${test.exam}` : ""}{test.topic ? ` · ${test.topic}` : ""}</p>
          <h1>{test.title}</h1>
          <div className="grid3" style={{ margin: "16px 0" }}>
            <div className="stat"><b>{test.questions.length}</b><span className="small muted">questions</span></div>
            <div className="stat"><b>{test.duration_minutes} min</b><span className="small muted">{sectional ? `${sections.length} timed sections` : "time limit"}</span></div>
            <div className="stat"><b>+{test.marks_correct} / −{test.marks_wrong}</b><span className="small muted">marking</span></div>
          </div>
          {sectional && (
            <div className="notice info small">
              <b>Sections run in order:</b> {sections.map((s) => `${s.name} (${s.minutes} min)`).join(" → ")}. When a section&rsquo;s time ends, the next one starts. You can&rsquo;t go back to an earlier section.
            </div>
          )}
          <p className="small muted">
            {test.marks_wrong > 0 ? `Wrong answers lose ${test.marks_wrong} marks. ` : ""}
            {hasTita ? "Type-the-answer questions have no negative marking. " : ""}
            {test.marks_blank > 0
              ? `Leaving a question blank also costs ${test.marks_blank} marks; choose "E: Not attempted" to skip it with no penalty. `
              : test.not_attempted_option ? `Choose "E: Not attempted" to skip a question. ` : test.marks_wrong > 0 ? "Leave a question blank if you’re unsure. " : ""}
            {test.qualifying_percent ? `Qualifying mark: ${test.qualifying_percent}%. ` : ""}
            The test submits automatically when time runs out. Your name and score are shown to your mentor and on this test&rsquo;s leaderboard.
          </p>
          <div className="field"><label>Your name (shown on the leaderboard)</label><input type="text" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya S." /></div>
          <button className="btn primary" disabled={!name.trim()} onClick={() => { startAt.current = Date.now(); blockStart.current = Date.now(); setStarted(true); }} style={{ width: "100%" }}>Start test</button>
        </div>
        <MadeWith />
      </div></main>
    );
  }

  return (
    <>
      <div className="timer"><div className="wrap">
        <div className="small">
          <b>{test.title}</b>
          {sectional && <> · Section {block + 1}/{blocks.length}: <b>{blocks[block].name}</b></>}
          {" "}· {answered}/{visible.length} answered
        </div>
        <div className={`clock ${left <= 60 ? "low" : ""}`}>{mm}:{ss}</div>
      </div></div>
      <main><div className="wrap" style={{ maxWidth: 760 }}>
        {visible.map(({ q, i }) => (
          <div className="q" key={i}>
            <div><span className="qnum">Q{i + 1}.</span><span style={{ whiteSpace: "pre-wrap" }}>{q.question}</span></div>
            {q.type === "tita" ? (
              <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                <label className="small muted">Type your answer (no options; no negative marking)</label>
                <input type="text" inputMode="decimal" maxLength={60} value={answers[i] ?? ""} onChange={(e) => setA(i, e.target.value === "" ? null : e.target.value)} placeholder="Your answer" />
              </div>
            ) : (
              <>
                {q.options.map((o, k) => (
                  <label key={k} className={`opt ${answers[i] === k ? "sel" : ""}`} style={{ fontWeight: 400, color: "var(--ink)", fontSize: 15 }}>
                    <input type="radio" name={`q${i}`} checked={answers[i] === k} onChange={() => setA(i, k)} />
                    <span><b>{LETTERS[k]}.</b> {o}</span>
                  </label>
                ))}
                {test.not_attempted_option && (
                  <label className={`opt ${answers[i] === "E" ? "sel" : ""}`} style={{ fontWeight: 400, color: "var(--ink)", fontSize: 15 }}>
                    <input type="radio" name={`q${i}`} checked={answers[i] === "E"} onChange={() => setA(i, "E")} />
                    <span><b>E.</b> Not attempted</span>
                  </label>
                )}
                {answers[i] !== null && (
                  <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setA(i, null)}>Clear answer</button>
                )}
              </>
            )}
          </div>
        ))}
        {err && <div className="notice bad">{err}</div>}
        <div className="sticky-bar"><div className="row between">
          <span className="small muted">
            {visible.length - answered} unanswered{sectional ? " in this section" : ""}
            {test.marks_blank > 0 && visible.some(({ q, i }) => q.type !== "tita" && answers[i] === null) ? ` · blanks cost −${test.marks_blank}, pick E to skip` : ""}
          </span>
          {sectional && !lastBlock ? (
            <button className="btn primary" disabled={submitting} onClick={() => { if (confirm(`Finish ${blocks[block].name} and start ${blocks[block + 1].name}? You can't come back to this section.`)) nextBlock(); }}>Finish section →</button>
          ) : (
            <button className="btn primary" disabled={submitting} onClick={() => { if (err || confirm("Submit your test now?")) submit(); }}>{submitting ? "Submitting…" : err ? "Try again" : "Submit test"}</button>
          )}
        </div></div>
      </div></main>
    </>
  );
}
