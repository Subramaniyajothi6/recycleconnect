// What every Server Action returns. Kept separate from "use server" files so it can hold plain helpers.
import "server-only";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { ApiError, backend } from "@/lib/backend";
import { getToken } from "@/lib/session";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; message: string; fields: Record<string, string> };

/**
 * Calls the API as the signed-in user and turns the outcome into an ActionResult.
 * On success the current page is refreshed so it shows the new state.
 * The API checks the user's role and ownership itself; this only forwards the session.
 */
export async function call(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<ActionResult> {
  const token = await getToken();
  if (!token) redirect("/login");
  try {
    const data = await backend<unknown>(path, { method: opts.method ?? "POST", body: opts.body, form: opts.form, token });
    refresh();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/signout");
      return { ok: false, message: e.message, fields: e.fields };
    }
    throw e;
  }
}
