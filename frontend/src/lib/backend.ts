import "server-only";

import { headers } from "next/headers";
import type { ApiErrorBody } from "./types";

const BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData; token?: string };

/**
 * Passes the browser's IP on to the API so its rate limits apply per person, not per server.
 * The API trusts this header only from the Next.js server's own address (see backend TRUSTED_PROXIES).
 */
async function clientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || undefined;
  } catch {
    return undefined;
  }
}

/** Calls the Spring Boot API from the server. Throws ApiError with the API's own message on failure. */
export async function backend<T>(path: string, { method = "GET", body, form, token }: Options = {}): Promise<T> {
  const res = await raw(path, { method, body, form, token });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data as Partial<ApiErrorBody> | null;
    throw new ApiError(res.status, err?.message ?? "Something went wrong. Try again.", err?.fields ?? {});
  }
  return data as T;
}

/** The raw response, for files and exports. */
export async function raw(path: string, { method = "GET", body, form, token }: Options = {}): Promise<Response> {
  const ip = await clientIp();
  try {
    return await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "We can't reach RecycleConnect right now. Try again in a minute.");
  }
}
