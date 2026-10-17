import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTop, SearchForm } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { Pill, Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { backend } from "@/lib/backend";
import { DAY_SHORT, VEHICLE, initials, when } from "@/lib/format";
import type { Collectors } from "@/lib/admin-types";
import type { Zone } from "@/lib/types";
import { ApproveActions, CollectorActions } from "./CollectorActions";

export const metadata: Metadata = { title: "Collectors" };

const TONE: Record<string, "active" | "info" | "muted" | "bad" | "warn"> = {
  "On route": "active", Available: "info", "On leave": "muted", Blocked: "bad", Inactive: "muted", "Waiting for approval": "warn",
};

export default function CollectorsPage(props: PageProps<"/admin/collectors">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/collectors">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const zoneId = typeof sp.zoneId === "string" ? sp.zoneId : undefined;
  const [c, zones] = await Promise.all([api<Collectors>(`/api/admin/collectors${qs({ q, zoneId })}`), backend<Zone[]>("/api/catalog/zones")]);
  return (
    <>
      <AdminTop title="Collectors" sub={`${c.activeCount} active, ${c.onLeaveCount} on leave`}>
        <SearchForm action="/admin/collectors" q={q} placeholder="Search name, zone or vehicle" keep={{ zoneId }} />
      </AdminTop>
      {c.pending.length > 0 && (
        <>
          <div className="secttl">Waiting for approval <Pill tone="warn">{c.pending.length}</Pill></div>
          <div style={{ display: "grid", gap: 10 }}>
            {c.pending.map((p) => (
              <div key={p.id} className="approve">
                <span className="avatar">{initials(p.name)}</span>
                <span>
                  <b>{p.name}</b>
                  <small>{p.vehicleType ? VEHICLE[p.vehicleType] : "Vehicle"} {p.vehicleNumber}. Areas: {p.zones}. Days: {p.workingDays.map((d) => DAY_SHORT[d]).join(", ")}. {p.idProofUploaded ? "ID proof uploaded." : "No ID proof yet."}</small>
                  <small>{p.mobile} · registered {when(p.registeredAt)}</small>
                </span>
                <ApproveActions id={p.id} name={p.name} idProof={p.idProofUploaded} />
              </div>
            ))}
          </div>
        </>
      )}
      <div className="secttl">All collectors</div>
      <form className="toolbar" style={{ marginTop: 0 }} action="/admin/collectors">
        {q && <input type="hidden" name="q" value={q} />}
        <label className="fsel"><span>Zone:</span>
          <select name="zoneId" defaultValue={zoneId ?? ""}><option value="">All</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <button className="btn btn-ghost btn-sm" type="submit"><Icon name="filter" size={15} />Apply</button>
      </form>
      <div className="cgrid">
        {c.all.map((k) => (
          <article key={k.id} className={k.activity === "On leave" || k.status !== "ACTIVE" ? "ccard off" : "ccard"}>
            <div className="top">
              <span className="avatar">{initials(k.name)}</span>
              <span><h3>{k.name}</h3><small>{k.zones}</small><small>{k.vehicleNumber} · {k.code}</small></span>
              <Pill tone={TONE[k.activity] ?? "muted"}>{k.activity}</Pill>
            </div>
            <div className="loadbar"><span>Today: {k.todayLoad} of {k.capacity} pickups</span><span className="t"><i style={{ width: `${(k.todayLoad / k.capacity) * 100}%` }} /></span></div>
            <div className="stats">
              <div><b>{k.doneThisMonth}</b><span>Done this month</span></div>
              <div><b>{k.onTimePercent}%</b><span>On time</span></div>
              <div><b>{k.status === "ACTIVE" && k.available ? k.todayLoad : "–"}</b><span>Today</span></div>
            </div>
            <CollectorActions id={k.id} name={k.name} status={k.status} available={k.available} idProof={k.idProofUploaded} />
          </article>
        ))}
        {c.all.length === 0 && <p className="muted">No approved collectors yet.</p>}
      </div>
    </>
  );
}
