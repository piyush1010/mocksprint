// UPSC-style scoring: + marks for correct, - marks for wrong, 0 for unanswered.
export function scoreAttempt(test, answers) {
  let correct = 0, wrong = 0, unanswered = 0;
  test.questions.forEach((q, i) => {
    const a = answers?.[i];
    if (a === null || a === undefined || a === "") unanswered++;
    else if (Number(a) === Number(q.correct)) correct++;
    else wrong++;
  });
  const raw = correct * Number(test.marks_correct) - wrong * Number(test.marks_wrong);
  const score = Math.round(raw * 100) / 100;
  return { correct, wrong, unanswered, score };
}

export const LETTERS = ["A", "B", "C", "D"];

export function maxMarks(test) {
  return Math.round(test.questions.length * Number(test.marks_correct) * 100) / 100;
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
