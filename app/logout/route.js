import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function logoutResponse(req) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set("ms_session", "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req) { return logoutResponse(req); }
export async function GET(req) { return logoutResponse(req); }
