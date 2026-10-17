"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { completePickup, failPickup, pickupStep, recordQuantities, uploadEvidence } from "@/actions/collector";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Note } from "@/components/ui";
import { CUSTOMER_TYPE, FAIL_REASONS, PICKUP_FLOW, day, num, qty, slot } from "@/lib/format";
import { MAP } from "@/lib/map/config";
import type { Category, RequestDetail } from "@/lib/types";

type Row = { categoryId: number; name: string; code: string; color: string; estimated: number | null; unit: string; qty: string };

export function PickupFlow({ pickupId, r, categories, photoRequired }: { pickupId: number; r: RequestDetail; categories: Category[]; photoRequired: boolean }) {
  const p = r.pickup;
  const status = p?.status ?? "COMPLETED";
  const idx = PICKUP_FLOW.findIndex((f) => f.id === status);
  const step = useAction(pickupStep);
  const record = useAction(recordQuantities);
  const complete = useAction(completePickup);
  const fail = useAction(failPickup);
  const photo = useAction(uploadEvidence);
  const [rows, setRows] = useState<Row[]>(() => r.items.map((i) => ({
    categoryId: i.categoryId, name: i.name, code: i.code, color: i.color, estimated: i.estimated, unit: i.actualUnit ?? i.unit,
    qty: i.actual !== null ? String(i.actual) : i.estimated !== null ? String(i.estimated) : "",
  })));
  const [notes, setNotes] = useState(p?.collectorNotes ?? "");
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState("CUSTOMER_UNAVAILABLE");
  const [failNote, setFailNote] = useState("");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const recording = status === "ARRIVED" || status === "COLLECTION_STARTED";
  const finished = status === "COMPLETED" || status === "FAILED" || !p;
  const evidence = r.photos.filter((ph) => ph.kind === "EVIDENCE");
  const error = step.error ?? record.error ?? complete.error ?? fail.error;

  // Show the collector's own position on the map while they're travelling, if they allow it.
  useEffect(() => {
    if (!["ON_THE_WAY", "ARRIVED"].includes(status) || !("geolocation" in navigator)) return;
    const w = navigator.geolocation.watchPosition((pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => undefined, { enableHighAccuracy: true, maximumAge: 30000 });
    return () => navigator.geolocation.clearWatch(w);
  }, [status]);

  const unused = categories.filter((c) => !rows.some((x) => x.categoryId === c.id));
  const phoneVisible = !r.customer.mobile.includes("•");

  /** The main button moves to the next step; saving quantities and completing have their own calls. */
  function primary() {
    const next = PICKUP_FLOW[idx + 1]?.id;
    if (status === "COLLECTED") complete.run(pickupId);
    else if (next && next !== "COLLECTED") step.run(pickupId, next);
  }

  return (
    <>
      <div className="app-top">
        <Link href="/collector" className="icon-btn" aria-label="Back"><Icon name="back" /></Link>
        <h1 className="title">{p ? `${day(p.date)}, ${slot(p.slot)}` : "Pickup"}</h1>
        <span className="muted" style={{ fontSize: 13 }}>{r.code}</span>
      </div>
      {p && (
        <>
          <div className="stepper" aria-label="Pickup progress">
            {PICKUP_FLOW.map((f, i) => <div key={f.id} className={i < idx || status === "COMPLETED" ? "done" : i === idx ? "cur" : ""} title={f.label} />)}
          </div>
          <div className="step-now">
            <span>{status === "FAILED" ? <b>Failed: {p.failReason}</b> : <>Step {idx + 1} of {PICKUP_FLOW.length}: <b>{PICKUP_FLOW[idx]?.label}</b></>}</span>
            {PICKUP_FLOW[idx + 1] && status !== "FAILED" && <span>Next: {PICKUP_FLOW[idx + 1].label}</span>}
          </div>
        </>
      )}

      <div className="cust">
        <h2>{r.customer.name}</h2>
        <div className="meta">{r.customerType ? CUSTOMER_TYPE[r.customerType] : ""}{p ? `, ${slot(p.slot)}` : ""}</div>
        <div className="panel" style={{ marginTop: 12, padding: "12px 14px" }}>
          {r.lat && r.lng && (
            <AppMap className="cust-map" label="Map of the pickup location"
              markers={[{ id: "pin", lat: r.lat, lng: r.lng, kind: "pin" }, ...(here ? [{ id: "me", lat: here.lat, lng: here.lng, kind: "me" as const }] : [])]}
              route={here ? [[here.lat, here.lng], [r.lat, r.lng]] : undefined} zoom={16} />
          )}
          <div className="kv">
            <span><Icon name="pin" size={18} /></span><span>{r.address}</span>
            <span><Icon name="user" size={18} /></span><span>{r.customer.name}, <span className="nowrap">{r.customer.mobile}</span></span>
          </div>
          <div className="acts">
            {r.lat && r.lng && <a className="btn btn-ghost btn-sm" href={MAP.directionsUrl(r.lat, r.lng)} target="_blank" rel="noopener"><Icon name="nav" size={16} />Directions</a>}
            {phoneVisible && <a className="btn btn-ghost btn-sm" href={`tel:${r.customer.mobile.replace(/\s/g, "")}`}><Icon name="phone" size={16} />Call</a>}
          </div>
          {!phoneVisible && !finished && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>The customer’s number shows once you accept the pickup.</p>}
        </div>
      </div>
      {r.notes && <div className="cust-note"><Note icon="message">{r.notes}</Note></div>}
      {error && <div style={{ margin: "12px 20px 0" }}><FormError message={error.message} /></div>}

      <div className="sec-h"><h2>{recording ? "Record what you collected" : "Materials"}</h2></div>
      <div className="rec">
        {rows.map((x, i) => {
          const d = x.estimated !== null && x.qty !== "" ? Number(x.qty) - Number(x.estimated) : null;
          return (
            <div key={x.categoryId} className="rec-row" style={{ ["--c" as string]: `var(--c-${x.code}, ${x.color})` }}>
              <div className="top"><b>{x.name}</b><span className="est">{x.estimated !== null ? `Customer estimate: ${qty(x.estimated, x.unit)}` : "Not in the customer’s list"}</span></div>
              {recording ? (
                <>
                  <div className="in">
                    <input className="input" type="number" step="0.1" min="0" inputMode="decimal" value={x.qty} aria-label={`Actual ${x.name}`}
                      onChange={(e) => setRows(rows.map((y, j) => j === i ? { ...y, qty: e.target.value } : y))} />
                    <select className="input" aria-label="Unit" value={x.unit} onChange={(e) => setRows(rows.map((y, j) => j === i ? { ...y, unit: e.target.value } : y))}>
                      <option value="KG">kg</option><option value="PCS">pcs</option>
                    </select>
                  </div>
                  {d !== null && <div className="diff">{d === 0 ? "Matches the estimate" : `${d > 0 ? "+" : ""}${num(d)} ${x.unit === "PCS" ? "pcs" : "kg"} compared with the estimate`}</div>}
                </>
              ) : (
                <div className="diff">{r.items[i]?.actual !== null && r.items[i]?.actual !== undefined ? `Collected: ${qty(r.items[i].actual, r.items[i].actualUnit ?? x.unit)}` : ""}</div>
              )}
            </div>
          );
        })}
        {recording && unused.length > 0 && (
          <label className="btn btn-ghost btn-block" style={{ borderStyle: "dashed", position: "relative" }}>
            <Icon name="plus" size={18} />Add another material
            <select aria-label="Add another material" value="" onChange={(e) => {
              const c = categories.find((k) => k.id === Number(e.target.value));
              if (c) setRows([...rows, { categoryId: c.id, name: c.name, code: c.code, color: c.color, estimated: null, unit: c.unit, qty: "" }]);
            }} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}>
              <option value="">Pick a material</option>
              {unused.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <FieldMessage id="rec-msg" error={record.error?.fields.items ?? record.error?.fields.photo} />
        {(recording || status === "COLLECTED") && (
          <div className="panel">
            <b style={{ fontSize: 14 }}>Photo evidence{photoRequired ? "" : " (optional)"}</b>
            <div className="photos">
              {evidence.map((ph) => (
                <a key={ph.id} className="photo" href={`/files/photo/${ph.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src={`/files/photo/${ph.id}`} alt="Photo of the material" />
                </a>
              ))}
              {evidence.length < 4 && (
                <label className="photo add" aria-label="Take photo" style={{ cursor: "pointer" }}>
                  <Icon name="camera" size={22} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { const fd = new FormData(); fd.set("file", f); photo.run(pickupId, fd); } e.target.value = ""; }} />
                </label>
              )}
            </div>
            {photo.pending && <p className="muted" style={{ fontSize: 13 }}>Uploading…</p>}
            <FieldMessage id="ph-msg" error={photo.error?.fields.file ?? photo.error?.message} />
            {recording && <textarea className="input" style={{ marginTop: 10, height: 64 }} placeholder="Notes for the office (optional)" aria-label="Notes for the office"
              value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />}
          </div>
        )}
      </div>

      {!finished && status !== "COLLECTED" && (
        <>
          <div className={failOpen ? "sheet open" : "sheet"} id="fail-sheet">
            <h3>Why did this pickup fail?</h3>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 6px" }}>The customer and office are notified. The request stays in history.</p>
            {FAIL_REASONS.map((f) => (
              <label key={f.value}><input type="radio" name="fr" checked={reason === f.value} onChange={() => setReason(f.value)} />{f.label}</label>
            ))}
            <textarea className="input" style={{ marginTop: 8, height: 60 }} placeholder="What happened? (optional)" aria-label="Failure note" value={failNote} onChange={(e) => setFailNote(e.target.value)} />
            <ConfirmButton className="btn btn-danger-solid btn-block" title="Mark this pickup failed?" confirmLabel="Mark failed" danger
              body={`Reason: ${FAIL_REASONS.find((f) => f.value === reason)?.label}.`} onConfirm={() => fail.run(pickupId, reason, failNote)}>
              Mark pickup failed
            </ConfirmButton>
          </div>
          <div className="pad" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-danger btn-block" aria-expanded={failOpen} aria-controls="fail-sheet" onClick={() => setFailOpen(!failOpen)}>Can’t complete this pickup</button>
          </div>
        </>
      )}
      <div style={{ height: 20 }} />

      <div className="foot" style={{ gridTemplateColumns: "1fr" }}>
        {finished ? (
          <Link href="/collector" className="btn btn-ghost btn-block">Back to today</Link>
        ) : status === "COLLECTION_STARTED" ? (
          <button type="button" className="btn btn-primary btn-block" style={{ height: 56, fontSize: 16 }} disabled={record.pending}
            onClick={() => record.run(pickupId, rows.filter((x) => x.qty !== "").map((x) => ({ categoryId: x.categoryId, qty: Number(x.qty), unit: x.unit })), notes)}>
            <Icon name="scale" size={20} />{record.pending ? "Saving…" : "Save quantities and mark collected"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" style={{ height: 56, fontSize: 16 }} disabled={step.pending || complete.pending} onClick={primary}>
            {PICKUP_FLOW[idx]?.action ?? "Continue"}
          </button>
        )}
      </div>
    </>
  );
}
