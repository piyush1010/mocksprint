import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { baseUrlFromRequest } from "@/lib/url";
import { EXAMS, EXAM_KEYS } from "@/lib/exams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LETTER_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

function errorResult(text) {
  return { isError: true, content: [{ type: "text", text }] };
}

function buildServer(mentor, appUrl) {
  const server = new McpServer(
    { name: "MockSprint", version: "1.1.0" },
    {
      instructions:
        "MockSprint hosts timed mock tests for exam mentors: UPSC (GS, CSAT), UPPCS (GS, CSAT), BPSC, JKPSC (GS, CSAT) and CAT. " +
        "When the mentor asks for a mock test, write high-quality, factually accurate questions yourself in that exam's style, then call create_mock_test with the matching `exam` value; MockSprint applies that exam's marking automatically. " +
        "MCQs need exactly 4 options, one correct letter and a short explanation. For CAT, put every question in a section (VARC, DILR or QA) and use type 'tita' (type-in-the-answer, with a numeric or short text `answer`) where CAT would. " +
        "For state exams (UPPCS, BPSC, JKPSC), include state-specific topics where relevant. " +
        "The test is saved as a DRAFT: always share the editor link and remind the mentor to review the answer key and publish it in MockSprint before sharing with students.",
    }
  );

  server.registerTool(
    "create_mock_test",
    {
      title: "Create mock test",
      description:
        "Save a mock test into the mentor's MockSprint account as a draft. Supports UPSC, UPPCS, BPSC, JKPSC and CAT patterns (marking, BPSC's Option E, CSAT qualifying marks, CAT's timed sections and TITA questions). " +
        "MockSprint stores it, lets the mentor edit and approve it, then hosts it as a timed test link with automatic scoring and a leaderboard. Returns the test ID, status and editor URL.",
      inputSchema: {
        title: z.string().min(3).max(140).describe("Test title, e.g. 'UPPCS GS Mock 1: Uttar Pradesh Polity'"),
        topic: z.string().max(140).describe("Subject and topic, e.g. 'Polity - Fundamental Rights'"),
        exam: z.enum(EXAM_KEYS).default("upsc_gs").describe(
          "Exam pattern: " + EXAM_KEYS.map((k) => `${k} = ${EXAMS[k].label}`).join("; ") + ". Sets the default marking."
        ),
        duration_minutes: z.number().int().min(1).max(240).optional().describe("Total time limit in minutes (ignored when sections are given; each section then has its own time)"),
        marks_correct: z.number().min(0).max(10).optional().describe("Override marks for a correct answer (default comes from the exam)"),
        marks_wrong: z.number().min(0).max(10).optional().describe("Override marks deducted for a wrong MCQ answer (default comes from the exam)"),
        sections: z
          .array(z.object({ name: z.string().min(1).max(40), minutes: z.number().int().min(1).max(120) }))
          .max(6)
          .optional()
          .describe("Timed sections taken in order, each locked once finished (CAT default: VARC, DILR, QA). Give shorter minutes for short practice tests."),
        questions: z
          .array(
            z.object({
              type: z.enum(["mcq", "tita"]).default("mcq").describe("mcq = 4 options; tita = type-in-the-answer (CAT), no options"),
              question: z.string().min(5).describe("Question text"),
              options: z.array(z.string().min(1)).length(4).optional().describe("MCQ only: exactly four options, in order A, B, C, D, without letter prefixes"),
              correct_option: z.enum(["A", "B", "C", "D"]).optional().describe("MCQ only: letter of the correct option"),
              answer: z.string().max(60).optional().describe("TITA only: the exact answer, usually a number, e.g. '42'"),
              section: z.string().max(40).optional().describe("Section name this question belongs to (must match a section name, e.g. 'QA')"),
              explanation: z.string().default("").describe("One or two sentences explaining the correct answer"),
            })
          )
          .min(1)
          .max(100)
          .describe("The questions"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      const preset = EXAMS[args.exam] || EXAMS.upsc_gs;
      const sections = (args.sections && args.sections.length ? args.sections : preset.sections).map((s) => ({
        name: String(s.name).trim(),
        minutes: Number(s.minutes),
      }));
      const sectionIndex = Object.fromEntries(sections.map((s, i) => [s.name.toLowerCase(), i]));
      const problems = [];
      const questions = args.questions.map((q, i) => {
        const type = q.type === "tita" ? "tita" : "mcq";
        let section = null;
        if (sections.length) {
          const si = sectionIndex[String(q.section || "").trim().toLowerCase()];
          if (si === undefined) problems.push(`Question ${i + 1}: section must be one of ${sections.map((s) => s.name).join(", ")}.`);
          else section = si;
        }
        const base = { type, question: q.question.trim(), explanation: (q.explanation || "").trim(), section };
        if (type === "tita") {
          if (!q.answer || !String(q.answer).trim()) problems.push(`Question ${i + 1}: TITA questions need an answer.`);
          return { ...base, options: [], correct: null, answer: String(q.answer || "").trim() };
        }
        if (!q.options || q.options.length !== 4) problems.push(`Question ${i + 1}: MCQs need exactly 4 options.`);
        if (!q.correct_option) problems.push(`Question ${i + 1}: MCQs need correct_option (A-D).`);
        return { ...base, options: (q.options || []).map((o) => String(o).trim()), correct: LETTER_TO_INDEX[q.correct_option] ?? 0 };
      });
      if (problems.length) return errorResult("Not saved. Please fix and call create_mock_test again:\n" + problems.slice(0, 10).join("\n"));
      if (sections.length) questions.sort((a, b) => a.section - b.section);

      const duration = sections.length
        ? sections.reduce((t, s) => t + s.minutes, 0)
        : args.duration_minutes ?? Math.max(5, Math.min(180, Math.round(questions.length * 1.2)));
      const sql = await db();
      const id = newId(8);
      await sql`
        insert into tests (id, mentor_id, title, topic, duration_minutes, marks_correct, marks_wrong, marks_blank,
                           not_attempted_option, qualifying_percent, exam, sections, questions, status, source)
        values (${id}, ${mentor.id}, ${args.title.trim()}, ${args.topic.trim()}, ${duration},
                ${args.marks_correct ?? preset.marks_correct}, ${args.marks_wrong ?? preset.marks_wrong}, ${preset.marks_blank},
                ${preset.not_attempted_option}, ${preset.qualifying_percent}, ${args.exam}, ${sql.json(sections)},
                ${sql.json(questions)}, 'draft', 'claude')`;
      const editorUrl = `${appUrl}/tests/${id}/edit`;
      const marking = `+${args.marks_correct ?? preset.marks_correct} / −${args.marks_wrong ?? preset.marks_wrong}` +
        (preset.marks_blank ? `, blank −${preset.marks_blank}` : "") + (preset.not_attempted_option ? ", Option E = not attempted" : "");
      const result = {
        test_id: id,
        status: "draft",
        exam: preset.label,
        question_count: questions.length,
        sections: sections.map((s) => `${s.name} (${s.minutes} min)`),
        marking,
        editor_url: editorUrl,
        next_step: "Open the editor, check every answer key, mark it reviewed, then publish to get the student link.",
      };
      return {
        content: [
          {
            type: "text",
            text:
              `Saved "${args.title}" to MockSprint as a DRAFT (${questions.length} questions, ${preset.label}).\n` +
              `Marking: ${marking}` + (sections.length ? `\nSections: ${result.sections.join(", ")}` : `\nTime: ${duration} min`) +
              `\nTest ID: ${id}\nStatus: Draft (not visible to students yet)\nEditor: ${editorUrl}\n\n` +
              `Next: review the questions and answer key in the editor, mark it reviewed, then publish to get the student link.`,
          },
        ],
        structuredContent: result,
      };
    }
  );

  return server;
}

async function handle(req, { params }) {
  const { key } = await params;
  const sql = await db();
  const [mentor] = await sql`select id, name from mentors where mcp_key = ${key}`;
  if (!mentor) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Invalid MockSprint link. Copy your personal MCP link from the MockSprint dashboard." }, id: null },
      { status: 404 }
    );
  }
  const server = buildServer(mentor, baseUrlFromRequest(req));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: works on serverless hosting
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Stateless: nothing to keep after the response
  }
}

