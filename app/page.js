import Link from "next/link";

export default function Home() {
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
            <Link href="/login" className="btn">Log in</Link>
          </div>
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
              <p className="muted small">Keep the test saved and editable, host it for 500 students at once, run the timer, score with negative marking, rank everyone and keep results after the chat ends.</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>No AI inside</h2>
          <p className="muted small">MockSprint has no AI model and no AI keys. You connect your own Claude through MCP, so your Claude plan does the writing and MockSprint stays cheap to run.</p>
        </section>

        <div className="footer">MockSprint · Built by Piyush Kaushik</div>
      </div>
    </main>
  );
}
