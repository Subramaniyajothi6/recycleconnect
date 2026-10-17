import Form from "next/form";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTop } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { Skeleton, ValueStrip } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { backend } from "@/lib/backend";
import { CUSTOMER_TYPE, day, monthLabel, num, slot } from "@/lib/format";
import type { Analytics } from "@/lib/admin-types";
import type { Category, Zone } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

const TYPE_COLOUR: Record<string, string> = { HOUSEHOLD: "glass", SHOP: "paper", OFFICE: "ewaste", BUSINESS: "plastic", INSTITUTION: "textile" };

export default function AnalyticsPage(props: PageProps<"/admin/analytics">) {
  return (
    <>
      <AdminTop title="Analytics" sub="Trends to plan collectors, slots and areas" />
      <Suspense fallback={<Skeleton h={500} style={{ marginTop: 16 }} />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/analytics">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 40) : undefined);
  const f = { from: s("from"), to: s("to"), zoneId: s("zoneId"), customerType: s("customerType"), categoryId: s("categoryId") };
  const [a, zones, categories] = await Promise.all([
    api<Analytics>(`/api/admin/analytics${qs(f)}`),
    backend<Zone[]>("/api/catalog/zones"),
    backend<Category[]>("/api/catalog/categories"),
  ]);
  const cats = a.categories;
  const W = 520, H = 230, bw = Math.min(52, (W - 60) / Math.max(a.volume.length, 1) - 12);
  const gap = (W - 40 - bw * a.volume.length) / Math.max(a.volume.length, 1);
  const maxVol = Math.max(1, ...a.volume.map((v) => Number(v.total)));
  const maxReason = Math.max(1, ...a.failReasons.map((r) => r.percent));

  return (
    <>
      <div style={{ display: "contents" }} key={JSON.stringify(f)}>{/* resets the fields when the filters change */}
      <Form scroll={false} className="toolbar" action="/admin/analytics">
        <label className="fsel"><span>From:</span><input type="date" name="from" defaultValue={a.filters.from} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <label className="fsel"><span>To:</span><input type="date" name="to" defaultValue={a.filters.to} style={{ border: 0, font: "inherit", background: "transparent" }} /></label>
        <label className="fsel"><span>Area:</span><select name="zoneId" defaultValue={f.zoneId ?? ""}><option value="">All</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <label className="fsel"><span>Customer type:</span><select name="customerType" defaultValue={f.customerType ?? ""}><option value="">All</option>{Object.entries(CUSTOMER_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="fsel"><span>Category:</span><select name="categoryId" defaultValue={f.categoryId ?? ""}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button className="btn btn-ghost btn-sm" type="submit"><Icon name="filter" size={15} />Apply</button>
      </Form></div>
      <div className="dgrid">
        <section className="card span2">
          <div className="ch"><div><h2>Collection volume by month and material</h2><div className="sub">{day(a.filters.from)} – {day(a.filters.to, { year: true })}</div></div></div>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stacked monthly volume by material">
            {[0, 0.5, 1].map((g) => (
              <g key={g}>
                <line x1={36} x2={W} y1={190 - g * 170} y2={190 - g * 170} stroke="var(--line)" />
                <text x={0} y={194 - g * 170}>{num((maxVol * g) / (maxVol >= 1000 ? 1000 : 1), 1)}{maxVol >= 1000 ? " t" : ""}</text>
              </g>
            ))}
            {a.volume.map((m, i) => {
              let y = 190;
              const x = 40 + gap / 2 + i * (bw + gap);
              return (
                <g key={m.month}>
                  {cats.map((c) => {
                    const v = Number(m.byCategory[c.code] ?? 0);
                    if (!v) return null;
                    const h = (v / maxVol) * 170;
                    y -= h;
                    return <rect key={c.code} x={x} y={y} width={bw} height={Math.max(h - 1.5, 0.5)} fill={`var(--c-${c.code}, ${c.color})`} />;
                  })}
                  <text className="v" x={x + bw / 2} y={y - 6} textAnchor="middle">{Number(m.total) ? num(m.total, 0) : ""}</text>
                  <text x={x + bw / 2} y={210} textAnchor="middle">{monthLabel(m.month)}</text>
                </g>
              );
            })}
          </svg>
          <div className="legend" style={{ marginTop: 8 }}>{cats.map((c) => <span key={c.code}><b className="sw" style={{ background: `var(--c-${c.code}, ${c.color})` }} />{c.name} {num(c.kg, 0)} kg</span>)}</div>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Why pickups fail</h2><div className="sub">{a.failedTotal} failed pickups in this period</div></div></div>
          <div className="reasons">
            {a.failReasons.map((r) => <div key={r.key}><span>{r.label}</span><span className="t"><i style={{ width: `${(r.percent / maxReason) * 100}%` }} /></span><b>{r.percent}%</b></div>)}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Reminders before each pickup help cut “customer unavailable”.</p>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Busiest days and slots</h2><div className="sub">Pickups booked, share of the busiest slot</div></div></div>
          <div className="heat" style={{ gridTemplateColumns: `54px repeat(${a.heat.slots.length}, 1fr)` }}>
            <span />
            {a.heat.slots.map((s) => <span key={s} className="h">{slot(s).slice(0, 5)}</span>)}
            {a.heat.days.map((dname, di) => [
              <span key={dname}>{dname}</span>,
              ...a.heat.slots.map((s, si) => {
                const pct = a.heat.max ? Math.round((a.heat.counts[di][si] / a.heat.max) * 100) : 0;
                return <i key={s} style={{ ["--v" as string]: pct }} className={pct > 70 ? "hi" : ""} title={`${a.heat.counts[di][si]} pickups`}>{pct}</i>;
              }),
            ])}
          </div>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Estimate vs actual weight</h2><div className="sub">Average difference</div></div></div>
          <div className="acc">
            {a.accuracy.map((x) => (
              <div key={x.category}><span>{x.category}</span>
                <span className="axis"><i style={x.differencePercent >= 0
                  ? { left: "50%", width: `${Math.min(x.differencePercent * 1.5, 50)}%`, background: "var(--chart)" }
                  : { right: "50%", width: `${Math.min(-x.differencePercent * 1.5, 50)}%`, background: "var(--amber)" }} /></span>
                <b>{x.differencePercent > 0 ? "+" : ""}{x.differencePercent}%</b></div>
            ))}
            {a.accuracy.length === 0 && <p className="muted">Needs completed pickups.</p>}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Negative means customers overestimate.</p>
        </section>
        <section className="card">
          <div className="ch"><div><h2>Customers by type</h2><div className="sub">Requests in this period</div></div></div>
          {a.customerTypes.length > 0 && <ValueStrip thick parts={a.customerTypes.map((t) => ({ code: TYPE_COLOUR[t.key] ?? "other", color: "", value: t.count, label: t.label }))} />}
          <div className="legend" style={{ marginTop: 10 }}>{a.customerTypes.map((t) => <span key={t.key}><b className="sw" style={{ background: `var(--c-${TYPE_COLOUR[t.key] ?? "other"})` }} />{t.label} {t.percent}%</span>)}</div>
          <div className="act-grid" style={{ marginTop: 16 }}>
            <div><b>{a.activeCustomers}</b><span>Active customers</span></div>
            <div><b>{a.repeatWithin60DaysPercent}%</b><span>Booked again within 60 days</span></div>
          </div>
        </section>
        <section className="card span3">
          <div className="ch"><div><h2>Collector performance</h2><div className="sub">This period</div></div></div>
          <table className="tbl">
            <thead><tr><th>Collector</th><th>Zone</th><th className="num">Pickups</th><th className="num">Failed</th><th className="num">Collected</th><th className="num">Avg per pickup</th><th className="num">Complaints</th><th className="num">On time</th></tr></thead>
            <tbody>
              {a.collectors.map((c) => (
                <tr key={c.id}><td><b>{c.name}</b></td><td className="muted">{c.zones}</td><td className="num">{c.completed}</td><td className="num">{c.failed}</td>
                  <td className="num">{num(c.kg, 0)} kg</td><td className="num">{c.completed ? num(Number(c.kg) / c.completed) : "–"} kg</td><td className="num">{c.complaints}</td>
                  <td className="num"><span className={c.onTimePercent < 92 ? "ontime low" : "ontime"} style={{ ["--w" as string]: `${c.onTimePercent}%` }}><i />{c.onTimePercent}%</span></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
