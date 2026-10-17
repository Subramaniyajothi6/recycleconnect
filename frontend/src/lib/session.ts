import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./token";

/** The backend JWT lives only in this httpOnly cookie; browser code never sees it. */
export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Call only from a Server Action or Route Handler. */
export async function setSession(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Call only from a Server Action or Route Handler. */
export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
