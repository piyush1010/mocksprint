"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <div className="card">
          <h1>Log in</h1>
          <p className="muted small">Mentor account</p>
          {state?.error && <div className="notice bad">{state.error}</div>}
          <form action={action}>
            <div className="field"><label>Email</label><input type="email" name="email" required autoComplete="email" /></div>
            <div className="field"><label>Password</label><input type="password" name="password" required autoComplete="current-password" /></div>
            <button className="btn primary" disabled={pending} style={{ width: "100%" }}>{pending ? "Logging in…" : "Log in"}</button>
          </form>
          <p className="small muted" style={{ marginTop: 14 }}>New here? <Link href="/signup">Create a free account</Link></p>
        </div>
      </div>
    </main>
  );
}
