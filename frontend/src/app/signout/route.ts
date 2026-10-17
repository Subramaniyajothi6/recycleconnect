import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/token";

/** Clears a session the backend no longer accepts, then goes to sign-in. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
