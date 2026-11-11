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

export async function GET() {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Use POST (MCP Streamable HTTP)." }, id: null },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
