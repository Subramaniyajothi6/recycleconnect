import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Empty, ItemLegend, ItemStrip, Skeleton, StatusPill, ValueStrip } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { CUSTOMER_TYPE, day, greeting, num, slot, when } from "@/lib/format";
import type { Inbox, RequestCard, Summary } from "@/lib/types";

export const metadata: Metadata = { title: "Home" };

const ACTIVE = ["SCHEDULED", "ASSIGNED", "PICKUP_STARTED", "COLLECTED"];

export default function CustomerHome() {
  return (
    <Suspense fallback={<div className="pad" style={{ paddingTop: 20 }}><Skeleton h={60} /><Skeleton h={220} style={{ marginTop: 16 }} /></div>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const me = await requireRole("CUSTOMER");
  const [requests, summary, inbox] = await Promise.all([
    api<RequestCard[]>("/api/customer/requests"),
    api<Summary>("/api/customer/summary"),
    api<Inbox>("/api/notifications?limit=3"),
  ]);
  const active = requests.find((r) => ACTIVE.includes(r.status));
  const recent = requests.filter((r) => r.status !== "DRAFT").slice(0, 3);
  const home = me.customer?.addresses[0];
  const kgParts = summary.byCategory.filter((c) => c.unit === "KG").map((c) => ({ code: c.code, color: c.color, value: Number(c.qty), label: c.name }));

  return (
    <>
      <div className="app-top">
        <Brand />
        <Link className="icon-btn" href="/customer/notifications" aria-label={inbox.unread ? `Notifications, ${inbox.unread} new` : "Notifications"}>
          <Icon name="bell" />
          {inbox.unread > 0 && <span className="dot" />}
        </Link>
      </div>
      <div className="hello">
        <h1>{greeting()}, {me.name.split(" ")[0]}</h1>
        <p>{CUSTOMER_TYPE[me.customer?.customerType ?? "HOUSEHOLD"]} account{home?.area ? `, ${home.area}` : ""}</p>
      </div>

      {active && (
        <article className="active-card" aria-label="Active pickup">
          <div className="row1"><span>Active pickup {active.code}</span><span className="pill"><StatusLabel status={active.status} /></span></div>
          <div className="when">{active.date ? day(active.date) : "Date to be confirmed"}<br />{slot(active.slot)}</div>
          <div className="who"><Icon name="truck" size={18} />{active.collectorName ? `${active.collectorName} will collect from your address` : "A collector will be assigned soon"}</div>
          {home?.lat && home.lng && (
            <AppMap className="card-map" label="Map of your pickup address" markers={[{ id: "home", lat: home.lat, lng: home.lng, kind: "home" }]} zoom={15} />
          )}
          <div style={{ marginTop: 16 }}><ItemStrip items={active.items} /></div>
          <div style={{ marginTop: 8 }}><ItemLegend items={active.items} /></div>
          <Link href={`/customer/requests/${active.id}`} className="btn btn-light btn-block">Track pickup</Link>
        </article>
      )}

      <Link className="new-cta" href="/customer/new">
        <span className="plus"><Icon name="plus" size={22} /></span>
        <span><b>New collection</b><span>Paper, plastic, metal, e-waste and more</span></span>
      </Link>

      <div className="sec-h"><h2>Your recycling so far</h2><Link href="/customer/history">History</Link></div>
      <div className="panel" style={{ margin: "0 20px" }}>
        <div className="total"><span className="disp">{num(summary.kg)}</span><span>kg collected</span></div>
        {kgParts.length > 0 && <div style={{ marginTop: 14 }}><ValueStrip parts={kgParts} thick /></div>}
        {kgParts.length > 0 && (
          <div className="legend" style={{ marginTop: 10 }}>
            {kgParts.map((p) => <span key={p.code}><b className="sw" style={{ background: `var(--c-${p.code}, ${p.color})` }} />{p.label} {num(p.value)} kg</span>)}
          </div>
        )}
        <div className="counts">
          <div><b>{summary.total}</b><span>Requests</span></div>
          <div><b>{summary.completed}</b><span>Completed</span></div>
          <div><b>{summary.cancelled}</b><span>Cancelled</span></div>
          <div><b>{summary.failed}</b><span>Failed</span></div>
        </div>
      </div>

      <div className="sec-h"><h2>Updates</h2><Link href="/customer/notifications">See all</Link></div>
      {inbox.items.length === 0 ? <Empty icon="bell" title="No updates yet">We’ll tell you here when anything changes.</Empty> : (
        <div className="list">
          {inbox.items.map((n) => (
            <Link key={n.id} href={n.link ?? "/customer/notifications"} className="li" style={{ color: "inherit", textDecoration: "none" }}>
              <span className="ico"><Icon name={n.kind === "assigned" ? "truck" : n.kind === "rescheduled" ? "refresh" : n.kind === "failed" ? "x" : "check"} size={18} /></span>
              <div className="t">{n.title}<small>{n.body} · {when(n.at)}</small></div>
            </Link>
          ))}
        </div>
      )}

      <div className="sec-h"><h2>Recent requests</h2><Link href="/customer/requests">All requests</Link></div>
      {recent.length === 0 ? <Empty title="No requests yet">When you book a pickup, you can follow it here step by step.</Empty> : (
        <div className="list">
          {recent.map((r) => (
            <Link key={r.id} href={`/customer/requests/${r.id}`} className="li" style={{ color: "inherit", textDecoration: "none" }}>
              <div className="t">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{r.code}</b><StatusPill status={r.status} /></div>
                <small>{r.date ? day(r.date) : "No date yet"} — {r.items.map((i) => i.name).join(", ")}</small>
                <ItemStrip items={r.items} actual={r.status === "COMPLETED"} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = { SCHEDULED: "Scheduled", ASSIGNED: "Collector assigned", PICKUP_STARTED: "On the way", COLLECTED: "Collected" };
  return <>{labels[status] ?? status}</>;
}
