import Form from "next/form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop, Pager, SearchForm } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { Pill, Skeleton, StatusPill } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { backend } from "@/lib/backend";
import { CUSTOMER_TYPE, PICKUP_LABEL, day, num, slot } from "@/lib/format";
import type { BookingOptions, Category, RequestDetail, Zone } from "@/lib/types";
import type { CollectorOption, Collectors, RequestPage } from "@/lib/admin-types";
import { ReviewPanel } from "./ReviewPanel";

export const metadata: Metadata = { title: "Collection requests" };

const TABS: [string, string][] = [["REVIEW", "Needs review"], ["ACCEPTED", "Accepted"], ["SCHEDULED", "Scheduled"], ["IN_PROGRESS", "In progress"], ["OVERDUE", "Overdue"], ["AWAITING_CONFIRMATION", "Awaiting confirmation"], ["CLOSED", "Closed"]];
/** The tab that holds a request in this status (used when a request is opened from another screen). */
const TAB_OF: Record<string, string> = {
  SUBMITTED: "REVIEW", UNDER_REVIEW: "REVIEW", INFO_REQUESTED: "REVIEW", ACCEPTED: "ACCEPTED", SCHEDULED: "SCHEDULED",
  ASSIGNED: "SCHEDULED", PICKUP_STARTED: "IN_PROGRESS", COLLECTED: "AWAITING_CONFIRMATION",
};
const FILTER_KEYS = ["tab", "q", "categoryId", "zoneId", "from", "to", "collectorId", "minQty", "maxQty", "customerType", "pickupStatus"] as const;

type SP = PageProps<"/admin/requests">["searchParams"];

