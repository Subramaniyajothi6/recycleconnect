"use server";

import { redirect } from "next/navigation";
import { call, type ActionResult } from "./result";

export type RequestPayload = {
  items: { categoryId: number; qty: number }[];
  addressId: number;
  lat: number | null;
  lng: number | null;
  preferredDate: string | null;
  preferredSlot: string | null;
  notes: string;
  submit: boolean;
};

/** Creates or updates a request (draft or submitted). Goes to the request page when submitted. */
export async function saveRequest(id: number | null, payload: RequestPayload): Promise<ActionResult> {
  const r = await call(id ? `/api/customer/requests/${id}` : "/api/customer/requests", {
    method: id ? "PUT" : "POST",
    body: payload,
  });
  if (r.ok && payload.submit) {
    const saved = r.data as { id: number };
    redirect(`/customer/requests/${saved.id}?sent=1`);
  }
  return r;
}

export async function deleteDraft(id: number): Promise<ActionResult> {
  const r = await call(`/api/customer/requests/${id}`, { method: "DELETE" });
  if (r.ok) redirect("/customer/requests?tab=draft");
  return r;
}

export async function cancelRequest(id: number, reason: string): Promise<ActionResult> {
  return call(`/api/customer/requests/${id}/cancel`, { body: { reason } });
}

export async function confirmCollection(id: number, feedback: string): Promise<ActionResult> {
  return call(`/api/customer/requests/${id}/confirm`, { body: { confirmed: true, feedback } });
}

export async function uploadRequestPhoto(id: number, fd: FormData): Promise<ActionResult> {
  return call(`/api/customer/requests/${id}/photos`, { form: fd });
}

export async function deleteRequestPhoto(id: number, photoId: number): Promise<ActionResult> {
  return call(`/api/customer/requests/${id}/photos/${photoId}`, { method: "DELETE" });
}

export async function raiseComplaint(requestId: number | null, type: string, description: string): Promise<ActionResult> {
  return call("/api/customer/complaints", { body: { requestId, type, description } });
}

export async function updateProfile(body: { name: string; email: string; customerType: string; preferredContact: string }): Promise<ActionResult> {
  return call("/api/customer/profile", { method: "PUT", body });
}

export type AddressPayload = {
  label: string; line1: string; area: string; city: string; district: string; state: string; pin: string;
  lat: number | null; lng: number | null;
};

export async function saveAddress(id: number | null, body: AddressPayload): Promise<ActionResult> {
  return call(id ? `/api/customer/addresses/${id}` : "/api/customer/addresses", { method: id ? "PUT" : "POST", body });
}

export async function makeDefaultAddress(id: number): Promise<ActionResult> {
  return call(`/api/customer/addresses/${id}/default`);
}

export async function deleteAddress(id: number): Promise<ActionResult> {
  return call(`/api/customer/addresses/${id}`, { method: "DELETE" });
}
