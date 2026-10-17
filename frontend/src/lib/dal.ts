import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ApiError, backend } from "./backend";
import { getToken } from "./session";
import { HOME, type Me, type Role } from "./types";

/** Signs the user out when the API no longer accepts their session (expired, revoked or turned off). */
function handleAuth(e: unknown): never {
  if (e instanceof ApiError && (e.status === 401 || (e.status === 403 && /turned off/.test(e.message)))) {
    redirect("/signout");
  }
  throw e;
}

/**
 * The signed-in user, checked with the backend once per render.
 * Reads the session cookie, so call it inside a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<Me> => {
  await connection(); // per-user data: render only for a real request, never prerender
  const token = await getToken();
  if (!token) redirect("/login");
  try {
    return await backend<Me>("/api/auth/me", { token });
  } catch (e) {
    handleAuth(e);
  }
});

/** The signed-in user, who must have this role; anyone else goes to their own home screen. */
export async function requireRole(role: Role): Promise<Me> {
  const me = await getCurrentUser();
  if (me.role !== role) redirect(HOME[me.role]);
  return me;
}

/** A GET from a Server Component, with the user's token. Deduplicated per render. */
export const api = cache(async <T,>(path: string): Promise<T> => {
  await connection();
  const token = await getToken();
  if (!token) redirect("/login");
  try {
    return await backend<T>(path, { token });
  } catch (e) {
    handleAuth(e);
  }
});

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
