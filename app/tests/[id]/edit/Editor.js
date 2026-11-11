"use client";
import { useState, useTransition } from "react";
import { saveTest, setStatus, deleteTest } from "@/app/actions";
import CopyButton from "@/app/CopyButton";

const LETTERS = ["A", "B", "C", "D"];

export default function Editor({ initial, studentUrl, attemptCount }) {
  const [t, setT] = useState(initial);
  const [status, setSt] = useState(initial.status);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();

  const update = (patch) => { setT((x) => ({ ...x, ...patch })); setDirty(true); setMsg(null); };
  const updateQ = (i, patch) => update({ questions: t.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const updateOpt = (i, k, v) => updateQ(i, { options: t.questions[i].options.map((o, j) => (j === k ? v : o)) });

  const save = () => start(async () => {
    const r = await saveTest(t.id, t);
    if (r?.error) setMsg({ kind: "bad", text: r.error });
    else { setDirty(false); setSt(r.status); setChecked(false); setMsg({ kind: "ok", text: r.message }); }
  });
  const move = (next) => start(async () => {
    const r = await setStatus(t.id, next);
    if (r?.error) setMsg({ kind: "bad", text: r.error });
    else {
      setSt(r.status); setChecked(false);
      setMsg({ kind: "ok", text: next === "published" ? "Published. Share the student link below." : next === "reviewed" ? "Marked as reviewed. You can publish now." : "Moved back to draft. Students can no longer open it." });
    }
  });

  return (
    <>
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row">
            <span className={`badge ${status}`}>{status}</span>
            {t.source === "claude" && <span className="small muted">Drafted by Claude via MCP</span>}
          </div>
          <div className="row">
            <button className="btn sm danger" onClick={() => { if (confirm("Delete this test and all its results?")) start(() => deleteTest(t.id)); }}>Delete</button>
          </div>
        </div>

        {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}

        {status === "draft" && (
          <div className="notice warn">
            <b>Draft: students can&rsquo;t see this yet.</b> AI-written questions can have wrong answer keys or unclear wording. Check every question, then mark it reviewed.
          </div>
        )}
        {status === "reviewed" && <div className="notice info"><b>Reviewed.</b> Ready to publish. Editing again will move it back to Draft.</div>}
        {status === "published" && (
          <div className="notice ok">
            <b>Live.</b> Share this link with your students:
            <div className="row" style={{ marginTop: 8 }}>
              <div className="code" style={{ flex: 1, background: "#fff" }}>{studentUrl}</div>
              <CopyButton text={studentUrl} label="Copy student link" />
              <a className="btn sm" href={studentUrl} target="_blank" rel="noreferrer">Open</a>
            </div>
            {attemptCount > 0 && <div className="small" style={{ marginTop: 8 }}>Edits to a live test show to new students immediately; past scores don&rsquo;t change.</div>}
          </div>
        )}

        <div className="field"><label>Title</label><input type="text" value={t.title} onChange={(e) => update({ title: e.target.value })} /></div>
        <div className="grid2">
          <div className="field"><label>Subject / topic</label><input type="text" value={t.topic} onChange={(e) => update({ topic: e.target.value })} /></div>
          <div className="grid3" style={{ gap: 10 }}>
            <div className="field"><label>Minutes</label><input type="number" min="1" max="180" value={t.duration_minutes} onChange={(e) => update({ duration_minutes: e.target.value })} /></div>
            <div className="field"><label>+ Correct</label><input type="number" step="0.01" value={t.marks_correct} onChange={(e) => update({ marks_correct: e.target.value })} /></div>
            <div className="field"><label>− Wrong</label><input type="number" step="0.01" value={t.marks_wrong} onChange={(e) => update({ marks_wrong: e.target.value })} /></div>
          </div>
        </div>
      </div>

      {t.questions.map((q, i) => (
        <div className="q" key={i}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <b>Question {i + 1}</b>
            <button className="btn sm danger" onClick={() => update({ questions: t.questions.filter((_, j) => j !== i) })} disabled={t.questions.length <= 1}>Remove</button>
          </div>
          <textarea value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} placeholder="Question text" />
          <div className="small muted" style={{ marginTop: 8 }}>Options: click a letter to set the correct answer</div>
          {q.options.map((o, k) => (
            <div className="optrow" key={k}>
              <div className={`letter ${q.correct === k ? "correct" : ""}`} title="Mark as correct answer" onClick={() => updateQ(i, { correct: k })}>{LETTERS[k]}</div>
              <input type="text" value={o} onChange={(e) => updateOpt(i, k, e.target.value)} placeholder={`Option ${LETTERS[k]}`} />
            </div>
          ))}
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label>Explanation (shown to students after they submit)</label>
            <textarea value={q.explanation} onChange={(e) => updateQ(i, { explanation: e.target.value })} style={{ minHeight: 44 }} />
          </div>
        </div>
      ))}

      <button className="btn" onClick={() => update({ questions: [...t.questions, { question: "", options: ["", "", "", ""], correct: 0, explanation: "" }] })}>+ Add question</button>

      <div className="sticky-bar">
        <div className="row between">
          <div className="row">
            <button className="btn primary" onClick={save} disabled={!dirty || pending}>{pending ? "Working…" : dirty ? "Save changes" : "Saved"}</button>
            {dirty && <span className="small muted">Unsaved changes</span>}
          </div>
          <div className="row">
            {status === "draft" && (
              <>
                <label className="row small" style={{ margin: 0, color: "var(--ink)", fontWeight: 500 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} disabled={dirty} />
                  I checked every question and answer key
                </label>
                <button className="btn" disabled={!checked || dirty || pending} onClick={() => move("reviewed")}>Mark reviewed</button>
              </>
            )}
            {status === "reviewed" && <button className="btn ok" disabled={dirty || pending} onClick={() => move("published")}>Publish test</button>}
            {status === "published" && <button className="btn" disabled={pending} onClick={() => move("draft")}>Unpublish</button>}
          </div>
        </div>
      </div>
    </>
  );
}