export default function RequestsPage(props: PageProps<"/admin/requests">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: SP }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const f: Record<string, string> = {};
  for (const k of FILTER_KEYS) if (typeof sp[k] === "string" && sp[k]) f[k] = (sp[k] as string).slice(0, 100);
  const page = Math.max(0, Number(sp.page) || 0);
  const open = typeof sp.open === "string" && /^\d+$/.test(sp.open) ? Number(sp.open) : null;
  const optDate = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;

  // Opened from another screen (no tab given): show the tab the request is in, so list and panel match.
  const detail = open ? await api<RequestDetail>(`/api/admin/requests/${open}`) : null;
  if (!f.tab) f.tab = detail ? (detail.overdue ? "OVERDUE" : TAB_OF[detail.status] ?? "CLOSED") : "REVIEW";

  const [list, categories, zones, collectors, booking] = await Promise.all([
    api<RequestPage>(`/api/admin/requests${qs({ ...f, page, size: 25 })}`),
    backend<Category[]>("/api/catalog/categories"),
    backend<Zone[]>("/api/catalog/zones"),
    api<Collectors>("/api/admin/collectors"),
    backend<BookingOptions>("/api/catalog/booking-options"),
  ]);
  const options = detail && ["ACCEPTED", "FAILED", "SCHEDULED", "ASSIGNED"].includes(detail.status)
    ? await api<CollectorOption[]>(`/api/admin/requests/${detail.id}/collector-options${qs({ date: optDate ?? detail.scheduledDate ?? detail.preferredDate ?? undefined })}`)
    : [];
  const link = (extra: Record<string, string | number | undefined>) => `/admin/requests${qs({ ...f, ...extra })}`;

  return (
    <>
      <AdminTop title="Collection requests">
        <SearchForm action="/admin/requests" q={f.q} placeholder="Search by request ID, customer or mobile" keep={{ tab: f.tab }} />
      </AdminTop>
      <nav className="tabs" aria-label="Request groups">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/requests${qs({ tab: k, q: f.q })}`} aria-selected={f.tab === k}
            className={k === "OVERDUE" && list.tabCounts[k] ? "tab-bad" : undefined}>
            {l}<span className="c">{(list.tabCounts[k] ?? 0).toLocaleString("en-IN")}</span>
          </Link>
        ))}
      </nav>
      <div style={{ display: "contents" }} key={JSON.stringify(f)}>{/* resets the fields when the filters change */}
      <Form scroll={false} className="fbar" action="/admin/requests">
        <input type="hidden" name="tab" value={f.tab} />
        {f.q && <input type="hidden" name="q" value={f.q} />}
        <label className="fsel"><span>Waste type:</span>
          <select name="categoryId" defaultValue={f.categoryId ?? ""}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="fsel"><span>Area:</span>
          <select name="zoneId" defaultValue={f.zoneId ?? ""}><option value="">All</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label className="fsel"><span>Customer:</span>
          <select name="customerType" defaultValue={f.customerType ?? ""}><option value="">All types</option>{Object.entries(CUSTOMER_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="fsel"><span>Collector:</span>
          <select name="collectorId" defaultValue={f.collectorId ?? ""}><option value="">Any</option>{collectors.all.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="fsel"><span>Pickup step:</span>
          <select name="pickupStatus" defaultValue={f.pickupStatus ?? ""}><option value="">Any</option>{Object.entries(PICKUP_LABEL).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}</select></label>
        <label className="fsel"><span>From:</span><input type="date" name="from" defaultValue={f.from} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <label className="fsel"><span>To:</span><input type="date" name="to" defaultValue={f.to} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <label className="fsel"><span>Qty kg:</span>
          <input name="minQty" defaultValue={f.minQty} placeholder="min" inputMode="decimal" style={{ width: 44, border: 0, font: "inherit", background: "transparent" }} aria-label="Minimum quantity" />–
          <input name="maxQty" defaultValue={f.maxQty} placeholder="max" inputMode="decimal" style={{ width: 44, border: 0, font: "inherit", background: "transparent" }} aria-label="Maximum quantity" /></label>
        <button className="btn btn-ghost btn-sm" type="submit"><Icon name="filter" size={15} />Apply</button>
        <Link className="lnk" href={`/admin/requests?tab=${f.tab}`}>Clear</Link>
      </Form></div>

      <div className="req-layout" style={detail ? undefined : { gridTemplateColumns: "1fr" }}>
        <div className="req-table">
          <table className="tbl">
            <thead><tr><th>Request</th><th>Customer</th><th>Materials</th><th className="num">Est. qty</th><th>Date</th><th>Status</th><th>Collector</th></tr></thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id} className={r.id === open ? "sel" : ""}>
                  <td className="idc"><Link href={link({ open: r.id, page })}>{r.code}</Link></td>
                  <td className="cust-c"><Link href={link({ open: r.id, page })}><b>{r.customerName}</b><small>{r.customerType ? CUSTOMER_TYPE[r.customerType] : ""}{r.area ? `, ${r.area}` : ""}</small></Link></td>
                  <td><div className="mats">{r.items.map((i) => <span key={i.categoryId} className="mat"><b className="sw" style={{ background: `var(--c-${i.code}, ${i.color})` }} />{i.name}</span>)}</div></td>
                  <td className="num">{num(r.estimatedTotal)} kg</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.date ? `${day(r.date)} · ${slot(r.slot).replace(/:00/g, "")}` : "—"}{r.scheduled ? "" : <small className="muted"> asked</small>}</td>
                  <td><StatusPill status={r.status} />{r.overdue && <> <Pill tone="bad">Overdue</Pill></>}</td>
                  <td>{r.collectorName ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
              {list.rows.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 20 }}>No requests match.</td></tr>}
            </tbody>
          </table>
          <Pager page={list.page} size={list.size} total={list.total} href={(p) => link({ page: p, open: open ?? undefined })} />
        </div>
        {detail && <ReviewPanel r={detail} options={options} optionsDate={optDate ?? detail.scheduledDate ?? detail.preferredDate ?? ""} closeHref={link({ page })} slots={booking.slots} />}
      </div>
    </>
  );
}
