import Form from "next/form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop, Pager, SearchForm } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { Pill, Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { CUSTOMER_TYPE, day, initials, mobile, num } from "@/lib/format";
import type { CustomerPage } from "@/lib/admin-types";
import type { Me, Zone } from "@/lib/types";
import { backend } from "@/lib/backend";
import { StatusActions } from "../StatusActions";

export const metadata: Metadata = { title: "Customers" };

const STATUS_PILL: Record<string, [string, "done" | "muted" | "bad"]> = { ACTIVE: ["Active", "done"], INACTIVE: ["Inactive", "muted"], BLOCKED: ["Blocked", "bad"] };
const AVATAR = ["plastic", "paper", "cardboard", "glass", "ewaste", "metal"];

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 100) : undefined);
  const f = { q: s("q"), type: s("type"), status: s("status"), area: s("area") };
  const page = Math.max(0, Number(sp.page) || 0);
  const view = s("view");
  const [data, record, zones] = await Promise.all([
    api<CustomerPage>(`/api/admin/customers${qs({ ...f, page, size: 25 })}`),
    view && /^\d+$/.test(view) ? api<Me>(`/api/admin/customers/${view}`) : Promise.resolve(null),
    backend<Zone[]>("/api/catalog/zones"),
  ]);
  const total = Object.values(data.byType).reduce((a, b) => a + b, 0);
  const href = (extra: Record<string, string | number | undefined>) => `/admin/customers${qs({ ...f, ...extra })}`;

  return (
    <>
      <AdminTop title="Customers" sub={`${num(total, 0)} registered, ${num(data.activeLast30Days, 0)} active in the last 30 days`}>
        <SearchForm action="/admin/customers" q={f.q} placeholder="Search name, mobile, email or customer ID" keep={{ type: f.type, status: f.status, area: f.area }} />
      </AdminTop>
      <nav className="tabs" aria-label="Customer types">
        <Link href={href({ type: undefined, page: 0, view: undefined })} aria-selected={!f.type}>All<span className="c">{num(total, 0)}</span></Link>
        {Object.entries(CUSTOMER_TYPE).map(([k, l]) => (
          <Link key={k} href={href({ type: k, page: 0, view: undefined })} aria-selected={f.type === k}>{l}<span className="c">{num(data.byType[k] ?? 0, 0)}</span></Link>
        ))}
      </nav>
      <div style={{ display: "contents" }} key={JSON.stringify(f)}>{/* resets the fields when the filters change */}
      <Form scroll={false} className="toolbar" action="/admin/customers">
        {f.type && <input type="hidden" name="type" value={f.type} />}
        {f.q && <input type="hidden" name="q" value={f.q} />}
        <label className="fsel"><span>Status:</span>
          <select name="status" defaultValue={f.status ?? ""}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option></select></label>
        <label className="fsel"><span>Area:</span>
          <select name="area" defaultValue={f.area ?? ""}><option value="">Any</option>{zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}</select></label>
        <button className="btn btn-ghost btn-sm" type="submit"><Icon name="filter" size={15} />Apply</button>
        {(f.status || f.area) && <Link className="lnk" href={href({ status: undefined, area: undefined, page: 0, view: undefined })}>Clear</Link>}
      </Form></div>
      {record && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="ch"><div><h2>{record.name}</h2><div className="sub">CU-{String(record.id).padStart(5, "0")} · {CUSTOMER_TYPE[record.customer?.customerType ?? "HOUSEHOLD"]} · joined {day(record.memberSince.slice(0, 10))}</div></div>
            <Link className="lnk" href={href({ view: undefined, page })}>Close</Link></div>
          <div className="kv-grid">
            <Icon name="phone" size={16} /><span>{mobile(record.mobile)}</span>
            <Icon name="message" size={16} /><span>{record.email}</span>
            {record.customer?.addresses.map((a) => [<Icon key={`i${a.id}`} name="pin" size={16} />, <span key={a.id}>{a.label}: {[a.line1, a.area, a.city, a.pin].filter(Boolean).join(", ")}</span>])}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Opening this record was written to the audit log.</p>
        </div>
      )}
      <div className="tcard">
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Type</th><th>Area</th><th>Mobile</th><th className="num">Requests</th><th className="num">Collected</th><th>Last pickup</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.rows.map((c) => (
              <tr key={c.id}>
                <td><div className="who-c"><span className="avatar" style={{ background: `var(--c-${AVATAR[c.name.length % 6]})` }}>{initials(c.name)}</span><span><b>{c.name}</b><small>{c.code}</small></span></div></td>
                <td>{CUSTOMER_TYPE[c.type] ?? c.type}</td><td>{c.area ?? "—"}</td><td className="nowrap">{c.mobile}</td>
                <td className="num">{c.requests}</td><td className="num">{num(c.kg)} kg</td><td className="nowrap">{c.lastPickup ? day(c.lastPickup) : "—"}</td>
                <td><Pill tone={STATUS_PILL[c.status]?.[1] ?? "muted"}>{STATUS_PILL[c.status]?.[0] ?? c.status}</Pill></td>
                <td><div className="rowact"><Link className="lnk" href={href({ view: c.id, page })}>View</Link><StatusActions id={c.id} status={c.status} name={c.name} /></div></td>
              </tr>
            ))}
            {data.rows.length === 0 && <tr><td colSpan={9} className="muted" style={{ padding: 20 }}>No customers match.</td></tr>}
          </tbody>
        </table>
        <Pager page={data.page} size={data.size} total={data.total} href={(p) => href({ page: p })} />
      </div>
      <p className="lock"><Icon name="shield" size={16} />Mobile numbers are partly hidden in lists. Opening a customer record is written to the audit log.</p>
    </>
  );
}
