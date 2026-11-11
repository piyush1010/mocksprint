import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "ms_session";

function secret() {
  return process.env.SESSION_SECRET || "dev-only-secret-change-me";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function setSession(mentorId) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = `${mentorId}.${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentMentor() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const expected = sign(`${id}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  const sql = await db();
  const [m] = await sql`select id, name, email, mcp_key from mentors where id = ${id}`;
  return m || null;
}
