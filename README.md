# MockSprint

**Claude writes UPSC mock tests. MockSprint makes them operational:** human review, publishing, a timed student link, UPSC negative marking (+2 / −0.66) and a leaderboard.

There is **no AI inside MockSprint** and no AI API keys. Mentors connect their own Claude through MCP.

- Live app: https://mocksprint-nine.vercel.app
- Demo mentor login: `demo@mocksprint.in` / `MockSprint@2026`

## Connect MockSprint to Claude

1. Log in and copy your personal MCP link from the dashboard. It looks like `https://mocksprint-nine.vercel.app/api/mcp/<your-key>`.
2. In Claude, go to **Settings → Connectors → Add custom connector**, name it `MockSprint` and paste the link.
3. In a new chat, switch MockSprint on in the tools menu and ask:
   *"Create a 5-question UPSC Prelims Polity mock test on Fundamental Rights in MockSprint."*
4. Open the editor link Claude returns, review the questions, mark the test reviewed, publish it, and share the student link.

## How it works

| Step | Who does it |
|---|---|
| Writing questions, options, answer keys, explanations | The mentor's own Claude |
| `create_mock_test` (MCP tool) saves the test as a draft | MockSprint |
| Edit, review gate (Draft → Reviewed → Published), publish | MockSprint (mentor) |
| Timed test, scoring with negative marking, leaderboard | MockSprint (students, no login) |

Each mentor's MCP link contains a private key, so tests created through it belong only to that mentor.

## Stack

Next.js on Vercel · Postgres on Supabase · MCP TypeScript SDK (stateless Streamable HTTP).

## Run locally

```
npm install
cp .env.example .env.local   # fill in DATABASE_URL and SESSION_SECRET
npm run dev
```
Tables and the demo account are created automatically on first request.
