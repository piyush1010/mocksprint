import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { db, newId } from "@/lib/db";
import { baseUrlFromRequest } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LETTER_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

function buildServer(mentor, appUrl) {
  const server = new McpServer(
    { name: "MockSprint", version: "1.0.0" },
    {
      instructions:
        "MockSprint hosts timed UPSC-style mock tests for mentors. When the mentor asks for a mock test, write high-quality, factually accurate multiple-choice questions yourself (exactly 4 options each, one correct answer, a short explanation), then call create_mock_test. The test is saved as a DRAFT: always share the editor link and remind the mentor to review the answer key and publish it in MockSprint before sharing with students.",
    }
  );

  server.registerTool(
    "create_mock_test",
    {
      title: "Create mock test",
      description:
        "Save a multiple-choice mock test (UPSC Prelims style) into the mentor's MockSprint account as a draft. MockSprint stores it, lets the mentor edit and approve it, then hosts it as a timed test link with automatic negative-marking scoring and a leaderboard. Returns the test ID, status and editor URL.",
      inputSchema: {
        title: z.string().min(3).max(140).describe("Test title, e.g. 'Polity Mock 1: Fundamental Rights'"),
        topic: z.string().max(140).describe("Subject and topic, e.g. 'Polity - Fundamental Rights'"),
        duration_minutes: z.number().int().min(1).max(180).default(15).describe("Time limit in minutes"),
        marks_correct: z.number().min(0).max(10).default(2).describe("Marks for a correct answer (UPSC GS Paper I: 2)"),
        marks_wrong: z.number().min(0).max(10).default(0.66).describe("Marks deducted for a wrong answer (UPSC GS Paper I: 0.66, one-third of 2)"),
        questions: z
          .array(
            z.object({
              question: z.string().min(5).describe("Question text"),
              options: z.array(z.string().min(1)).length(4).describe("Exactly four options, in order A, B, C, D, without letter prefixes"),
              correct_option: z.enum(["A", "B", "C", "D"]).describe("Letter of the correct option"),
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
      const sql = await db();
      const id = newId(8);
      const questions = args.questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => String(o).trim()),
        correct: LETTER_TO_INDEX[q.correct_option],
        explanation: (q.explanation || "").trim(),
      }));
      await sql`
        insert into tests (id, mentor_id, title, topic, duration_minutes, marks_correct, marks_wrong, questions, status, source)
        values (${id}, ${mentor.id}, ${args.title.trim()}, ${args.topic.trim()}, ${args.duration_minutes ?? 15},
                ${args.marks_correct ?? 2}, ${args.marks_wrong ?? 0.66}, ${sql.json(questions)}, 'draft', 'claude')`;
      const editorUrl = `${appUrl}/tests/${id}/edit`;
      const result = {
        test_id: id,
        status: "draft",
        question_count: questions.length,
        editor_url: editorUrl,
        next_step: "Open the editor, check every answer key, mark it reviewed, then publish to get the student link.",
      };
      return {
        content: [
          {
            type: "text",
            text:
              `Saved "${args.title}" to MockSprint as a DRAFT (${questions.length} questions).\n` +
              `Test ID: ${id}\nStatus: Draft (not visible to students yet)\nEditor: ${editorUrl}\n\n` +
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
         <li>In a new chat, switch MockSprint on in the tools menu and ask: <i>"Create a 5-question UPSC Prelims Polity mock test on Fundamental Rights in MockSprint."</i></li></ol>
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
