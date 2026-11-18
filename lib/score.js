// Scoring for every supported exam.
// Answers per question:
//   MCQ:  0–3 = chosen option, "E" = explicitly not attempted (BPSC Option E), null = left blank
//   TITA: a typed string, or null / "" = left blank
// Rules:
//   correct MCQ or TITA   → +marks_correct
//   wrong MCQ             → −marks_wrong
//   wrong TITA            → 0 (no negative marking for typed answers, as in CAT)
//   blank (null)          → −marks_blank (BPSC), else 0
//   "E" (not attempted)   → 0

export const LETTERS = ["A", "B", "C", "D"];

export function qType(q) {
  return q && q.type === "tita" ? "tita" : "mcq";
}

export function normalizeTita(v) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/,/g, "");
}

export function titaMatches(given, expected) {
  const g = normalizeTita(given);
  const e = normalizeTita(expected);
  if (!g) return false;
  const gn = Number(g), en = Number(e);
  if (g !== "" && e !== "" && Number.isFinite(gn) && Number.isFinite(en)) return Math.abs(gn - en) < 1e-9;
  return g === e;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function judge(q, a) {
  if (qType(q) === "tita") {
    if (a === null || a === undefined || normalizeTita(a) === "") return "blank";
    return titaMatches(a, q.answer) ? "correct" : "wrong";
  }
  if (a === "E") return "skipped";
  if (a === null || a === undefined || a === "") return "blank";
  return Number(a) === Number(q.correct) ? "correct" : "wrong";
}

export function scoreAttempt(test, answers) {
  const mc = Number(test.marks_correct), mw = Number(test.marks_wrong), mb = Number(test.marks_blank || 0);
  const sections = Array.isArray(test.sections) ? test.sections : [];
  const bySection = sections.map((s) => ({ name: s.name, correct: 0, wrong: 0, unanswered: 0, score: 0, max: 0 }));
  let correct = 0, wrong = 0, unanswered = 0, blankPenalised = 0, raw = 0;
  test.questions.forEach((q, i) => {
    const r = judge(q, answers?.[i]);
    let pts = 0;
    if (r === "correct") { correct++; pts = mc; }
    else if (r === "wrong") { wrong++; pts = qType(q) === "tita" ? 0 : -mw; }
    else if (r === "blank") { unanswered++; if (mb > 0 && qType(q) === "mcq") { pts = -mb; blankPenalised++; } }
    else { unanswered++; }
    raw += pts;
    const si = Number.isInteger(q.section) ? q.section : -1;
    if (bySection[si]) {
      const b = bySection[si];
      b.max += mc; b.score += pts;
      if (r === "correct") b.correct++; else if (r === "wrong") b.wrong++; else b.unanswered++;
    }
  });
  bySection.forEach((b) => { b.score = round2(b.score); b.max = round2(b.max); });
  return { correct, wrong, unanswered, blankPenalised, score: round2(raw), sections: bySection };
}

export function maxMarks(test) {
  return round2(test.questions.length * Number(test.marks_correct));
}

export function qualifies(test, score) {
  const q = test.qualifying_percent;
  if (q === null || q === undefined || q === "" || Number(q) <= 0) return null;
  return Number(score) >= (Number(q) / 100) * maxMarks(test);
}

export function totalMinutes(test) {
  const sections = Array.isArray(test.sections) ? test.sections : [];
  if (sections.length) return sections.reduce((s, x) => s + Number(x.minutes || 0), 0);
  return Number(test.duration_minutes);
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
