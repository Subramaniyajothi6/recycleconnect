"use server";

import { redirect } from "next/navigation";
import { ApiError, backend } from "@/lib/backend";
import { clearSession, setSession } from "@/lib/session";
import { HOME, type AuthResponse } from "@/lib/types";

/** What a form gets back when the API refuses it. Field keys match the API's (e.g. "address.pin"). */
export type FormState = { message?: string; fields?: Record<string, string> } | undefined;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optional = (fd: FormData, key: string) => text(fd, key) || null;
const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);
const number = (fd: FormData, key: string) => {
  const v = text(fd, key);
  return v === "" || Number.isNaN(Number(v)) ? null : Number(v);
};

const NEEDS_AGREEMENT: FormState = {
  message: "Check the highlighted fields.",
  fields: { agree: "Tick the box to agree before you continue." },
};

function failure(e: unknown): FormState {
  if (e instanceof ApiError) return { message: e.message, fields: e.fields };
  throw e;
}

/** Only follow ?next= inside the signed-in user's own area. */
function landing(home: string, next: string) {
  return next.startsWith(home + "/") || next === home ? next : home;
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  let auth: AuthResponse;
  try {
    auth = await backend<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { identifier: text(fd, "identifier"), password: String(fd.get("password") ?? "") },
    });
  } catch (e) {
    return failure(e);
  }
  await setSession(auth.token, auth.expiresAt);
  redirect(landing(HOME[auth.user.role], text(fd, "next")));
}

export async function registerCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("agree") !== "on") return NEEDS_AGREEMENT;
  let auth: AuthResponse;
  try {
    auth = await backend<AuthResponse>("/api/auth/register/customer", {
      method: "POST",
      body: {
        name: text(fd, "name"),
        customerType: optional(fd, "customerType"),
        mobile: text(fd, "mobile"),
        email: text(fd, "email"),
        preferredContact: optional(fd, "preferredContact"),
        password: String(fd.get("password") ?? ""),
        address: {
          line1: text(fd, "line1"),
          area: text(fd, "area"),
          city: text(fd, "city"),
          district: text(fd, "district"),
          state: text(fd, "state"),
          pin: text(fd, "pin"),
          lat: number(fd, "lat"),
          lng: number(fd, "lng"),
        },
      },
    });
  } catch (e) {
    return failure(e);
  }
  await setSession(auth.token, auth.expiresAt);
  redirect(HOME.CUSTOMER);
}

export async function registerCollector(_prev: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("agree") !== "on") return NEEDS_AGREEMENT;
  let auth: AuthResponse;
  try {
    auth = await backend<AuthResponse>("/api/auth/register/collector", {
      method: "POST",
      body: {
        name: text(fd, "name"),
        mobile: text(fd, "mobile"),
        email: text(fd, "email"),
        vehicleType: optional(fd, "vehicleType"),
        vehicleNumber: text(fd, "vehicleNumber"),
        zoneIds: list(fd, "zoneIds").map(Number),
        workingDays: list(fd, "workingDays"),
        password: String(fd.get("password") ?? ""),
      },
    });
  } catch (e) {
    return failure(e);
  }
  await setSession(auth.token, auth.expiresAt);
  // ID proof is optional at sign-up; if it fails here the waiting screen offers the upload again.
  const proof = fd.get("idProof");
  if (proof instanceof File && proof.size > 0) {
    const upload = new FormData();
    upload.set("file", proof);
    await backend("/api/collector/id-proof", { method: "POST", form: upload, token: auth.token }).catch(() => undefined);
  }
  redirect(HOME.COLLECTOR);
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
