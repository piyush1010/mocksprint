"use client";
import { useState, useTransition } from "react";
import { saveTest, setStatus, deleteTest } from "@/app/actions";
import CopyButton from "@/app/CopyButton";
import { EXAMS, EXAM_KEYS } from "@/lib/exams";

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

  const applyExam = (key) => {
    const p = EXAMS[key];
    const sections = p.sections.map((x) => ({ ...x }));
    update({
      exam: key, marks_correct: p.marks_correct, marks_wrong: p.marks_wrong, marks_blank: p.marks_blank,
      not_attempted_option: p.not_attempted_option, qualifying_percent: p.qualifying_percent ?? "", sections,
      questions: t.questions.map((q) => ({ ...q, section: sections.length ? Math.min(Number.isInteger(q.section) ? q.section : 0, sections.length - 1) : null })),
    });
  };
  const setSections = (sections) => update({
    sections,
    questions: t.questions.map((q) => ({ ...q, section: sections.length ? Math.min(Number.isInteger(q.section) ? q.section : 0, sections.length - 1) : null })),
  });
  const preset = EXAMS[t.exam] || EXAMS.custom;
  const hasSections = t.sections.length > 0;
  const totalMin = hasSections ? t.sections.reduce((a, x) => a + Number(x.minutes || 0), 0) : t.duration_minutes;

  const save = () => start(async () => {
    const r = await saveTest(t.id, t);
    if (r?.error) setMsg({ kind: "bad", text: r.error });
    else { if (r.questions) setT((x) => ({ ...x, questions: r.questions })); setDirty(false); setSt(r.status); setChecked(false); setMsg({ kind: "ok", text: r.message }); }
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
          <div className="field"><label>Exam</label>
            <select value={t.exam} onChange={(e) => applyExam(e.target.value)}>
              {EXAM_KEYS.map((k) => <option key={k} value={k}>{EXAMS[k].label}</option>)}
            </select>
          </div>
          <div className="field"><label>Subject / topic</label><input type="text" value={t.topic} onChange={(e) => update({ topic: e.target.value })} /></div>
        </div>
        <div className="small muted" style={{ marginTop: -4, marginBottom: 10 }}>{preset.note} Changing the exam resets marking to its preset; check it against the latest official notification.</div>
        <div className="grid3" style={{ gap: 10 }}>
          <div className="field"><label>Minutes{hasSections ? " (total)" : ""}</label><input type="number" min="1" max="240" value={totalMin} disabled={hasSections} onChange={(e) => update({ duration_minutes: e.target.value })} /></div>
          <div className="field"><label>+ Correct</label><input type="number" step="0.01" value={t.marks_correct} onChange={(e) => update({ marks_correct: e.target.value })} /></div>
          <div className="field"><label>− Wrong</label><input type="number" step="0.01" value={t.marks_wrong} onChange={(e) => update({ marks_wrong: e.target.value })} /></div>
          <div className="field"><label>− Left blank</label><input type="number" step="0.01" min="0" value={t.marks_blank} onChange={(e) => update({ marks_blank: e.target.value })} /></div>
          <div className="field"><label>Qualifying % (optional)</label><input type="number" min="0" max="100" value={t.qualifying_percent ?? ""} onChange={(e) => update({ qualifying_percent: e.target.value })} /></div>
          <div className="field"><label>Option E</label>
            <label className="row small" style={{ margin: "8px 0 0", fontWeight: 500 }}>
              <input type="checkbox" checked={!!t.not_attempted_option} onChange={(e) => update({ not_attempted_option: e.target.checked })} /> Show &ldquo;E: Not attempted&rdquo;
            </label>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Timed sections {hasSections ? "(locked in order: students can't go back)" : "(none: one timer for the whole test)"}</label>
          {t.sections.map((sct, i) => (
            <div className="row" key={i} style={{ marginBottom: 6 }}>
              <input type="text" value={sct.name} placeholder="Section name" style={{ flex: 2 }} onChange={(e) => setSections(t.sections.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input type="number" min="1" max="120" value={sct.minutes} style={{ flex: 1 }} onChange={(e) => setSections(t.sections.map((x, j) => (j === i ? { ...x, minutes: e.target.value } : x)))} />
              <span className="small muted">min</span>
              <button className="btn sm danger" onClick={() => setSections(t.sections.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button className="btn sm" onClick={() => setSections([...t.sections, { name: `Section ${t.sections.length + 1}`, minutes: 20 }])}>+ Add section</button>
        </div>
      </div>

      {t.questions.map((q, i) => (
        <div className="q" key={i}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <b>Question {i + 1}{hasSections && t.sections[q.section] ? ` · ${t.sections[q.section].name}` : ""}</b>
            <button className="btn sm danger" onClick={() => update({ questions: t.questions.filter((_, j) => j !== i) })} disabled={t.questions.length <= 1}>Remove</button>
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <select value={q.type === "tita" ? "tita" : "mcq"} style={{ width: "auto" }} onChange={(e) => updateQ(i, e.target.value === "tita" ? { type: "tita", answer: q.answer || "" } : { type: "mcq", options: q.options?.length === 4 ? q.options : ["", "", "", ""], correct: Number.isInteger(q.correct) ? q.correct : 0 })}>
              <option value="mcq">Multiple choice (4 options)</option>
              <option value="tita">Type the answer (TITA)</option>
            </select>
            {hasSections && (
              <select value={Number.isInteger(q.section) ? q.section : 0} style={{ width: "auto" }} onChange={(e) => updateQ(i, { section: Number(e.target.value) })}>
                {t.sections.map((sct, k) => <option key={k} value={k}>{sct.name || `Section ${k + 1}`}</option>)}
              </select>
            )}
          </div>
          <textarea value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} placeholder="Question text" />
          {q.type === "tita" ? (
            <div className="field" style={{ marginTop: 8 }}>
              <label>Correct answer (students type this; numbers match ignoring commas and spaces)</label>
              <input type="text" value={q.answer || ""} onChange={(e) => updateQ(i, { answer: e.target.value })} placeholder="e.g. 42" />
              {Number(t.marks_wrong) > 0 && <div className="small muted" style={{ marginTop: 4 }}>Wrong typed answers get 0, not negative marks.</div>}
            </div>
          ) : (
            <>
              <div className="small muted" style={{ marginTop: 8 }}>Options: click a letter to set the correct answer</div>
              {(q.options || ["", "", "", ""]).map((o, k) => (
                <div className="optrow" key={k}>
                  <div className={`letter ${q.correct === k ? "correct" : ""}`} title="Mark as correct answer" onClick={() => updateQ(i, { correct: k })}>{LETTERS[k]}</div>
                  <input type="text" value={o} onChange={(e) => updateOpt(i, k, e.target.value)} placeholder={`Option ${LETTERS[k]}`} />
                </div>
              ))}
            </>
          )}
          <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
            <label>Explanation (shown to students after they submit)</label>
            <textarea value={q.explanation} onChange={(e) => updateQ(i, { explanation: e.target.value })} style={{ minHeight: 44 }} />
          </div>
        </div>
      ))}

      <button className="btn" onClick={() => update({ questions: [...t.questions, { type: "mcq", question: "", options: ["", "", "", ""], correct: 0, explanation: "", section: hasSections ? t.sections.length - 1 : null }] })}>+ Add question</button>

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
