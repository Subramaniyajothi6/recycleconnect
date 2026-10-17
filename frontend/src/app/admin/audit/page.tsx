import Form from "next/form";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTop, Pager, SearchForm } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { when } from "@/lib/format";
import type { AuditPage } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Audit log" };

/** Colour per kind of action, as in the design: create (green), warn (amber), bad (red), info (blue). */
function tag(action: string) {
  if (/REJECT|FAIL|CANCEL|BLOCK|REMOVE|DEACTIVATE/.test(action)) return "b";
  if (/RESCHEDULE|SETTING|CORRECT|STATUS|EDIT|ON_LEAVE/.test(action)) return "w";
  if (/SUBMITTED|ACCEPTED|APPROVE|CREATE|REGISTER|COMPLETED|RESOLVED/.test(action)) return "c";
  return "i";
}

function label(action: string) {
  return action.replace(/^REQUEST_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function AuditPageView(props: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 100) : undefined);
  const f = { q: s("q"), role: s("role"), action: s("action"), from: s("from"), to: s("to") };
  const page = Math.max(0, Number(sp.page) || 0);
  const a = await api<AuditPage>(`/api/admin/audit${qs({ ...f, page, size: 50 })}`);
  return (
    <>
      <AdminTop title="Audit log" sub="Every important action, who did it and when">
        <SearchForm action="/admin/audit" q={f.q} placeholder="Search request, user or action" keep={{ role: f.role }} />
        <a className="btn btn-primary btn-sm" href={`/admin/audit-export${qs(f)}`}><Icon name="download" size={16} />Download Excel</a>
        <a className="btn btn-ghost btn-sm" href={`/admin/audit-export${qs({ ...f, format: "csv" })}`}>CSV</a>
      </AdminTop>
      <div style={{ display: "contents" }} key={JSON.stringify(f)}>{/* resets the fields when the filters change */}
      <Form scroll={false} className="toolbar" action="/admin/audit">
        {f.q && <input type="hidden" name="q" value={f.q} />}
        <label className="fsel"><span>Role:</span>
          <select name="role" defaultValue={f.role ?? ""}><option value="">All</option><option value="ADMIN">Admin</option><option value="COLLECTOR">Collector</option><option value="CUSTOMER">Customer</option><option value="SYSTEM">System</option></select></label>
        <label className="fsel"><span>From:</span><input type="date" name="from" defaultValue={f.from} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <label className="fsel"><span>To:</span><input type="date" name="to" defaultValue={f.to} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <button className="btn btn-ghost btn-sm" type="submit">Apply</button>
      </Form></div>
      <div className="tcard">
        <table className="tbl audit">
          <thead><tr><th>Time</th><th>Who</th><th>Action</th><th>On</th><th>Details</th></tr></thead>
          <tbody>
            {a.rows.map((r) => (
              <tr key={r.id}>
                <td className="time">{when(r.at)}</td>
                <td><b>{r.who}</b><br /><small className="muted">{r.role.charAt(0) + r.role.slice(1).toLowerCase()}</small></td>
                <td><span className={`act-tag ${tag(r.action)}`}>{label(r.action)}</span></td>
                <td className="nowrap">{r.entityId ?? r.entity}</td>
                <td className="chg">{r.summary}</td>
              </tr>
            ))}
            {a.rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ padding: 20 }}>No entries match.</td></tr>}
          </tbody>
        </table>
        <Pager page={a.page} size={a.size} total={a.total} href={(p) => `/admin/audit${qs({ ...f, page: p })}`} />
      </div>
      <p className="lock"><Icon name="shield" size={16} />Entries can’t be edited or deleted.</p>
    </>
  );
}
