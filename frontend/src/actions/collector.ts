"use server";

import { call, type ActionResult } from "./result";

export async function pickupStep(pickupId: number, to: string): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/step`, { body: { to } });
}

export async function declinePickup(pickupId: number, reason: string): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/decline`, { body: { reason } });
}

export async function recordQuantities(pickupId: number, items: { categoryId: number; qty: number; unit: string }[], notes: string): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/record`, { body: { items, notes } });
}

export async function completePickup(pickupId: number): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/complete`);
}

export async function failPickup(pickupId: number, reason: string, note: string): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/fail`, { body: { reason, note } });
}

export async function uploadEvidence(pickupId: number, fd: FormData): Promise<ActionResult> {
  return call(`/api/collector/pickups/${pickupId}/photos`, { form: fd });
}

export async function setAvailable(available: boolean): Promise<ActionResult> {
  return call("/api/collector/availability", { method: "PUT", body: { available } });
}

export async function uploadIdProof(fd: FormData): Promise<ActionResult> {
  return call("/api/collector/id-proof", { form: fd });
}
