import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ItemStrip, Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { day, num, slot } from "@/lib/format";
import type { CollectorHistory } from "@/lib/types";

export const metadata: Metadata = { title: "History" };

function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function shift(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function HistoryPage(props: PageProps<"/collector/history">) {
  return (
    <Suspense fallback={<div className="k-head slim"><Skeleton h={60} style={{ opacity: 0.25 }} /></div>}>
      <History searchParams={props.searchParams} />
    </Suspense>
  );
}

async function History({ searchParams }: { searchParams: PageProps<"/collector/history">["searchParams"] }) {
  const me = await requireRole("COLLECTOR");
  const sp = await searchParams;
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : undefined;
  const status = typeof sp.status === "string" ? sp.status : "";
  const h = await api<CollectorHistory>(`/api/collector/history${qs({ month, status })}`);
  const chip = (k: string, label: string) => (
    <Link className="fchip" href={`/collector/history${qs({ month: h.month, status: k })}`} aria-pressed={status === k}>{label}</Link>
  );
  return (
    <>
      <div className="k-head slim"><div className="top"><small>{me.name}</small></div><h1>History</h1></div>
      <div className="filters" role="group" aria-label="Filters">
        <Link className="fchip" href={`/collector/history${qs({ month: shift(h.month, -1), status })}`} aria-label="Previous month"><Icon name="back" size={15} /></Link>
        <span className="fchip" aria-pressed="true"><Icon name="cal" size={15} />{monthName(h.month)}</span>
        <Link className="fchip" href={`/collector/history${qs({ month: shift(h.month, 1), status })}`} aria-label="Next month"><Icon name="chev" size={15} /></Link>
        {chip("", "All statuses")}{chip("completed", "Completed")}{chip("failed", "Failed")}
      </div>
      <div className="kstats3">
        <div><b>{h.stats.completed}</b><span>Completed</span></div>
        <div><b>{h.stats.failed}</b><span>Failed</span></div>
        <div><b>{num(h.stats.kg)}</b><span>kg collected</span></div>
        <div><b>{h.stats.onTimePercent}%</b><span>On time</span></div>
      </div>
      {h.days.map((d) => (
        <section key={d.date}>
          <div className="hist-day"><span>{day(d.date)}</span><span>{num(d.kg)} kg</span></div>
          <div className="list">
            {d.stops.map((s) => (
              <Link key={s.pickupId} className="hrow" href={`/collector/pickups/${s.pickupId}`} style={{ color: "inherit", textDecoration: "none" }}>
                <span><b>{s.customer}</b><small>{s.code}, {slot(s.slot)}</small></span>
                <span className="kg">{s.pickupStatus === "FAILED" ? "Failed" : `${num(s.actualKg)} kg`}<small>{s.pickupStatus === "FAILED" ? "" : `est. ${num(s.estimatedKg)} kg`}</small></span>
                <ItemStrip items={s.items} actual={s.pickupStatus !== "FAILED"} />
                {s.failReason && <span className="why">Failed: {s.failReason}</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
      {h.days.length === 0 && <p className="empty-hint" style={{ marginTop: 16 }}>No finished pickups in {monthName(h.month)}.</p>}
      <div style={{ height: 20 }} />
    </>
  );
}
