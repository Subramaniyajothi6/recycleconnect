// Admin API shapes (backend com.recycleconnect.admin and request.AdminRequestService).
import type { RequestCard } from "./types";

export type RequestPage = { rows: RequestCard[]; total: number; page: number; size: number; tabCounts: Record<string, number> };

export type CollectorOption = {
  id: number; name: string; zones: string; vehicle: string | null; inZone: boolean; load: number; capacity: number;
  eligible: boolean; reason: string | null;
};

export type BoardCell = { requestId: number; code: string; customer: string; mainCategory: string | null; kg: number; pickupStatus: string };
export type Board = {
  date: string; slots: string[]; open: boolean;
  rows: { collectorId: number; name: string; zones: string; load: number; capacity: number; onLeave: boolean; worksToday: boolean; slots: Record<string, BoardCell[]> }[];
  waiting: { request: RequestCard; suggestion: CollectorOption | null }[];
  recent: { code: string; customer: string; fromDate: string | null; fromSlot: string | null; toDate: string; toSlot: string; reason: string; by: string; at: string }[];
};

export type CustomerRow = {
  id: number; code: string; name: string; type: string; area: string | null; mobile: string; requests: number; kg: number;
  lastPickup: string | null; status: string; joined: string;
};
export type CustomerPage = { rows: CustomerRow[]; total: number; page: number; size: number; byType: Record<string, number>; activeLast30Days: number };

export type CollectorCard = {
  id: number; code: string; name: string; zones: string; vehicleType: string | null; vehicleNumber: string | null;
  status: string; available: boolean; activity: string; todayLoad: number; capacity: number; doneThisMonth: number;
  onTimePercent: number; mobile: string; registeredAt: string; idProofUploaded: boolean; workingDays: string[];
};
export type Collectors = { pending: CollectorCard[]; all: CollectorCard[]; activeCount: number; onLeaveCount: number };

export type CategoryRow = {
  id: number; code: string; name: string; unit: "KG" | "PCS"; accepts: string | null; warning: string | null; color: string;
  active: boolean; sortOrder: number; requests30Days: number;
};

export type ZoneRow = { id: number; name: string; code: string; lat: number | null; lng: number | null; city: string; collectors: string | null };

export type ComplaintDetail = {
  complaint: import("./types").Complaint; note: string | null; resolutionType: string | null;
  items: import("./types").Item[]; collector: string | null; customerConfirmed: boolean; collectedAt: string | null;
  evidencePhotos: number; activity: { at: string; text: string }[];
};

export type CategoryKg = { code: string; name: string; color: string; kg: number };
export type CollectorPerf = { id: number; name: string; zones: string | null; completed: number; failed: number; kg: number; onTimePercent: number; complaints: number };

export type Dashboard = {
  today: string; month: string;
  kpis: { totalCustomers: number; activeCollectors: number; pendingRequests: number; todaysPickups: number; completedThisMonth: number; failedThisMonth: number; totalKg: number; overdue: number };
  categories: CategoryKg[];
  customers: { active: number; newSignups: number; repeat: number; requests: number; byType: Record<string, number> };
  monthlyKg: { month: string; value: number }[];
  completedVsFailed: { month: string; completed: number; failed: number }[];
  areas: { area: string; lat: number | null; lng: number | null; requests: number; waiting: number }[];
  collectors: CollectorPerf[];
};

export type Analytics = {
  filters: { from: string; to: string; zoneId: number | null; customerType: string | null; categoryId: number | null };
  volume: { month: string; byCategory: Record<string, number>; total: number }[];
  categories: CategoryKg[];
  failReasons: { key: string; label: string; count: number; percent: number }[]; failedTotal: number;
  heat: { days: string[]; slots: string[]; counts: number[][]; max: number };
  accuracy: { category: string; color: string; differencePercent: number; samples: number }[];
  customerTypes: { key: string; label: string; count: number; percent: number }[];
  activeCustomers: number; repeatWithin60DaysPercent: number; collectors: CollectorPerf[];
};

export type ReportTable = {
  type: string; title: string; from: string; to: string; columns: { key: string; label: string; number: boolean }[];
  rows: (string | number | null)[][]; totals: (string | number | null)[] | null;
};

export type AuditRow = { id: number; at: string; who: string; role: string; action: string; entity: string; entityId: string | null; details: Record<string, unknown>; summary: string };
export type AuditPage = { rows: AuditRow[]; total: number; page: number; size: number };
