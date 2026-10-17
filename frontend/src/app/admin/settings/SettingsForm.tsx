"use client";

import { useState } from "react";
import { saveSettings, saveZone } from "@/actions/admin";
import { FieldMessage } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import type { ZoneRow } from "@/lib/admin-types";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function SettingsForm({ initial, zones }: { initial: Record<string, string>; zones: ZoneRow[] }) {
  const [v, setV] = useState(initial);
  const save = useAction(saveSettings);
  const err = save.error?.fields ?? {};
  const changed = Object.keys(v).filter((k) => v[k] !== initial[k]);
  const set = (k: string, val: string) => setV({ ...v, [k]: val });
  const days = new Set(v.working_days.split(",").filter(Boolean));
  const toggleDay = (d: string) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d); else next.add(d);
    set("working_days", DAYS.filter((x) => next.has(x)).join(","));
  };
  const bool = (k: string, label: string, hint: string) => (
    <div className="set-row"><span>{label}<small>{hint}</small></span>
      <label className="switch"><input type="checkbox" checked={v[k] === "true"} aria-label={label} onChange={(e) => set(k, String(e.target.checked))} /><span /></label></div>
  );
  const slots: string[] = [];
  const [oh, om] = (v.open_time ?? "08:00").split(":").map(Number);
  const [ch, cm] = (v.close_time ?? "18:00").split(":").map(Number);
  const len = Number(v.slot_minutes) || 120;
  for (let t = oh * 60 + om; t + len <= ch * 60 + cm && slots.length < 24; t += len) {
    const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    slots.push(`${f(t)} – ${f(t + len)}`);
  }

  return (
    <>
      <div className="set-grid">
        <section className="set">
          <h2>Working days and hours</h2><p className="sub">Customers can only pick times inside these hours.</p>
          <div className="daychips" role="group" aria-label="Working days">
            {DAYS.map((d) => <button key={d} type="button" aria-pressed={days.has(d)} onClick={() => toggleDay(d)}>{d.charAt(0) + d.slice(1).toLowerCase()}</button>)}
          </div>
          <FieldMessage id="wd" error={err.working_days} />
          <div className="row2">
            <div className="field"><label className="field-label" htmlFor="set-open">Opens</label><input className="input" type="time" id="set-open" value={v.open_time} onChange={(e) => set("open_time", e.target.value)} style={{ height: 40 }} /></div>
            <div className="field"><label className="field-label" htmlFor="set-close">Closes</label><input className="input" type="time" id="set-close" value={v.close_time} onChange={(e) => set("close_time", e.target.value)} style={{ height: 40 }} /></div>
          </div>
          <FieldMessage id="ct" error={err.close_time ?? err.open_time} />
          <div className="field"><label className="field-label" htmlFor="set-hol">Closed dates</label>
            <input className="input" id="set-hol" value={v.closed_dates} placeholder="2026-10-20, 2026-11-01" onChange={(e) => set("closed_dates", e.target.value)} style={{ height: 40 }} />
            <FieldMessage id="cd" error={err.closed_dates} hint="Dates as YYYY-MM-DD, separated by commas." /></div>
        </section>
        <section className="set">
          <h2>Time slots</h2><p className="sub">Generated from working hours.</p>
          <div className="field"><label className="field-label" htmlFor="set-slot">Slot length</label>
            <select className="input" id="set-slot" value={v.slot_minutes} onChange={(e) => set("slot_minutes", e.target.value)} style={{ height: 40 }}>
              <option value="60">1 hour</option><option value="120">2 hours</option><option value="180">3 hours</option></select>
            <FieldMessage id="sm" error={err.slot_minutes} /></div>
          <div className="slotlist">{slots.map((s) => <div key={s}>{s}<span className="muted" style={{ fontWeight: 500, fontSize: 13 }}>up to {v.collector_daily_capacity} pickups per collector per day</span></div>)}</div>
        </section>
        <section className="set">
          <h2>Requests and pickups</h2>
          <div className="field"><label className="field-label" htmlFor="set-cut">Customers can cancel until</label>
            <select className="input" id="set-cut" value={v.cancel_cutoff} onChange={(e) => set("cancel_cutoff", e.target.value)} style={{ height: 40 }}>
              <option value="DAY_BEFORE_1800">6:00 pm the day before pickup</option><option value="HOURS_BEFORE_2">2 hours before the slot</option><option value="SLOT_START">The start of the slot</option></select></div>
          <div className="field"><label className="field-label" htmlFor="set-cap">Pickups per collector per day</label>
            <input className="input" type="number" id="set-cap" min={1} max={50} value={v.collector_daily_capacity} onChange={(e) => set("collector_daily_capacity", e.target.value)} style={{ height: 40 }} />
            <FieldMessage id="cap" error={err.collector_daily_capacity} /></div>
          <div className="field"><label className="field-label" htmlFor="set-ahead">How far ahead customers can book</label>
            <select className="input" id="set-ahead" value={v.booking_horizon_days} onChange={(e) => set("booking_horizon_days", e.target.value)} style={{ height: 40 }}>
              <option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
          <div className="field"><label className="field-label" htmlFor="set-auto">Complete unconfirmed collections after</label>
            <select className="input" id="set-auto" value={v.auto_complete_hours} onChange={(e) => set("auto_complete_hours", e.target.value)} style={{ height: 40 }}>
              <option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></div>
          {bool("photo_required", "Require a photo when recording quantity", "Helps settle weight disputes")}
          <div className="field"><label className="field-label" htmlFor="set-up">Largest upload</label>
            <select className="input" id="set-up" value={v.max_upload_mb} onChange={(e) => set("max_upload_mb", e.target.value)} style={{ height: 40 }}>
              <option value="2">2 MB</option><option value="5">5 MB</option></select></div>
        </section>
        <section className="set">
          <h2>Notifications</h2>
          <div className="set-row"><span>In-app notifications<small>Always on for every event</small></span><label className="switch"><input type="checkbox" checked disabled aria-label="In-app" /><span /></label></div>
          {bool("email_enabled", "Email", "Needs MAIL_HOST set on the server (any free SMTP service)")}
          <div className="set-row"><span>SMS<small>Paid service, not used in the first version</small></span><label className="switch"><input type="checkbox" disabled aria-label="SMS" /><span /></label></div>
          <div className="field"><label className="field-label" htmlFor="set-rem">Pickup reminder</label>
            <select className="input" id="set-rem" value={v.reminder} onChange={(e) => set("reminder", e.target.value)} style={{ height: 40 }}>
              <option value="EVENING_BEFORE_1800">6:00 pm the evening before</option><option value="HOURS_BEFORE_2">2 hours before the slot</option><option value="OFF">Off</option></select></div>
        </section>
        <section className="set" style={{ gridColumn: "1 / -1" }}>
          <h2>Service areas</h2><p className="sub">Zones used to suggest the nearest collector.</p>
          <div className="zones">{zones.map((z) => <ZoneRowEdit key={z.id} z={z} />)}</div>
        </section>
      </div>
      <div className="savebar" aria-live="polite">
        <span>{save.result?.ok && changed.length === 0 ? "Saved." : changed.length ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}` : "No changes"}{save.error && !Object.keys(err).length ? ` · ${save.error.message}` : ""}</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!changed.length} onClick={() => setV(initial)}>Discard</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!changed.length || save.pending}
            onClick={() => save.run(Object.fromEntries(changed.map((k) => [k, v[k]])))}>Save changes</button>
        </span>
      </div>
    </>
  );
}

function ZoneRowEdit({ z }: { z: ZoneRow }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState({ name: z.name, code: z.code, lat: z.lat, lng: z.lng });
  const save = useAction(saveZone);
  if (!edit) {
    return <div><span><b>{z.name}</b> <small>{z.code}, {z.city}</small></span><small>{z.collectors ?? "No collectors yet"}</small><button type="button" className="lnk" onClick={() => setEdit(true)}>Edit</button></div>;
  }
  return (
    <form style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 100px auto", gap: 8, alignItems: "center" }}
      onSubmit={async (e) => { e.preventDefault(); const r = await save.run(z.id, v); if (r.ok) setEdit(false); }}>
      <input className="input" style={{ height: 36 }} value={v.name} aria-label="Area name" onChange={(e) => setV({ ...v, name: e.target.value })} />
      <input className="input" style={{ height: 36 }} value={v.code} aria-label="Code" onChange={(e) => setV({ ...v, code: e.target.value })} />
      <input className="input" style={{ height: 36 }} value={v.lat ?? ""} aria-label="Latitude" onChange={(e) => setV({ ...v, lat: e.target.value ? Number(e.target.value) : null })} />
      <input className="input" style={{ height: 36 }} value={v.lng ?? ""} aria-label="Longitude" onChange={(e) => setV({ ...v, lng: e.target.value ? Number(e.target.value) : null })} />
      <button className="btn btn-primary btn-sm" type="submit" disabled={save.pending}>Save</button>
      {save.error && <span className="err-text" style={{ gridColumn: "1 / -1" }}>{save.error.message}</span>}
    </form>
  );
}
