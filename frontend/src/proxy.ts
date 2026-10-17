import { NextResponse, type NextRequest } from "next/server";
import { peekToken, SESSION_COOKIE } from "@/lib/token";
import { HOME, type Role } from "@/lib/types";

const AUTH_PAGES = ["/login", "/register"];
const AREAS: Record<string, Role> = { "/customer": "CUSTOMER", "/collector": "COLLECTOR", "/admin": "ADMIN" };

/**
 * Optimistic routing only: reads the role from the session cookie without calling the backend.
 * Every page and Server Action still checks the user through the DAL / backend.
 */
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const session = peekToken(raw);

  const area = Object.keys(AREAS).find((p) => path === p || path.startsWith(p + "/"));
  const onAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(p + "/"));

  let res: NextResponse | undefined;
  if (session && (path === "/" || onAuthPage)) {
    res = NextResponse.redirect(new URL(HOME[session.role], req.url));
  } else if (session && area && AREAS[area] !== session.role) {
    res = NextResponse.redirect(new URL(HOME[session.role], req.url));
  } else if (!session && area) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path);
    res = NextResponse.redirect(login);
  }
  res ??= NextResponse.next();

  // An expired or malformed cookie is useless; drop it.
  if (raw && !session) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|signout|.*\.(?:png|jpg|svg|ico|webp)$).*)"],
};
