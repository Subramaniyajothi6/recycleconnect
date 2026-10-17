import Form from "next/form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop, SearchForm } from "@/components/admin";
import { Pill, Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { COMPLAINT_TYPES, when } from "@/lib/format";
import type { ComplaintDetail } from "@/lib/admin-types";
import type { Complaint } from "@/lib/types";
import { ComplaintPanel } from "./ComplaintPanel";

export const metadata: Metadata = { title: "Complaints" };

const STATUS: Record<string, [string, "warn" | "info" | "done"]> = { OPEN: ["Open", "warn"], IN_REVIEW: ["In review", "info"], RESOLVED: ["Resolved", "done"] };

export default function ComplaintsPage(props: PageProps<"/admin/complaints">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/complaints">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 100) : undefined);
  const f = { status: s("status"), type: s("type"), q: s("q") };
  const open = s("open");
  const [data, detail] = await Promise.all([
    api<{ rows: Complaint[]; counts: Record<string, number> }>(`/api/admin/complaints${qs(f)}`),
    open && /^\d+$/.test(open) ? api<ComplaintDetail>(`/api/admin/complaints/${open}`) : Promise.resolve(null),
  ]);
  const all = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const href = (extra: Record<string, string | undefined>) => `/admin/complaints${qs({ ...f, ...extra })}`;
  return (
    <>
      <AdminTop title="Complaints" sub="Reply within 2 working days">
        <SearchForm action="/admin/complaints" q={f.q} placeholder="Search complaint, request or customer" keep={{ status: f.status }} />
      </AdminTop>
      <nav className="tabs" aria-label="Complaint status">
        {(["OPEN", "IN_REVIEW", "RESOLVED"] as const).map((k) => (
          <Link key={k} href={href({ status: k, open: undefined })} aria-selected={f.status === k}>{STATUS[k][0]}<span className="c">{data.counts[k] ?? 0}</span></Link>
        ))}
        <Link href={href({ status: undefined, open: undefined })} aria-selected={!f.status}>All<span className="c">{all}</span></Link>
      </nav>
      <div style={{ display: "contents" }} key={JSON.stringify(f)}>{/* resets the fields when the filters change */}
      <Form scroll={false} className="toolbar" action="/admin/complaints">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="fsel"><span>Type:</span>
          <select name="type" defaultValue={f.type ?? ""}><option value="">All</option>{COMPLAINT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <button className="btn btn-ghost btn-sm" type="submit">Apply</button>
      </Form></div>
      <div className="req-layout" style={detail ? { gridTemplateColumns: "minmax(0,1fr) 390px" } : { gridTemplateColumns: "1fr" }}>
        <div className="req-table">
          <table className="tbl">
            <thead><tr><th>Complaint</th><th>Customer</th><th>Issue</th><th>Raised</th><th>Assigned</th><th>Status</th></tr></thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id} className={String(c.id) === open ? "sel" : ""}>
                  <td className="idc"><Link href={href({ open: String(c.id) })}>{c.code}<br /><small className="muted" style={{ fontWeight: 500 }}>{c.requestCode ?? "—"}</small></Link></td>
                  <td><b>{c.customer}</b></td><td>{c.typeLabel}</td><td className="nowrap">{when(c.createdAt)}</td>
                  <td>{c.assignedTo ?? "—"}</td><td><Pill tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Pill></td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={6} className="muted" style={{ padding: 20 }}>No complaints here.</td></tr>}
            </tbody>
          </table>
        </div>
        {detail && <ComplaintPanel d={detail} closeHref={href({ open: undefined })} />}
      </div>
    </>
  );
}
