"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <div className="card">
          <h1>Create your account</h1>
          <p className="muted small">You&rsquo;ll get a personal MCP link to connect MockSprint to your Claude.</p>
          {state?.error && <div className="notice bad">{state.error}</div>}
          <form action={action}>
            <div className="field"><label>Your name</label><input type="text" name="name" required /></div>
            <div className="field"><label>Email</label><input type="email" name="email" required autoComplete="email" /></div>
            <div className="field"><label>Password (8+ characters)</label><input type="password" name="password" required minLength={8} autoComplete="new-password" /></div>
            <button className="btn primary" disabled={pending} style={{ width: "100%" }}>{pending ? "Creating…" : "Create account"}</button>
          </form>
          <p className="small muted" style={{ marginTop: 14 }}>Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </div>
    </main>
  );
}
