import type { Metadata } from "next";
import { Suspense } from "react";
import { Empty, Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { day, num } from "@/lib/format";
import type { CollectorAssigned } from "@/lib/types";
import { StopCard } from "../StopCard";

export const metadata: Metadata = { title: "Assigned pickups" };

export default function AssignedPage() {
  return (
    <Suspense fallback={<div className="k-head slim"><Skeleton h={60} style={{ opacity: 0.25 }} /></div>}>
      <Assigned />
    </Suspense>
  );
}

async function Assigned() {
  const me = await requireRole("COLLECTOR");
  const a = await api<CollectorAssigned>("/api/collector/assigned");
  const zones = me.collector?.zones.map((z) => z.name).join(", ");
  return (
    <>
      <div className="k-head slim"><div className="top"><small>{zones}</small></div><h1>Assigned pickups</h1></div>
      {a.days.length > 0 && (
        <nav className="day-tabs" aria-label="Days">
          {a.days.map((d) => {
            const [wd, n, m] = day(d.date).split(" ");
            return <a key={d.date} href={`#d-${d.date}`}><small>{wd}</small><b>{n} {m}</b><span className="cnt">{d.count} pickup{d.count === 1 ? "" : "s"}</span></a>;
          })}
        </nav>
      )}
      {a.needsAnswer.length > 0 && (
        <>
          <div className="sec-h"><h2>Needs your answer</h2></div>
          <div className="need">
            <h2>{a.needsAnswer.length} new assignment{a.needsAnswer.length === 1 ? "" : "s"}</h2>
            <p>Accept them so the customers know you’re coming. If you can’t take one, ask the office to reassign it.</p>
            {a.needsAnswer.map((s) => <StopCard key={s.pickupId} stop={s} n="new" showDate />)}
          </div>
        </>
      )}
      {a.days.map((d) => (
        <section key={d.date} id={`d-${d.date}`}>
          <div className="sec-h"><h2>{day(d.date)}</h2><span className="muted" style={{ fontSize: 13 }}>{d.count} stop{d.count === 1 ? "" : "s"}, about {num(d.estimatedKg, 0)} kg</span></div>
          <div className="stops">{d.stops.map((s, i) => <StopCard key={s.pickupId} stop={s} n={i + 1} />)}</div>
        </section>
      ))}
      {a.days.length === 0 && <div style={{ marginTop: 16 }}><Empty icon="truck" title="No upcoming pickups">The office assigns pickups in your areas. You’ll get a notification.</Empty></div>}
      <div style={{ height: 20 }} />
    </>
  );
}
