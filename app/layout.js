import "./globals.css";
import Link from "next/link";
import { currentMentor } from "@/lib/auth";
import { logout } from "./actions";

export const metadata = {
  title: "MockSprint: UPSC mock tests from Claude",
  description: "Claude writes the questions. MockSprint reviews, publishes, times, scores and ranks.",
};

export default async function RootLayout({ children }) {
  let mentor = null;
  try { mentor = await currentMentor(); } catch { mentor = null; }
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="logo">Mock<span>Sprint</span></Link>
            <div className="nav-links">
              {mentor ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <span className="muted small">{mentor.name}</span>
                  <form action={logout}><button className="btn sm" type="submit">Log out</button></form>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link href="/signup" className="btn sm primary">Get your MCP link</Link>
                </>
              )}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
