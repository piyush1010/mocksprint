// Exam presets. Every value stays editable per test, because exam patterns change
// and coaching sources sometimes disagree; mentors should match the latest notification.
export const EXAMS = {
  upsc_gs: {
    label: "UPSC Prelims · GS Paper I",
    marks_correct: 2, marks_wrong: 0.66, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: null, sections: [],
    note: "Full paper: 100 questions, 2 hours. Wrong answer: −⅓ of the marks.",
  },
  upsc_csat: {
    label: "UPSC Prelims · CSAT (Paper II)",
    marks_correct: 2.5, marks_wrong: 0.83, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: 33, sections: [],
    note: "Full paper: 80 questions, 2 hours. Qualifying: 33%.",
  },
  uppcs_gs: {
    label: "UPPCS Prelims · GS Paper I",
    marks_correct: 1.33, marks_wrong: 0.44, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: null, sections: [],
    note: "Full paper: 150 questions, 200 marks, 2 hours. Wrong answer: −⅓ of the marks.",
  },
  uppcs_csat: {
    label: "UPPCS Prelims · CSAT (Paper II)",
    marks_correct: 2, marks_wrong: 0.66, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: 33, sections: [],
    note: "Full paper: 100 questions, 200 marks, 2 hours. Qualifying: 33%.",
  },
  bpsc: {
    label: "BPSC Prelims (CCE)",
    marks_correct: 1, marks_wrong: 0.33, marks_blank: 0.33,
    not_attempted_option: true, qualifying_percent: null, sections: [],
    note: "Full paper: 150 questions, 2 hours. Option E = Not attempted; leaving a question fully blank also costs ⅓.",
  },
  jkpsc_gs: {
    label: "JKPSC CCE Prelims · GS Paper I",
    marks_correct: 2, marks_wrong: 0.33, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: null, sections: [],
    note: "200 marks, 2 hours. Check marks per question and negative marking against the latest JKPSC notification.",
  },
  jkpsc_csat: {
    label: "JKPSC CCE Prelims · GS Paper II (CSAT)",
    marks_correct: 2, marks_wrong: 0.33, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: 33, sections: [],
    note: "200 marks, 2 hours. Qualifying: 33%.",
  },
  cat: {
    label: "CAT (IIM)",
    marks_correct: 3, marks_wrong: 1, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: null,
    sections: [
      { name: "VARC", minutes: 40 },
      { name: "DILR", minutes: 40 },
      { name: "QA", minutes: 40 },
    ],
    note: "3 sections, 40 minutes each, locked in order. MCQ +3 / −1; TITA (type the answer) +3 with no negative marking.",
  },
  custom: {
    label: "Other / custom",
    marks_correct: 1, marks_wrong: 0, marks_blank: 0,
    not_attempted_option: false, qualifying_percent: null, sections: [],
    note: "Set your own marking.",
  },
};

export const EXAM_KEYS = Object.keys(EXAMS);

export function examLabel(key) {
  return (EXAMS[key] || EXAMS.custom).label;
}
