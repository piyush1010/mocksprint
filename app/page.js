import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function sampleTestId() {
  try {
    const sql = await db();
    const email = (process.env.DEMO_EMAIL || "demo@mocksprint.in").toLowerCase();
    const [row] = await sql`select t.id from tests t join mentors m on m.id = t.mentor_id
      where m.email = ${email} and t.status = 'published' order by t.published_at desc nulls last limit 1`;
    return row?.id || null;
  } catch { return null; }
}

export default async function Home() {
  const sample = await sampleTestId();
  return (
    <main>
      <div className="wrap">
        <section className="hero">
          <p className="badge reviewed" style={{ marginBottom: 12 }}>For independent UPSC mentors</p>
          <h1>Ask Claude for a mock test. Share a timed, auto-scored test link in two minutes.</h1>
          <p className="muted" style={{ fontSize: 17, maxWidth: 720 }}>
            Claude writes the questions. MockSprint makes them operational: you review and edit every question,
            publish a student link, and MockSprint runs the timer, applies UPSC negative marking and ranks your students.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link href="/signup" className="btn primary">Get your MCP link (free)</Link>
            {sample && <Link href={`/t/${sample}`} className="btn">Try a sample test as a student</Link>}
            <Link href="/login" className="btn">Log in</Link>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Reviewing MockSprint? Log in as the demo mentor: <b>demo@mocksprint.in</b> / <b>MockSprint@2026</b></p>
        </section>

        <section className="grid3" style={{ marginTop: 30 }}>
          <div className="card">
            <div className="step-n">1</div>
            <h3>Ask in Claude</h3>
            <p className="muted small">&ldquo;Create a 10-question UPSC Polity mock on Fundamental Rights.&rdquo; Claude writes it and saves it to MockSprint as a draft.</p>
          </div>
          <div className="card">
            <div className="step-n">2</div>
            <h3>Review, then publish</h3>
            <p className="muted small">AI can get answer keys wrong, so every test stays a draft until you check it. Edit anything, mark it reviewed, publish.</p>
          </div>
          <div className="card">
            <div className="step-n">3</div>
            <h3>Students take it</h3>
            <p className="muted small">Share one link in your Telegram or WhatsApp group. Timed test, +2 / &minus;0.66 scoring, instant results and a leaderboard.</p>
          </div>
        </section>

        <section className="card">
          <h2>Why not just use Claude?</h2>
          <div className="grid2">
            <div>
              <h3>Claude can</h3>
              <p className="muted small">Write good questions, options and explanations.</p>
            </div>
            <div>
              <h3>MockSprint does what Claude can&rsquo;t</h3>
              <p className="muted small">Keep the test saved and editable, deliver it to your whole cohort through one link, run the timer, score with negative marking, rank everyone and keep results after the chat ends.</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>No AI inside</h2>
          <p className="muted small">MockSprint has no AI model and no AI keys. You connect your own Claude through MCP, so your Claude plan does the writing and MockSprint stays cheap to run.</p>
        </section>

        <div className="footer">MockSprint · Built by Piyush Kaushik · Privacy: we store only what a test needs (the mentor&rsquo;s questions, and each student&rsquo;s name, answers and score). Student results are visible to their mentor and on that test&rsquo;s leaderboard.</div>
      </div>
    </main>
  );
}
