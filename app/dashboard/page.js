import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMentor } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseUrl } from "@/lib/url";
import CopyButton from "../CopyButton";
import { createBlankTest } from "../actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const mentor = await currentMentor();
  if (!mentor) redirect("/login");
  const sql = await db();
  const tests = await sql`
    select t.id, t.title, t.topic, t.status, t.source, t.created_at, jsonb_array_length(t.questions) as qcount,
           (select count(*) from attempts a where a.test_id = t.id)::int as attempts
    from tests t where t.mentor_id = ${mentor.id} order by t.created_at desc`;
  const base = await baseUrl();
  const mcpUrl = `${base}/api/mcp/${mentor.mcp_key}`;

  return (
    <main>
      <div className="wrap">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <h1>Your tests</h1>
            <p className="muted">Ask Claude for a mock test and it appears here as a draft.</p>
          </div>
          <form action={createBlankTest}><button className="btn">+ Blank test</button></form>
        </div>

        <div className="card">
          <h2>Connect MockSprint to your Claude</h2>
          <p className="small muted">Your personal MCP link. Keep it private: anyone with it can add tests to your account.</p>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="code" style={{ flex: 1 }}>{mcpUrl}</div>
            <CopyButton text={mcpUrl} label="Copy link" />
          </div>
          <ol className="steps small">
            <li>In Claude (claude.ai or the desktop app), open <b>Settings → Connectors</b>.</li>
            <li>Click <b>Add custom connector</b>, name it <b>MockSprint</b>, paste the link above, and click <b>Add</b>.</li>
            <li>In a new chat, turn on MockSprint from the tools menu and ask: <i>&ldquo;Create a 10-question UPSC Polity mock test on Fundamental Rights in MockSprint.&rdquo;</i></li>
          </ol>
        </div>

        <div className="card">
          {tests.length === 0 ? (
            <p className="muted">No tests yet. Connect Claude above and ask for your first mock test.</p>
          ) : (
            <table>
              <thead><tr><th>Test</th><th>Status</th><th>Questions</th><th>Attempts</th><th></th></tr></thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tests/${t.id}/edit`}><b>{t.title}</b></Link>
                      <div className="small muted">{t.topic}{t.source === "claude" ? " · from Claude" : ""} · {new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</div>
                    </td>
                    <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                    <td>{t.qcount}</td>
                    <td>{t.attempts}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link href={`/tests/${t.id}/edit`} className="btn sm">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