export async function POST(req, ctx) {
  return handle(req, ctx);
}

export async function GET(req, { params }) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    const { key } = await params;
    const sql = await db();
    const [mentor] = await sql`select id from mentors where mcp_key = ${key}`;
    const url = `${baseUrlFromRequest(req)}/api/mcp/${key}`;
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const body = mentor
      ? `<h1>This is a MockSprint MCP link ✅</h1><p>It works, but it's meant for <b>Claude</b>, not your browser.</p>
         <h2>Connect it to Claude</h2><ol>
         <li>In Claude, open <b>Settings → Connectors → Add custom connector</b>.</li>
         <li>Name it <b>MockSprint</b> and paste this link:<pre>${esc(url)}</pre>Keep <b>No sign-in</b> selected and click <b>Add</b>.</li>
         <li>In a new chat, switch MockSprint on in the tools menu and ask: <i>"Create a 5-question UPSC Prelims Polity mock test on Fundamental Rights in MockSprint."</i> It also works for UPPCS, BPSC, JKPSC and CAT (e.g. <i>"a 6-question CAT sectional mock with TITA questions"</i>).</li></ol>
         <p><a href="/login">Open MockSprint</a> to review and publish the tests Claude creates.</p>`
      : `<h1>This MockSprint link isn't valid</h1><p>Copy your personal MCP link from the <a href="/dashboard">MockSprint dashboard</a>.</p>`;
    return new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MockSprint MCP link</title>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#141a2e;line-height:1.55;background:#f6f7fb}
      h1{font-size:24px}h2{font-size:17px;margin-top:24px}pre{background:#fff;border:1px solid #e3e6ef;border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-all;font-size:13px}a{color:#3b46d6}li{margin-bottom:8px}</style></head><body>${body}</body></html>`,
      { status: mentor ? 200 : 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST (MCP Streamable HTTP)." }, id: null },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
