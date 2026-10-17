// Shapes returned by the Spring Boot API. Keep in step with the backend DTOs (records in each module).

export type Role = "CUSTOMER" | "COLLECTOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "PENDING_APPROVAL";
export type CustomerType = "HOUSEHOLD" | "SHOP" | "OFFICE" | "INSTITUTION" | "BUSINESS";
export type ContactPreference = "PHONE" | "EMAIL" | "APP";
export type VehicleType = "CARGO_TRICYCLE" | "THREE_WHEELER" | "MINI_TRUCK";
export type Day = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type AddressView = {
  id: number; label: string | null; line1: string; area: string | null; city: string; district: string | null;
  state: string | null; pin: string | null; lat: number | null; lng: number | null; isDefault: boolean;
};

export type Zone = { id: number; name: string; code: string; lat?: number | null; lng?: number | null };

export type Me = {
  id: number; role: Role; status: UserStatus; name: string; email: string | null; mobile: string;
  preferredLanguage: string; emailNotifications: boolean; reminderEnabled: boolean; memberSince: string;
  customer: { customerType: CustomerType; preferredContact: ContactPreference; addresses: AddressView[] } | null;
  collector: {
    vehicleType: VehicleType | null; vehicleNumber: string | null; available: boolean; zones: Zone[];
    workingDays: Day[]; approvedAt: string | null; idProofUploaded: boolean;
  } | null;
};

export type AuthResponse = { token: string; expiresAt: string; user: Me };

export type ApiErrorBody = { message: string; fields: Record<string, string> };

export type Category = { id: number; code: string; name: string; unit: "KG" | "PCS"; accepts: string | null; warning: string | null; color: string };

export type BookingOptions = {
  days: { date: string; open: boolean; slots: string[] }[]; slots: string[]; workingDays: string[];
  openTime: string; closeTime: string; cancelCutoff: string; horizonDays: number; photoRequired: boolean; maxUploadMb: number;
};

export type Item = {
  categoryId: number; code: string; name: string; color: string; unit: "KG" | "PCS"; estimated: number | null;
  actual: number | null; actualUnit: "KG" | "PCS" | null; addedByCollector: boolean;
};

export type Person = { id: number; name: string; mobile: string; detail: string | null };

export type PickupView = {
  id: number; collector: Person; date: string; slot: string; status: string; assignedAt: string;
  acceptedAt: string | null; startedAt: string | null; arrivedAt: string | null; collectedAt: string | null;
  completedAt: string | null; failReason: string | null; failNote: string | null; collectorNotes: string | null;
};

export type RequestDetail = {
  id: number; code: string; status: string; customer: Person; customerType: string | null; addressLabel: string | null;
  address: string; area: string | null; lat: number | null; lng: number | null; zoneId: number | null; zoneName: string | null;
  preferredDate: string | null; preferredSlot: string | null; scheduledDate: string | null; scheduledSlot: string | null;
  notes: string | null; items: Item[]; photos: { id: number; kind: "CUSTOMER" | "EVIDENCE"; uploadedAt: string }[];
  pickup: PickupView | null; pastPickups: PickupView[];
  reschedules: { fromDate: string | null; fromSlot: string | null; toDate: string; toSlot: string; reason: string; by: string; at: string }[];
  timeline: { key: string; label: string; done: boolean; current: boolean; at: string | null; detail: string | null }[];
  history: { from: string | null; to: string; by: string; at: string; note: string | null }[];
  confirmation: { confirmed: boolean; feedback: string | null; at: string; auto: boolean } | null;
  rejectReason: string | null; infoRequest: string | null; cancelReason: string | null; cancelledBy: string | null;
  cancelledAt: string | null; createdAt: string; submittedAt: string | null; completedAt: string | null; addressId: number | null;
  actions: { canEdit: boolean; canSubmit: boolean; canCancel: boolean; cancelUntil: string | null; canConfirm: boolean; canComplain: boolean };
  overdue: boolean;
};

export type RequestCard = {
  id: number; code: string; status: string; date: string | null; slot: string | null; scheduled: boolean; items: Item[];
  collectorName: string | null; customerName: string; customerType: string | null; area: string | null;
  estimatedTotal: number; actualTotal: number; note: string; createdAt: string; updatedAt: string; pickupStatus: string | null;
  overdue: boolean;
};

export type Summary = {
  total: number; completed: number; cancelled: number; failed: number; active: number; drafts: number; kg: number;
  byCategory: { code: string; name: string; color: string; unit: string; qty: number }[];
  months: { month: string; kg: number }[]; since: string;
};

export type Notification = { id: number; kind: string; title: string; body: string | null; link: string | null; read: boolean; at: string };
export type Inbox = { unread: number; items: Notification[] };

export type Complaint = {
  id: number; code: string; requestCode: string | null; requestId: number | null; customer: string; type: string;
  typeLabel: string; status: "OPEN" | "IN_REVIEW" | "RESOLVED"; assignedTo: string | null; createdAt: string;
  resolvedAt: string | null; reply: string | null; description: string;
};

export type Stop = {
  pickupId: number; requestId: number; code: string; customer: string; customerType: string | null; area: string | null;
  address: string; lat: number | null; lng: number | null; date: string; slot: string; pickupStatus: string; items: Item[];
  estimatedKg: number; actualKg: number; failReason: string | null; notes: string | null;
};

export type CollectorToday = {
  date: string; counts: { today: number; pending: number; completed: number; failed: number; kg: number };
  stops: Stop[]; needsAnswer: Stop[]; zones: string;
};

export type CollectorAssigned = { needsAnswer: Stop[]; days: { date: string; count: number; estimatedKg: number; stops: Stop[] }[] };

export type CollectorStats = { completed: number; failed: number; kg: number; onTimePercent: number };

export type CollectorHistory = { month: string; stats: CollectorStats; days: { date: string; kg: number; stops: Stop[] }[] };

/** Where each role lands after signing in. */
export const HOME: Record<Role, string> = {
  CUSTOMER: "/customer",
  COLLECTOR: "/collector",
  ADMIN: "/admin",
};
