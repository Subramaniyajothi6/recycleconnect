import Form from "next/form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop } from "@/components/admin";
import { Icon, type IconName } from "@/components/Icon";
import { Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { backend } from "@/lib/backend";
import { day, num, when } from "@/lib/format";
import type { ReportTable } from "@/lib/admin-types";
import type { Category, Zone } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };

const REPORTS: [string, IconName, string, string][] = [
  ["COLLECTION_VOLUME", "chart", "Collection volume", "Kilograms by month"],
  ["WASTE_CATEGORIES", "tag", "Waste categories", "Share of each material"],
  ["CUSTOMER_ACTIVITY", "users", "Customer activity", "Requests and kilograms per customer"],
  ["COLLECTOR_ACTIVITY", "truck", "Collector activity", "Pickups, kilograms and on-time rate"],
  ["PICKUP_COMPLETION", "check", "Pickup completion", "Completed, failed and cancelled"],
  ["FAILED_PICKUPS", "alert", "Failed pickups", "Each failure with its reason"],
  ["LOCATION_WISE", "pin", "Location-wise collection", "Kilograms by area and material"],
];

export default function ReportsPage(props: PageProps<"/admin/reports">) {
  return (
    <>
      <AdminTop title="Reports" sub="Pick a report, set filters, then download it as an Excel file" />
      <Suspense fallback={<Skeleton h={400} style={{ marginTop: 16 }} />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

function fmt(v: string | number | null, isNum: boolean) {
  if (v === null || v === undefined) return "";
  return isNum ? num(v, 1) : String(v);
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 40) : undefined);
  const type = REPORTS.some((r) => r[0] === s("type")) ? s("type")! : "LOCATION_WISE";
  const f = { from: s("from"), to: s("to"), zoneId: s("zoneId"), categoryId: s("categoryId") };
  const [t, zones, categories, recent] = await Promise.all([
    api<ReportTable>(`/api/admin/reports/${type}${qs(f)}`),
    backend<Zone[]>("/api/catalog/zones"),
    backend<Category[]>("/api/catalog/categories"),
    api<{ at: string; report: string }[]>("/api/admin/reports/recent-exports"),
  ]);
  const current = REPORTS.find((r) => r[0] === type)!;
  const exportQs = qs({ from: t.from, to: t.to, zoneId: f.zoneId, categoryId: f.categoryId });
  return (
    <div className="rep-layout">
      <nav className="replist" aria-label="Reports">
        {REPORTS.map(([k, ic, title, desc]) => (
          <Link key={k} className="repitem" aria-pressed={k === type} href={`/admin/reports${qs({ ...f, type: k })}`} style={{ color: "inherit", textDecoration: "none" }}>
            <span className="ico"><Icon name={ic} size={18} /></span><span><b>{title}</b><small>{desc}</small></span>
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
        <section className="card">
          <div className="ch">
            <div><h2>{current[2]}</h2><div className="sub">{current[3]}</div></div>
            <div className="exports">
              <a className="btn btn-primary btn-sm" href={`/admin/export/${type}${exportQs}${exportQs ? "&" : "?"}format=xlsx`}><Icon name="download" size={16} />Download Excel</a>
            </div>
          </div>
          <div style={{ display: "contents" }} key={JSON.stringify({ ...f, type })}>
          <Form scroll={false} className="repfilters" action="/admin/reports">
            <input type="hidden" name="type" value={type} />
            <div className="field"><label className="field-label" htmlFor="rp-from">From</label><input className="input" type="date" id="rp-from" name="from" defaultValue={t.from} /></div>
            <div className="field"><label className="field-label" htmlFor="rp-to">To</label><input className="input" type="date" id="rp-to" name="to" defaultValue={t.to} /></div>
            <div className="field"><label className="field-label" htmlFor="rp-area">Area</label>
              <select className="input" id="rp-area" name="zoneId" defaultValue={f.zoneId ?? ""}><option value="">All areas</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            <div className="field"><label className="field-label" htmlFor="rp-cat">Category</label>
              <select className="input" id="rp-cat" name="categoryId" defaultValue={f.categoryId ?? ""}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <button className="btn btn-ghost btn-sm" type="submit" style={{ gridColumn: "1 / -1", justifySelf: "start" }}>Update preview</button>
          </Form></div>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Preview</h2><div className="sub">{day(t.from)} – {day(t.to, { year: true })}, {t.rows.length} row{t.rows.length === 1 ? "" : "s"}</div></div></div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr>{t.columns.map((c) => <th key={c.key} className={c.number ? "num" : undefined}>{c.label}</th>)}</tr></thead>
              <tbody>{t.rows.slice(0, 100).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={t.columns[j].number ? "num" : undefined}>{j === 0 ? <b>{fmt(v, t.columns[j].number)}</b> : fmt(v, t.columns[j].number)}</td>)}</tr>)}</tbody>
              {t.totals && t.rows.length > 0 && <tfoot><tr>{t.totals.map((v, j) => <td key={j} className={t.columns[j].number ? "num" : undefined}>{fmt(v, t.columns[j].number)}</td>)}</tr></tfoot>}
            </table>
            {t.rows.length === 0 && <p className="muted" style={{ padding: 12 }}>No data for these filters.</p>}
            {t.rows.length > 100 && <p className="muted" style={{ padding: 12 }}>Showing the first 100 rows. Export to see all {t.rows.length}.</p>}
          </div>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Recent exports</h2></div></div>
          <ul className="recent">
            {recent.map((x, i) => <li key={i}><span>{REPORTS.find((r) => r[0] === x.report)?.[2] ?? x.report}</span><small>{when(x.at)}</small></li>)}
            {recent.length === 0 && <li className="muted">No exports yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
