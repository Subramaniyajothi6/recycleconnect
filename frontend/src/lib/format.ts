// Display helpers shared by server and client components. Wording follows the approved design.

const TZ = "Asia/Kolkata";

export type Tone = "neutral" | "info" | "warn" | "active" | "done" | "muted" | "bad";

/** Customer-facing request status (brief §7) with plain labels (§28). */
export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  UNDER_REVIEW: { label: "Under review", tone: "info" },
  INFO_REQUESTED: { label: "More info needed", tone: "warn" },
  ACCEPTED: { label: "Accepted", tone: "info" },
  REJECTED: { label: "Rejected", tone: "bad" },
  SCHEDULED: { label: "Scheduled", tone: "info" },
  ASSIGNED: { label: "Collector assigned", tone: "active" },
  PICKUP_STARTED: { label: "Pickup in progress", tone: "active" },
  COLLECTED: { label: "Collected — confirm", tone: "warn" },
  COMPLETED: { label: "Completed", tone: "done" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
  FAILED: { label: "Pickup failed", tone: "bad" },
};

/** The collector's steps (brief §11) and the button that moves to the next one. */
export const PICKUP_FLOW: { id: string; label: string; action: string | null }[] = [
  { id: "ASSIGNED", label: "Assigned", action: "Accept pickup" },
  { id: "ACCEPTED", label: "Accepted", action: "Start trip" },
  { id: "ON_THE_WAY", label: "On the way", action: "I have arrived" },
  { id: "ARRIVED", label: "Arrived", action: "Start collection" },
  { id: "COLLECTION_STARTED", label: "Collection started", action: "Save quantities" },
  { id: "COLLECTED", label: "Collected", action: "Mark completed" },
  { id: "COMPLETED", label: "Completed", action: null },
];

export const PICKUP_LABEL: Record<string, { label: string; tone: Tone }> = {
  ASSIGNED: { label: "New — accept it", tone: "warn" },
  ACCEPTED: { label: "Accepted", tone: "info" },
  ON_THE_WAY: { label: "On the way", tone: "active" },
  ARRIVED: { label: "Arrived", tone: "active" },
  COLLECTION_STARTED: { label: "Collecting now", tone: "active" },
  COLLECTED: { label: "Collected", tone: "done" },
  COMPLETED: { label: "Completed", tone: "done" },
  FAILED: { label: "Failed", tone: "bad" },
};

export const FAIL_REASONS: { value: string; label: string }[] = [
  { value: "CUSTOMER_UNAVAILABLE", label: "Customer unavailable" },
  { value: "INCORRECT_ADDRESS", label: "Incorrect address" },
  { value: "MATERIAL_UNAVAILABLE", label: "Material unavailable" },
  { value: "UNABLE_TO_REACH", label: "Unable to reach location" },
  { value: "UNSAFE_MATERIAL", label: "Unsafe or invalid material" },
  { value: "OTHER", label: "Other" },
];

export const COMPLAINT_TYPES: { value: string; label: string }[] = [
  { value: "COLLECTOR_DID_NOT_ARRIVE", label: "Collector did not arrive" },
  { value: "WRONG_QUANTITY", label: "Wrong quantity recorded" },
  { value: "WRONG_CATEGORY", label: "Wrong material category" },
  { value: "PICKUP_DELAYED", label: "Pickup delayed" },
  { value: "POOR_SERVICE", label: "Poor service" },
  { value: "OTHER", label: "Other" },
];

export const CUSTOMER_TYPE: Record<string, string> = {
  HOUSEHOLD: "Household", SHOP: "Shop", OFFICE: "Office", INSTITUTION: "Institution", BUSINESS: "Business",
};

export const VEHICLE: Record<string, string> = {
  CARGO_TRICYCLE: "Cargo tricycle", THREE_WHEELER: "Three-wheeler", MINI_TRUCK: "Mini truck",
};

export const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

/** "08:00-10:00" → "08:00 – 10:00". */
export function slot(s: string | null | undefined) {
  return s ? s.replace("-", " – ") : "";
}

/** "2026-10-07" → "Wed 7 Oct". Dates without a time are calendar dates, not instants. */
export function day(iso: string | null | undefined, opts: { year?: boolean } = {}) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", ...(opts.year ? { year: "numeric" } : {}), timeZone: "UTC",
  });
}

/** An instant in Chennai time: "6 Oct, 11:02". */
export function when(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

export function timeOnly(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

/** Today's date in Chennai as YYYY-MM-DD. */
export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

export function num(n: number | string | null | undefined, digits = 1) {
  if (n === null || n === undefined || n === "") return "0";
  const v = typeof n === "string" ? Number(n) : n;
  return v.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function qty(n: number | string | null | undefined, unit: string | null | undefined) {
  return `${num(n)} ${unit === "PCS" ? "pcs" : "kg"}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Formats a stored 10-digit mobile as "+91 98400 12345". */
export function mobile(m: string) {
  return m.length === 10 ? `+91 ${m.slice(0, 5)} ${m.slice(5)}` : m;
}

export function greeting() {
  const h = Number(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
