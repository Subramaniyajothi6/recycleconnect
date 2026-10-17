"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  acceptRequest, adminCancel, adminFail, askForInfo, assignCollector, rejectRequest, rescheduleRequest, scheduleRequest, startReview,
} from "@/actions/admin";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { PanelClose } from "@/components/PanelClose";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { ItemLegend, ItemStrip, Note, StatusPill } from "@/components/ui";
import type { CollectorOption } from "@/lib/admin-types";
import { CUSTOMER_TYPE, FAIL_REASONS, PICKUP_LABEL, REQUEST_STATUS, day, slot, when } from "@/lib/format";
import type { RequestDetail } from "@/lib/types";

export function ReviewPanel({ r, options, optionsDate, closeHref, slots }: { r: RequestDetail; options: CollectorOption[]; optionsDate: string; closeHref: string; slots: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const review = useAction(startReview);
  const accept = useAction(acceptRequest);
  const reject = useAction(rejectRequest);
  const info = useAction(askForInfo);
  const cancel = useAction(adminCancel);
  const schedule = useAction(scheduleRequest);
  const assign = useAction(assignCollector);
  const resched = useAction(rescheduleRequest);
  const fail = useAction(adminFail);
  const errors = [accept, reject, info, cancel, schedule, assign, resched, fail].map((a) => a.error).find(Boolean);

  // Opening a new request marks it "under review", so other admins see someone has it.
  const started = useRef(false);
  useEffect(() => {
    if (r.status === "SUBMITTED" && !started.current) {
      started.current = true;
      review.run(r.id);
    }
  }, [r.id, r.status, review]);

  const [date, setDate] = useState(optionsDate);
  const [slotSel, setSlotSel] = useState(r.scheduledSlot ?? r.preferredSlot ?? "");
  const [collectorId, setCollectorId] = useState<number | null>(r.pickup?.collector.id ?? options.find((o) => o.eligible)?.id ?? null);
  const [reason, setReason] = useState("");
  const [failReason, setFailReason] = useState("CUSTOMER_UNAVAILABLE");

  const changeDate = (d: string) => {
    setDate(d);
    const next = new URLSearchParams(sp.toString());
    next.set("date", d);
    router.replace(`${path}?${next}`, { scroll: false });
  };

  const st = r.status;
  const canDecide = st === "SUBMITTED" || st === "UNDER_REVIEW";
  const canBook = st === "ACCEPTED" || st === "FAILED";
  const booked = st === "SCHEDULED" || st === "ASSIGNED";
  const canFail = (st === "ASSIGNED" || st === "PICKUP_STARTED") && r.pickup;
  const canCancel = !["COMPLETED", "CANCELLED", "REJECTED", "COLLECTED"].includes(st);
  const chosen = options.find((o) => o.id === collectorId);

  return (
    <aside className="review" aria-label="Review request">
      <div className="rh">
        <div className="r1"><h2>{r.code}</h2><span className="r1-end"><StatusPill status={r.status} /><PanelClose href={closeHref} /></span></div>
        <small>Submitted {when(r.submittedAt ?? r.createdAt)}</small>
      </div>
      {r.overdue && <div className="rs"><Note tone="bad" icon="clock">The booked time has passed and nothing was collected. Reschedule, reassign or mark it failed.</Note></div>}
      {errors && <div className="rs"><FormError message={errors.message} />{Object.values(errors.fields).map((m) => <p key={m} className="err-text">{m}</p>)}</div>}

      <div className="rs">
        <h3>Customer</h3>
        <div className="kv">
          <span><Icon name="user" size={16} /></span>
          <span><b>{r.customer.name}</b>{r.customerType ? `, ${CUSTOMER_TYPE[r.customerType]}` : ""}<br /><span className="muted">{r.customer.mobile}</span></span>
          <span><Icon name="pin" size={16} /></span><span>{r.address}{r.zoneName ? <span className="tag-zone">{r.zoneName}</span> : null}</span>
        </div>
        {r.lat && r.lng && (
          <AppMap className="review-map" label="Map of the pickup address" markers={[{ id: "p", lat: r.lat, lng: r.lng, kind: "pin" }]} zoom={14} />
        )}
      </div>

      <div className="rs">
        <h3>Materials</h3>
        <ItemStrip items={r.items} actual={!!r.items.find((i) => i.actual !== null)} />
        <div style={{ marginTop: 8 }}><ItemLegend items={r.items} actual={!!r.items.find((i) => i.actual !== null)} /></div>
        <p style={{ marginTop: 10 }} className="muted">Asked for {r.preferredDate ? `${day(r.preferredDate)}, ${slot(r.preferredSlot)}` : "no date"}.</p>
        {r.notes && <p style={{ marginTop: 6 }}>{r.notes}</p>}
        {r.photos.length > 0 && (
          <div className="photos">
            {r.photos.map((p) => (
              <a key={p.id} className="photo" style={{ width: 60, height: 60 }} href={`/files/photo/${p.id}`} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={`/files/photo/${p.id}`} alt={p.kind === "EVIDENCE" ? "Collector photo" : "Customer photo"} />
              </a>
            ))}
          </div>
        )}
      </div>

      {canDecide && (
        <div className="rs">
          <h3>Decision</h3>
          <div className="decide">
            <button type="button" className="btn btn-primary" disabled={accept.pending} onClick={() => accept.run(r.id)}><Icon name="check" size={16} />Accept</button>
            <ConfirmButton title="Ask the customer for more information" confirmLabel="Send question" reasonLabel="What do you need to know? (sent to the customer)"
              onConfirm={(m) => info.run(r.id, m)}>Ask for info</ConfirmButton>
            <ConfirmButton title="Reject this request?" confirmLabel="Reject request" danger reasonLabel="Reason for rejecting (sent to the customer)"
              onConfirm={(m) => reject.run(r.id, m)}>Reject</ConfirmButton>
            <ConfirmButton className="btn btn-danger" title="Cancel this request?" confirmLabel="Cancel request" danger reasonLabel="Reason (sent to the customer)"
              onConfirm={(m) => cancel.run(r.id, m)}>Cancel request</ConfirmButton>
          </div>
        </div>
      )}
      {st === "INFO_REQUESTED" && <div className="rs"><Note tone="warn" icon="message">Waiting for the customer: {r.infoRequest}</Note></div>}

      {(canBook || booked) && (
        <div className="rs">
          <h3>{canBook ? (st === "FAILED" ? "Book again" : "Schedule and assign") : st === "SCHEDULED" ? "Assign a collector" : "Collector and schedule"}</h3>
          {booked && <p style={{ marginBottom: 8 }}><b>{day(r.scheduledDate)}, {slot(r.scheduledSlot)}</b>{r.pickup ? ` · ${r.pickup.collector.name} (${PICKUP_LABEL[r.pickup.status]?.label ?? r.pickup.status})` : " · no collector yet"}</p>}
          <label className="field-label" htmlFor="sch-date">{booked ? "Date for the collector check" : "Pickup date"}</label>
          <input id="sch-date" className="input" type="date" value={date} onChange={(e) => changeDate(e.target.value)} style={{ height: 40 }} />
          {(canBook || booked) && (
            <div className="mini-slots" role="group" aria-label="Time slot">
              {slots.map((s) => (
                <button key={s} type="button" aria-pressed={s === slotSel} onClick={() => setSlotSel(s)}>{s.replace("-", "–").replace(/:00/g, "")}</button>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 12px" }}>Customer asked for {r.preferredDate ? `${day(r.preferredDate)}, ${slot(r.preferredSlot)}` : "no date"}.</p>
          <label className="field-label">Collector on {day(date)}</label>
          <div className="coll">
            {options.map((o) => (
              <label key={o.id} style={o.eligible ? undefined : { opacity: 0.55 }}>
                <input type="radio" name="col" disabled={!o.eligible} checked={collectorId === o.id} onChange={() => setCollectorId(o.id)} />
                <span><b>{o.name}</b>{o.inZone && <span className="tag-zone">In zone</span>}<small>{o.reason ?? o.zones}</small></span>
                <span className="load">{o.load} of {o.capacity}<i style={{ ["--w" as string]: `${(o.load / o.capacity) * 100}%` }} /></span>
              </label>
            ))}
            {options.length === 0 && <p className="muted">No approved collectors yet.</p>}
          </div>
          {canBook && (
            <>
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12, height: 44 }} disabled={schedule.pending || !slotSel}
                onClick={() => schedule.run(r.id, date, slotSel, collectorId)}>
                {chosen ? `Schedule and assign ${chosen.name}` : "Schedule without a collector"}
              </button>
              <FieldMessage id="sch-msg" error={schedule.error?.fields.date ?? schedule.error?.fields.slot ?? schedule.error?.fields.collectorId} />
            </>
          )}
          {booked && (
            <>
              <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12, height: 44 }}
                disabled={assign.pending || !collectorId || collectorId === r.pickup?.collector.id} onClick={() => collectorId && assign.run(r.id, collectorId)}>
                {r.pickup
                  ? collectorId === r.pickup.collector.id ? `Already assigned to ${chosen?.name ?? r.pickup.collector.name}` : `Reassign to ${chosen?.name ?? "…"}`
                  : `Assign ${chosen?.name ?? "a collector"}`}
              </button>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label" htmlFor="rs-reason">Reschedule to the date and slot above</label>
                <input id="rs-reason" className="input" style={{ height: 40 }} placeholder="Reason (shown to the customer)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 6 }} disabled={resched.pending || !reason.trim() || !slotSel}
                  onClick={() => resched.run(r.id, date, slotSel, reason)}>Reschedule</button>
              </div>
            </>
          )}
        </div>
      )}

      {(canFail || canCancel) && !canDecide && (
        <div className="rs">
          <h3>Problems</h3>
          {canFail && (
            <div className="field">
              <select className="input" style={{ height: 40 }} value={failReason} onChange={(e) => setFailReason(e.target.value)} aria-label="Failure reason">
                {FAIL_REASONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <ConfirmButton className="btn btn-ghost btn-block" title="Mark this pickup failed?" confirmLabel="Mark failed" danger
                reasonLabel="Note (optional)" reasonRequired={false} onConfirm={(n) => fail.run(r.id, failReason, n)}>Mark pickup failed</ConfirmButton>
            </div>
          )}
          {canCancel && (
            <ConfirmButton className="btn btn-danger btn-block" title="Cancel this request?" confirmLabel="Cancel request" danger reasonLabel="Reason (sent to the customer)"
              onConfirm={(m) => cancel.run(r.id, m)}>Cancel request</ConfirmButton>
          )}
        </div>
      )}

      {(r.pickup || r.pastPickups.length > 0) && (
        <div className="rs">
          <h3>Pickups</h3>
          <ul className="log">
            {[...(r.pickup ? [r.pickup] : []), ...r.pastPickups].map((p) => (
              <li key={p.id}><span>{day(p.date)} {slot(p.slot).slice(0, 5)}</span>{p.collector.name}: {PICKUP_LABEL[p.status]?.label ?? p.status}{p.failReason ? ` (${p.failReason})` : ""}</li>
            ))}
          </ul>
          {r.pickup?.collectorNotes && <p className="muted" style={{ marginTop: 6 }}>Collector note: {r.pickup.collectorNotes}</p>}
        </div>
      )}

      <div className="rs" style={{ borderBottom: 0 }}>
        <h3>Activity</h3>
        <ul className="log">
          {r.history.map((h, i) => (
            <li key={i}><span>{when(h.at)}</span>{REQUEST_STATUS[h.to]?.label ?? h.to} by {h.by}{h.note ? `: ${h.note}` : ""}</li>
          ))}
          {r.reschedules.map((x, i) => (
            <li key={`r${i}`}><span>{when(x.at)}</span>Rescheduled to {day(x.toDate)} by {x.by}: {x.reason}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
