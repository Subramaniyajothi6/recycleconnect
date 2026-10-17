import type { Role } from "./types";

export const SESSION_COOKIE = "rc_session";

/**
 * Reads the role and expiry from the backend's JWT without verifying the signature.
 * Only for optimistic routing in the proxy; the backend verifies every request.
 */
export function peekToken(token: string | undefined): { role: Role; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { role?: Role; exp?: number };
    if (!claims.role || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
    return { role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}
