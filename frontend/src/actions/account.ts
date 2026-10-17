"use server";

import { ApiError, backend } from "@/lib/backend";
import { getToken, setSession } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";
import { call, type ActionResult } from "./result";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

/** Changes the password. Other devices are signed out; this one gets a fresh session. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  const token = await getToken();
  if (!token) redirect("/login");
  try {
    const auth = await backend<AuthResponse>("/api/account/password", { method: "PUT", body: { currentPassword, newPassword }, token });
    await setSession(auth.token, auth.expiresAt);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/signout");
      return { ok: false, message: e.message, fields: e.fields };
    }
    throw e;
  }
}

export async function savePreferences(emailNotifications: boolean, reminderEnabled: boolean, preferredLanguage: string): Promise<ActionResult> {
  return call("/api/account/preferences", { method: "PUT", body: { emailNotifications, reminderEnabled, preferredLanguage } });
}

export async function markNotificationRead(id: number): Promise<ActionResult> {
  return call(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return call("/api/notifications/read-all");
}
