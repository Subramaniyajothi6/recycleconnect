import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { Empty, Skeleton, ValueStrip } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { day, monthLabel, num } from "@/lib/format";
import type { RequestCard, Summary } from "@/lib/types";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <div className="app-top"><h1 className="title">History</h1></div>
      <Suspense fallback={<div className="pad"><Skeleton h={140} /><Skeleton h={200} style={{ marginTop: 16 }} /></div>}>
        <History />
      </Suspense>
    </>
  );
}

async function History() {
  await requireRole("CUSTOMER");
  const [s, requests] = await Promise.all([api<Summary>("/api/customer/summary"), api<RequestCard[]>("/api/customer/requests")]);
  const kgParts = s.byCategory.filter((c) => c.unit === "KG").map((c) => ({ code: c.code, color: c.color, value: Number(c.qty), label: c.name }));
  const pcs = s.byCategory.filter((c) => c.unit === "PCS");
  const max = Math.max(1, ...s.months.map((m) => Number(m.kg)));
  const completed = requests.filter((r) => r.status === "COMPLETED");
  const failed = requests.filter((r) => r.status === "FAILED").length;
  const cancelled = requests.filter((r) => r.status === "CANCELLED").length;

  return (
    <>
      <div className="hstats">
        <div className="big">
          <span><span className="lbl">Total collected</span><b>{num(s.kg)}</b> <span>kg</span></span>
          <span>since {day(s.since).split(" ").slice(1).join(" ")}</span>
        </div>
        <div><b>{s.total}</b><span>Requests</span></div>
        <div><b>{s.completed}</b><span>Completed</span></div>
        <div><b>{s.cancelled + s.failed}</b><span>Cancelled or failed</span></div>
      </div>

      <div className="sec-h"><h2>By material</h2></div>
      <div className="panel" style={{ margin: "0 20px" }}>
        {kgParts.length === 0 && pcs.length === 0 ? <p className="muted">Your first completed pickup will show here.</p> : (
          <>
            {kgParts.length > 0 && <ValueStrip parts={kgParts} thick />}
            <div className="legend" style={{ marginTop: 10 }}>
              {s.byCategory.map((c) => <span key={c.code + c.unit}><b className="sw" style={{ background: `var(--c-${c.code}, ${c.color})` }} />{c.name} {num(c.qty)} {c.unit === "PCS" ? "pcs" : "kg"}</span>)}
            </div>
          </>
        )}
      </div>

      <div className="sec-h"><h2>Kilograms per month</h2></div>
      <div className="panel" style={{ margin: "0 20px" }}>
        <div className="mini-cols">
          {s.months.map((m) => (
            <div key={m.month}><em>{Number(m.kg) ? num(m.kg) : "–"}</em><i style={{ height: (Number(m.kg) / max) * 80 + 2 }} />{monthLabel(m.month)}</div>
          ))}
        </div>
      </div>

      <div className="sec-h"><h2>Completed pickups</h2><Link href="/customer/requests?tab=past">All requests</Link></div>
      {completed.length === 0 ? <Empty title="No completed pickups yet" /> : (
        <div className="panel" style={{ margin: "0 20px" }}>
          <table className="htable">
            <thead><tr><th>Pickup</th><th>Estimated</th><th>Collected</th></tr></thead>
            <tbody>
              {completed.slice(0, 20).map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/customer/requests/${r.id}`} style={{ color: "inherit" }}><b>{r.code}</b></Link><small>{r.date ? day(r.date) : ""}, {r.items.map((i) => i.name).join(", ")}</small></td>
                  <td>{num(r.estimatedTotal)} kg</td>
                  <td><b>{num(r.actualTotal)} kg</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(failed > 0 || cancelled > 0) && (
        <div className="panel" style={{ margin: "12px 20px 0", display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
          <Icon name="alert" size={18} />
          <span>{failed} failed pickup{failed === 1 ? "" : "s"} and {cancelled} cancellation{cancelled === 1 ? "" : "s"} are kept in your history.</span>
        </div>
      )}
      <div style={{ height: 20 }} />
    </>
  );
}
