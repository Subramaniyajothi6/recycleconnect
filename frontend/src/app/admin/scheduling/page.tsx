import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTop } from "@/components/admin";
import { Icon } from "@/components/Icon";
import { ItemLegend, ItemStrip, Note, Pill, Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { day, slot, todayIso, when } from "@/lib/format";
import type { Board } from "@/lib/admin-types";
import { BookButton } from "./BookButton";

export const metadata: Metadata = { title: "Scheduling" };

function shift(iso: string, by: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

export default function SchedulingPage(props: PageProps<"/admin/scheduling">) {
  return (
    <Suspense fallback={<><Skeleton h={40} /><Skeleton h={400} style={{ marginTop: 16 }} /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/scheduling">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayIso();
  const b = await api<Board>(`/api/admin/schedule?date=${date}`);
  return (
    <>
      <AdminTop title="Scheduling" sub="Book accepted requests into slots and balance collectors’ days">
        <div className="datebar">
          <Link className="icon-btn" href={`/admin/scheduling?date=${shift(date, -1)}`} aria-label="Previous day"><Icon name="back" size={18} /></Link>
          <span className="cur">{day(date, { year: true })}</span>
          <Link className="icon-btn" href={`/admin/scheduling?date=${shift(date, 1)}`} aria-label="Next day"><Icon name="chev" size={18} /></Link>
        </div>
      </AdminTop>
      {!b.open && <div style={{ marginTop: 16 }}><Note tone="warn" icon="alert">{day(date)} is closed. No pickups can be booked.</Note></div>}
      <div className="two" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
        <div className="board">
          <table>
            <thead><tr><th>Collector</th>{b.slots.map((s) => <th key={s}>{slot(s)}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.collectorId} className={r.onLeave || !r.worksToday ? "leave" : ""}>
                  <td><div className="coll"><b>{r.name}</b><small>{r.zones}{r.onLeave ? ", on leave" : !r.worksToday ? ", day off" : `, ${r.load} of ${r.capacity}`}</small>
                    {!r.onLeave && r.worksToday && <div className="t"><i style={{ width: `${(r.load / r.capacity) * 100}%` }} /></div>}</div></td>
                  {r.onLeave || !r.worksToday ? (
                    <td colSpan={b.slots.length} style={{ color: "var(--muted)", fontSize: 13, verticalAlign: "middle", paddingLeft: 14 }}>
                      {r.onLeave ? "On leave. No pickups can be assigned." : "Not a working day for this collector."}
                    </td>
                  ) : b.slots.map((s) => (
                    <td key={s}>
                      {(r.slots[s] ?? []).length === 0 ? <div className="slot-free">Free</div> : (r.slots[s] ?? []).map((c) => (
                        <Link key={c.requestId} href={`/admin/requests?open=${c.requestId}`} className="slotchip" style={{ ["--c" as string]: `var(--c-${c.mainCategory ?? "other"})`, textDecoration: "none", color: "inherit", marginBottom: 4 }}>
                          <b>{c.customer}</b><small>{c.code}, {Math.round(c.kg)} kg</small>
                        </Link>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
              {b.rows.length === 0 && <tr><td colSpan={b.slots.length + 1} className="muted" style={{ padding: 20 }}>No approved collectors yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <aside>
          <div className="secttl" style={{ marginTop: 0 }}>Waiting for a slot <Pill tone="warn">{b.waiting.length}</Pill></div>
          <div className="waitlist">
            {b.waiting.map(({ request: r, suggestion }) => (
              <div key={r.id} className="wait">
                <div className="r1"><b>{r.customerName}</b><span className="muted" style={{ fontSize: 12 }}>{r.code}</span></div>
                <small>{r.area ?? "No area"}, asked for {r.date ? `${day(r.date)}, ${slot(r.slot)}` : "no date"}</small>
                <ItemStrip items={r.items} /><ItemLegend items={r.items} />
                <div className="sugg">
                  <span>{suggestion ? `Suggested: ${suggestion.name}` : "No collector free that day"}</span>
                  {suggestion && r.date && r.slot ? <BookButton id={r.id} date={r.date >= date ? r.date : date} slot={r.slot} collectorId={suggestion.id} /> :
                    <Link className="btn btn-primary btn-sm" style={{ height: 30, padding: "0 10px", fontSize: 12.5, color: "#fff" }} href={`/admin/requests?open=${r.id}`}>Open</Link>}
                </div>
              </div>
            ))}
            {b.waiting.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>Nothing waiting. Accepted requests appear here.</p>}
          </div>
        </aside>
      </div>
      <div className="secttl">Recent reschedules</div>
      <div className="tcard">
        <table className="tbl">
          <thead><tr><th>Request</th><th>From</th><th>To</th><th>Reason</th><th>Changed by</th><th>When</th></tr></thead>
          <tbody>
            {b.recent.map((x, i) => (
              <tr key={i}>
                <td><b>{x.code}, {x.customer}</b></td>
                <td className="chg"><s>{x.fromDate ? `${day(x.fromDate)}, ${slot(x.fromSlot)}` : "—"}</s></td>
                <td><b>{day(x.toDate)}, {slot(x.toSlot)}</b></td>
                <td>{x.reason}</td><td>{x.by}</td><td className="nowrap muted">{when(x.at)}</td>
              </tr>
            ))}
            {b.recent.length === 0 && <tr><td colSpan={6} className="muted">No reschedules yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
