import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop, Kpi } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Skeleton, ValueStrip } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { CUSTOMER_TYPE, day, monthLabel, num } from "@/lib/format";
import type { Dashboard } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminDashboard() {
  return (
    <>
      <AdminTop title="Dashboard" sub="Today’s operations at a glance">
        <Link className="btn btn-ghost btn-sm" href="/admin/reports"><Icon name="download" size={16} />Export report</Link>
      </AdminTop>
      <Suspense fallback={<><Skeleton h={90} style={{ marginTop: 20 }} /><Skeleton h={300} style={{ marginTop: 16 }} /></>}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireRole("ADMIN");
  const d = await api<Dashboard>("/api/admin/dashboard");
  const k = d.kpis;
  const catTotal = d.categories.reduce((a, c) => a + Number(c.kg), 0);
  const half = Math.ceil(d.categories.length / 2);
  const monthName = new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const maxKg = Math.max(1, ...d.monthlyKg.map((m) => Number(m.value)));
  const maxCf = Math.max(1, ...d.completedVsFailed.map((m) => m.completed + m.failed));
  const areaMax = Math.max(1, ...d.areas.map((a) => a.requests));
  const typeTotal = Object.values(d.customers.byType).reduce((a, b) => a + b, 0);
  const households = d.customers.byType.HOUSEHOLD ?? 0;
  const located = d.areas.filter((a) => a.lat && a.lng);

  const W = 360, bw = 36, gap = (W - bw * 6) / 6;
  const distRows = (list: typeof d.categories) => (
    <table className="dist-t"><tbody>
      {list.map((c) => (
        <tr key={c.code}>
          <td><span className="legend"><span><b className="sw" style={{ background: `var(--c-${c.code}, ${c.color})` }} />{c.name}</span></span></td>
          <td>{num(c.kg)} kg</td><td className="muted">{catTotal ? ((Number(c.kg) / catTotal) * 100).toFixed(1) : 0}%</td>
        </tr>
      ))}
    </tbody></table>
  );

  return (
    <>
      <p className="page-sub" style={{ marginTop: 4 }}>{day(d.today, { year: true })}</p>
      <div className="kpis">
        <Kpi label="Total customers" value={num(k.totalCustomers, 0)} />
        <Kpi label="Active collectors" value={num(k.activeCollectors, 0)} note="approved and available" />
        <Kpi label="Pending requests" value={num(k.pendingRequests, 0)} note={k.pendingRequests ? <Link href="/admin/requests?tab=REVIEW">Review now</Link> : "nothing waiting"} alert={k.pendingRequests > 0} />
        <Kpi label="Today’s pickups" value={num(k.todaysPickups, 0)} />
        <Kpi label="Overdue pickups" value={num(k.overdue, 0)} note={k.overdue ? <Link href="/admin/requests?tab=OVERDUE">Rebook now</Link> : "none missed"} alert={k.overdue > 0} />
        <Kpi label="Completed collections" value={num(k.completedThisMonth, 0)} note={monthName} />
        <Kpi label="Failed pickups" value={num(k.failedThisMonth, 0)} note={monthName} />
        <Kpi label="Total collected" value={`${num(k.totalKg, 0)} kg`} note="all time" />
      </div>
      <div className="dgrid">
        <section className="card span2">
          <div className="ch"><div><h2>What we collected in {monthName}</h2><div className="sub">{num(catTotal)} kg across {d.categories.length} categories</div></div></div>
          {d.categories.length === 0 ? <p className="muted">No completed collections this month yet.</p> : (
            <>
              <ValueStrip thick parts={d.categories.map((c) => ({ code: c.code, color: c.color, value: Number(c.kg), label: c.name }))} />
              <div className="dist-cols">{distRows(d.categories.slice(0, half))}{distRows(d.categories.slice(half))}</div>
            </>
          )}
        </section>
        <section className="card">
          <div className="ch"><div><h2>Customer activity</h2><div className="sub">{monthName}</div></div></div>
          <div className="act-grid">
            <div><b>{d.customers.active}</b><span>Active customers</span></div>
            <div><b>{d.customers.newSignups}</b><span>New sign-ups</span></div>
            <div><b>{d.customers.repeat}</b><span>Booked again</span></div>
            <div><b>{d.customers.requests}</b><span>Requests made</span></div>
          </div>
          {typeTotal > 0 && (
            <>
              <div style={{ marginTop: 18, fontSize: 13 }} className="muted">Households vs businesses</div>
              <div className="strip thick" style={{ marginTop: 6 }}>
                {households > 0 && <i style={{ flex: households, background: "var(--c-glass)" }} />}{typeTotal - households > 0 && <i style={{ flex: typeTotal - households, background: "var(--c-ewaste)" }} />}
              </div>
              <div className="legend" style={{ marginTop: 8 }}>
                <span><b className="sw" style={{ background: "var(--c-glass)" }} />Households {Math.round((households / typeTotal) * 100)}%</span>
                <span><b className="sw" style={{ background: "var(--c-ewaste)" }} />Shops, offices, institutions {100 - Math.round((households / typeTotal) * 100)}%</span>
              </div>
            </>
          )}
        </section>
        <section className="card">
          <div className="ch"><div><h2>Collection volume by month</h2><div className="sub">{monthLabel(d.monthlyKg[0].month)} – {monthLabel(d.monthlyKg[5].month)}</div></div></div>
          <svg className="chart" viewBox={`0 0 ${W} 190`} role="img" aria-label="Monthly collection volume in kilograms">
            {d.monthlyKg.map((m, i) => {
              const v = Number(m.value), h = (v / maxKg) * 140, x = gap / 2 + i * (bw + gap), y = 160 - h;
              return (
                <g key={m.month}>
                  <rect x={x} y={y} width={bw} height={Math.max(h, 1)} rx={6} fill={i === 5 ? "var(--chart-strong)" : "var(--chart)"} opacity={i === 5 ? 1 : 0.55 + i * 0.07} />
                  <text className="v" x={x + bw / 2} y={y - 6} textAnchor="middle">{v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${num(v, 0)}`}</text>
                  <text x={x + bw / 2} y={180} textAnchor="middle">{monthLabel(m.month)}</text>
                </g>
              );
            })}
          </svg>
        </section>
        <section className="card span2">
          <div className="ch"><div><h2>Completed vs failed</h2><div className="sub">Pickups per month</div></div>
            <div className="legend"><span><b className="sw" style={{ background: "var(--chart)" }} />Done</span><span><b className="sw" style={{ background: "var(--red)" }} />Failed</span></div></div>
          {d.completedVsFailed.map((m) => (
            <div key={m.month} className="cf">
              <span>{monthLabel(m.month)}</span>
              <div className="bars" style={{ width: `${Math.max(((m.completed + m.failed) / maxCf) * 100, 2)}%` }}>
                <i style={{ flex: m.completed || 0.001 }} /><i style={{ flex: m.failed * 4 || 0.001 }} />
              </div>
              <span>{m.completed} / {m.failed}</span>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Failed segment drawn 4× wider so it stays visible.</p>
        </section>
        <section className="card span3">
          <div className="ch"><div><h2>Requests by location</h2><div className="sub">{monthName}. Circle size shows request count; the orange badge shows requests still waiting for review.</div></div></div>
          <div className="area-layout">
            {located.length > 0 ? (
              <AppMap className="area-map" label="Map of requests by area"
                markers={located.map((a) => ({ id: a.area, lat: a.lat!, lng: a.lng!, kind: "area" as const, size: 26 + (a.requests / areaMax) * 26, label: String(a.requests), title: a.area, badge: a.waiting || undefined }))} />
            ) : <div className="area-map map-off">No located requests this month</div>}
            <div>
              <h3 className="area-h">Busiest areas</h3>
              {d.areas.slice(0, 7).map((a) => (
                <div key={a.area} className="hbar"><span>{a.area}</span><span className="track"><i style={{ width: `${(a.requests / areaMax) * 100}%` }} /></span><b>{a.requests}</b></div>
              ))}
              {d.areas.length === 0 && <p className="muted">No requests this month yet.</p>}
            </div>
          </div>
        </section>
        <section className="card span3">
          <div className="ch"><div><h2>Collector performance</h2><div className="sub">{monthName}</div></div><Link className="btn btn-ghost btn-sm" href="/admin/collectors">All collectors</Link></div>
          <table className="tbl">
            <thead><tr><th>Collector</th><th>Zone</th><th className="num">Completed</th><th className="num">Failed</th><th className="num">Collected</th><th className="num">On time</th></tr></thead>
            <tbody>
              {d.collectors.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td><td className="muted">{c.zones}</td><td className="num">{c.completed}</td><td className="num">{c.failed}</td>
                  <td className="num">{num(c.kg, 0)} kg</td>
                  <td className="num"><span className={c.onTimePercent < 92 ? "ontime low" : "ontime"} style={{ ["--w" as string]: `${c.onTimePercent}%` }}><i />{c.onTimePercent}%</span></td>
                </tr>
              ))}
              {d.collectors.length === 0 && <tr><td colSpan={6} className="muted">No active collectors yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Customer types: {Object.entries(d.customers.byType).map(([t, n]) => `${CUSTOMER_TYPE[t] ?? t} ${n}`).join(", ") || "none yet"}.</p>
    </>
  );
}
