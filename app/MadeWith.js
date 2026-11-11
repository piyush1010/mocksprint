import Link from "next/link";

export default function MadeWith() {
  return (
    <p className="small muted" style={{ textAlign: "center", marginTop: 18 }}>
      Made with <Link href="/"><b>MockSprint</b></Link> · Mentors: create timed UPSC mock tests from Claude, free
    </p>
  );
}
