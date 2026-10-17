import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Note, Skeleton, StatusPill, Timeline } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { day, num, qty, slot, when } from "@/lib/format";
import type { RequestDetail } from "@/lib/types";
import { CancelRequest, ConfirmCollection } from "./RequestActions";

export const metadata: Metadata = { title: "Request" };

export default function TrackPage(props: PageProps<"/customer/requests/[id]">) {
  return (
    <Suspense fallback={<div className="pad" style={{ paddingTop: 20 }}><Skeleton h={40} /><Skeleton h={260} style={{ marginTop: 16 }} /></div>}>
      <Track params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Track({ params, searchParams }: { params: PageProps<"/customer/requests/[id]">["params"]; searchParams: PageProps<"/customer/requests/[id]">["searchParams"] }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireRole("CUSTOMER");
  if (!/^\d+$/.test(id)) return <Note tone="warn">We couldn’t find that request.</Note>;
  const r = await api<RequestDetail>(`/api/customer/requests/${id}`);
  const p = r.pickup;
  const collected = r.status === "COLLECTED" || r.status === "COMPLETED";
  const estKg = r.items.filter((i) => i.unit === "KG").reduce((a, i) => a + Number(i.estimated ?? 0), 0);
  const actKg = r.items.filter((i) => (i.actualUnit ?? i.unit) === "KG").reduce((a, i) => a + Number(i.actual ?? 0), 0);
  const phoneVisible = p && !p.collector.mobile.includes("•");

  return (
    <>
      <div className="app-top">
        <Link href="/customer/requests" className="icon-btn" aria-label="Back"><Icon name="back" /></Link>
        <h1 className="title">{r.code}</h1>
        <StatusPill status={r.status} />
      </div>

      {sp.sent === "1" && r.status === "SUBMITTED" && (
        <div style={{ margin: "4px 20px 0" }}><Note tone="ok" icon="check">Request sent. We’ll review it and let you know.</Note></div>
      )}
      {r.status === "INFO_REQUESTED" && (
        <div style={{ margin: "4px 20px 0" }}>
          <Note tone="warn" icon="message">We need more information: {r.infoRequest}</Note>
          <Link href={`/customer/new?edit=${r.id}`} className="btn btn-primary btn-block" style={{ marginTop: 10 }}>Update request</Link>
        </div>
      )}
      {r.status === "REJECTED" && <div style={{ margin: "4px 20px 0" }}><Note tone="warn" icon="x">Rejected: {r.rejectReason}</Note></div>}
      {r.status === "CANCELLED" && <div style={{ margin: "4px 20px 0" }}><Note tone="warn" icon="x">Cancelled by {r.cancelledBy}{r.cancelReason ? `: ${r.cancelReason}` : ""}.</Note></div>}

      {r.actions.canConfirm && (
        <ConfirmCollection id={r.id} collector={p?.collector.name ?? "The collector"} actualKg={actKg} estimatedKg={estKg} />
      )}

      <section className="sched">
        {r.lat && r.lng && (
          <AppMap className="sched-map" label="Map of your pickup address"
            markers={[{ id: "home", lat: r.lat, lng: r.lng, kind: collected ? "home-done" : "home" }]} zoom={16} />
        )}
        <div className="head">
          <small>{collected && p?.collectedAt ? "Collected on" : r.scheduledDate ? "Scheduled pickup" : "You asked for"}</small>
          <div className="disp">
            {collected && p?.collectedAt ? when(p.collectedAt)
              : r.scheduledDate ? `${day(r.scheduledDate)}, ${slot(r.scheduledSlot)}`
              : r.preferredDate ? `${day(r.preferredDate)}, ${slot(r.preferredSlot)}` : "No date yet"}
          </div>
        </div>
        <div className="row"><Icon name="pin" size={18} /><span className="grow">{r.address}</span></div>
        {p && (
          <div className="row">
            <Icon name="truck" size={18} />
            <span className="grow"><b>{p.collector.name}</b><br /><span className="muted">{p.collector.detail ?? ""}</span></span>
            {phoneVisible && (
              <a className="btn btn-ghost btn-sm" href={`tel:${p.collector.mobile.replace(/\s/g, "")}`} aria-label={`Call ${p.collector.name}`}>
                <Icon name="phone" size={16} />Call
              </a>
            )}
          </div>
        )}
      </section>

      <div className="sec-h"><h2>Progress</h2></div>
      <Timeline steps={r.timeline} />

      <div className="sec-h"><h2>Items</h2></div>
      <div className="panel" style={{ margin: "0 20px" }}>
        <table className="items-t">
          <thead><tr><th>Material</th><th>You estimated</th><th>Collected</th></tr></thead>
          <tbody>
            {r.items.map((i) => (
              <tr key={i.categoryId}>
                <td><b className="sw" style={{ background: `var(--c-${i.code}, ${i.color})` }} />{i.name}</td>
                <td>{i.estimated !== null ? qty(i.estimated, i.unit) : "—"}</td>
                <td>{i.actual !== null ? qty(i.actual, i.actualUnit ?? i.unit) : <span className="muted">after pickup</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td>{num(estKg)} kg</td><td>{collected ? `${num(actKg)} kg` : "—"}</td></tr></tfoot>
        </table>
        {r.notes && <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>Your note: {r.notes}</p>}
      </div>

      {r.photos.length > 0 && (
        <>
          <div className="sec-h"><h2>Photos</h2></div>
          <div className="photos pad">
            {r.photos.map((ph) => (
              <a key={ph.id} className="photo" href={`/files/photo/${ph.id}`} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={`/files/photo/${ph.id}`} alt={ph.kind === "EVIDENCE" ? "Collector’s photo" : "Your photo"} />
              </a>
            ))}
          </div>
        </>
      )}

      {r.reschedules.length > 0 && (
        <>
          <div className="sec-h"><h2>Schedule changes</h2></div>
          <div className="resched" style={{ display: "grid", gap: 8 }}>
            {r.reschedules.map((x, i) => (
              <div key={i} className="panel">
                {x.fromDate && <div className="from">{day(x.fromDate)}, {slot(x.fromSlot)}</div>}
                <div><b>{day(x.toDate)}, {slot(x.toSlot)}</b></div>
                <p className="muted" style={{ marginTop: 6 }}>{x.reason}. Changed by {x.by}, {when(x.at)}.</p>
              </div>
            ))}
          </div>
        </>
      )}

      {r.confirmation && (
        <div style={{ margin: "14px 20px 0" }}>
          <Note tone="ok" icon="check">{r.confirmation.auto ? "Completed automatically." : `You confirmed this collection on ${when(r.confirmation.at)}.`}{r.confirmation.feedback ? ` Feedback: ${r.confirmation.feedback}` : ""}</Note>
        </div>
      )}

      {r.actions.canComplain && (
        <div className="pad" style={{ marginTop: 18 }}>
          <Link className="btn btn-ghost btn-block" href={`/customer/complaints?request=${r.id}`}>Report an issue</Link>
        </div>
      )}

      {r.actions.canCancel && <CancelRequest id={r.id} until={r.actions.cancelUntil} />}
      {!r.actions.canCancel && r.actions.cancelUntil && ["SCHEDULED", "ASSIGNED", "ACCEPTED"].includes(r.status) && (
        <p className="empty-hint">It’s past the cancellation cut-off. Contact us if you can’t be there.</p>
      )}
      <div style={{ height: 20 }} />
    </>
  );
}
