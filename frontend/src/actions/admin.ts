"use server";

import { call, type ActionResult } from "./result";

const r = (id: number, what: string) => `/api/admin/requests/${id}/${what}`;

export async function startReview(id: number): Promise<ActionResult> {
  return call(r(id, "review"));
}
export async function acceptRequest(id: number): Promise<ActionResult> {
  return call(r(id, "accept"));
}
export async function rejectRequest(id: number, reason: string): Promise<ActionResult> {
  return call(r(id, "reject"), { body: { reason } });
}
export async function askForInfo(id: number, reason: string): Promise<ActionResult> {
  return call(r(id, "request-info"), { body: { reason } });
}
export async function adminCancel(id: number, reason: string): Promise<ActionResult> {
  return call(r(id, "cancel"), { body: { reason } });
}
export async function scheduleRequest(id: number, date: string, slot: string, collectorId: number | null): Promise<ActionResult> {
  return call(r(id, "schedule"), { body: { date, slot, collectorId } });
}
export async function assignCollector(id: number, collectorId: number): Promise<ActionResult> {
  return call(r(id, "assign"), { body: { collectorId } });
}
export async function rescheduleRequest(id: number, date: string, slot: string, reason: string): Promise<ActionResult> {
  return call(r(id, "reschedule"), { body: { date, slot, reason } });
}
export async function adminFail(id: number, reason: string, note: string): Promise<ActionResult> {
  return call(r(id, "fail"), { body: { reason, note } });
}

export async function approveCollector(id: number): Promise<ActionResult> {
  return call(`/api/admin/collectors/${id}/approve`);
}
export async function rejectCollector(id: number, reason: string): Promise<ActionResult> {
  return call(`/api/admin/collectors/${id}/reject`, { body: { reason } });
}
export async function setCollectorAvailability(id: number, available: boolean): Promise<ActionResult> {
  return call(`/api/admin/collectors/${id}/availability`, { method: "PUT", body: { available } });
}
export async function setUserStatus(id: number, status: string, reason: string): Promise<ActionResult> {
  return call(`/api/admin/users/${id}/status`, { body: { status, reason } });
}

export type CategoryPayload = {
  code?: string; name: string; unit: string; accepts: string; warning: string; color: string; active: boolean; sortOrder: number;
};
export async function saveCategory(id: number | null, body: CategoryPayload): Promise<ActionResult> {
  return call(id ? `/api/admin/categories/${id}` : "/api/admin/categories", { method: id ? "PUT" : "POST", body });
}
export async function addNotAccepted(text: string): Promise<ActionResult> {
  return call("/api/admin/not-accepted", { body: { text } });
}
export async function removeNotAccepted(id: number): Promise<ActionResult> {
  return call(`/api/admin/not-accepted/${id}`, { method: "DELETE" });
}
export async function saveSettings(changes: Record<string, string>): Promise<ActionResult> {
  return call("/api/admin/settings", { method: "PUT", body: changes });
}
export async function saveZone(id: number, body: { name: string; code: string; lat: number | null; lng: number | null }): Promise<ActionResult> {
  return call(`/api/admin/zones/${id}`, { method: "PUT", body });
}

export async function reviewComplaint(id: number): Promise<ActionResult> {
  return call(`/api/admin/complaints/${id}/review`);
}
export async function noteComplaint(id: number, note: string): Promise<ActionResult> {
  return call(`/api/admin/complaints/${id}/note`, { body: { note } });
}
export async function resolveComplaint(id: number, resolution: string, reply: string, corrections: { categoryId: number; qty: number }[]): Promise<ActionResult> {
  return call(`/api/admin/complaints/${id}/resolve`, { body: { resolution, reply, corrections } });
}
