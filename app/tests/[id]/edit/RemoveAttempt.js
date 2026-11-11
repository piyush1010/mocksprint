"use client";
import { useTransition } from "react";
import { removeAttempt } from "@/app/actions";

export default function RemoveAttempt({ testId, attemptId, name }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn sm danger"
      disabled={pending}
      onClick={() => { if (confirm(`Remove ${name}'s attempt from the results?`)) start(() => removeAttempt(testId, attemptId)); }}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
