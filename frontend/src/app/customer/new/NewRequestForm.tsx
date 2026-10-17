"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDraft, deleteRequestPhoto, saveRequest, uploadRequestPhoto } from "@/actions/customer";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { Note } from "@/components/ui";
import { day, slot as fmtSlot } from "@/lib/format";
import { MAP } from "@/lib/map/config";
import type { AddressView, BookingOptions, Category, RequestDetail } from "@/lib/types";

export function NewRequestForm({ categories, notAccepted, booking, addresses, existing }: {
  categories: Category[]; notAccepted: string[]; booking: BookingOptions; addresses: AddressView[]; existing: RequestDetail | null;
}) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<number, string>>(() =>
    Object.fromEntries((existing?.items ?? []).map((i) => [i.categoryId, String(i.estimated ?? "")])));
  const [addressId, setAddressId] = useState<number>(existing?.addressId ?? addresses[0]?.id ?? 0);
  const address = addresses.find((a) => a.id === addressId);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(() =>
    existing?.lat && existing.lng ? { lat: existing.lat, lng: existing.lng } : address?.lat && address.lng ? { lat: address.lat, lng: address.lng } : null);
  const openDays = booking.days.filter((d) => d.open);
  const [date, setDate] = useState<string>(existing?.preferredDate && booking.days.some((d) => d.date === existing.preferredDate && d.open)
    ? existing.preferredDate : openDays[0]?.date ?? "");
  const [slot, setSlot] = useState<string>(existing?.preferredSlot ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const save = useAction(saveRequest);
  const photo = useAction(uploadRequestPhoto);
  const err = save.error?.fields ?? {};
  const daySlots = booking.days.find((d) => d.date === date)?.slots ?? [];
  const selected = categories.filter((c) => c.id in qtys);

  const toggle = (c: Category) =>
    setQtys((q) => {
      const next = { ...q };
      if (c.id in next) delete next[c.id];
      else next[c.id] = "1";
      return next;
    });

  const payload = (submit: boolean) => ({
    items: selected.map((c) => ({ categoryId: c.id, qty: Number(qtys[c.id]) })),
    addressId,
    lat: pin?.lat ?? null,
    lng: pin?.lng ?? null,
    preferredDate: date || null,
    preferredSlot: slot || null,
    notes,
    submit,
  });

  // Kept in state so Submit and photo uploads reuse the draft even before the URL change reloads `existing`.
  const [draftId, setDraftId] = useState<number | null>(existing?.id ?? null);

  async function saveDraft() {
    const r = await save.run(draftId, payload(false));
    if (r.ok && !draftId) {
      const id = (r.data as { id: number }).id;
      setDraftId(id);
      router.replace(`/customer/new?edit=${id}`);
    }
  }

  async function addPhoto(file: File) {
    let id = draftId;
    if (!id) {
      const r = await save.run(null, payload(false));
      if (!r.ok) return;
      id = (r.data as { id: number }).id;
      setDraftId(id);
      router.replace(`/customer/new?edit=${id}`);
    }
    const fd = new FormData();
    fd.set("file", file);
    await photo.run(id, fd);
  }

  const center = pin ?? (address?.lat && address.lng ? { lat: address.lat, lng: address.lng } : { lat: MAP.defaultCenter[0], lng: MAP.defaultCenter[1] });

  return (
    <>
      <div className="app-top">
        <Link href="/customer" className="icon-btn" aria-label="Back"><Icon name="back" /></Link>
        <h1 className="title">{existing?.status === "INFO_REQUESTED" ? `Update ${existing.code}` : "New collection"}</h1>
        {draftId && <span className="muted" style={{ fontSize: 13 }}>Draft saved</span>}
      </div>
      {existing?.status === "INFO_REQUESTED" && existing.infoRequest && (
        <div style={{ margin: "4px 20px 0" }}><Note tone="warn" icon="message">We need more information: {existing.infoRequest}</Note></div>
      )}
      {save.error?.message && <div style={{ margin: "12px 20px 0" }}><FormError message={save.error.message} /></div>}

      <section className="step" aria-labelledby="s1">
        <div className="step-h"><span className="n">1</span><h2 id="s1">What are you recycling?</h2></div>
        <div className="bins">
          {categories.map((c) => (
            <button key={c.id} type="button" className="bin" style={{ ["--c" as string]: `var(--c-${c.code}, ${c.color})` }}
              aria-pressed={c.id in qtys} onClick={() => toggle(c)}>
              <span className="tick"><Icon name="check" size={13} /></span>
              <b>{c.name}</b><small>in {c.unit === "PCS" ? "pcs" : "kg"}</small>
            </button>
          ))}
        </div>
        <FieldMessage id="items-msg" error={err.items} />
        <div className="qty-rows">
          {selected.map((c, idx) => (
            <div key={c.id} className="qty-row" style={{ ["--c" as string]: `var(--c-${c.code}, ${c.color})` }}>
              <div className="top">
                <b>{c.name}</b>
                <label className="qty-in">
                  <input type="number" min="0.1" step="0.5" inputMode="decimal" value={qtys[c.id]} aria-label={`${c.name} quantity`}
                    onChange={(e) => setQtys({ ...qtys, [c.id]: e.target.value })} />
                  <span>{c.unit === "PCS" ? "pcs" : "kg"}</span>
                </label>
              </div>
              {c.accepts && <small>{c.accepts}</small>}
              {c.warning && <Note tone="warn" icon="alert">{c.warning}</Note>}
              <FieldMessage id={`q${idx}`} error={err[`items[${idx}].qty`]} />
            </div>
          ))}
        </div>
        <details className="na">
          <summary><Icon name="x" size={16} />Items we can’t collect</summary>
          <ul>{notAccepted.map((x) => <li key={x}>{x}</li>)}</ul>
        </details>
      </section>

      <section className="step" aria-labelledby="s2">
        <div className="step-h"><span className="n">2</span><h2 id="s2">Pickup address</h2></div>
        <div className="panel">
          {addresses.length > 1 && (
            <div className="opts" role="group" aria-label="Saved addresses" style={{ marginBottom: 10 }}>
              {addresses.map((a) => (
                <button key={a.id} type="button" className="opt" aria-pressed={a.id === addressId}
                  onClick={() => { setAddressId(a.id); setPin(a.lat && a.lng ? { lat: a.lat, lng: a.lng } : null); }}>
                  {a.label ?? "Address"}
                </button>
              ))}
            </div>
          )}
          {address && (
            <div className="addr">
              <span className="ico"><Icon name="pin" /></span>
              <div><b>{address.label ?? "Address"}</b><div className="muted" style={{ fontSize: 14 }}>{[address.line1, address.area, address.city, address.pin].filter(Boolean).join(", ")}</div></div>
            </div>
          )}
          <AppMap className="mapbox" label="Drag the pin to your gate" pin={{ lat: center.lat, lng: center.lng, onMove: (lat, lng) => setPin({ lat, lng }) }} zoom={16} fit={false} center={[center.lat, center.lng]} />
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Drag the pin to your gate or building entrance.</p>
          <FieldMessage id="addr-msg" error={err.addressId} />
          <Link href="/customer/profile#addresses" style={{ fontSize: 13.5, color: "var(--leaf-text)", fontWeight: 600 }}>Add or edit addresses</Link>
        </div>
      </section>

      <section className="step" aria-labelledby="s3">
        <div className="step-h"><span className="n">3</span><h2 id="s3">Preferred date and time</h2></div>
        <div className="chips" role="group" aria-label="Day">
          {booking.days.map((d) => {
            const [, label, n] = day(d.date).match(/^(\w+) (\d+)/) ?? [];
            return (
              <button key={d.date} type="button" className="day" aria-pressed={d.date === date} disabled={!d.open}
                title={d.open ? undefined : "Closed"} onClick={() => { setDate(d.date); setSlot(""); }}>
                <small>{label}</small><b>{n}</b><small>{d.open ? day(d.date).split(" ")[2] : "Closed"}</small>
              </button>
            );
          })}
        </div>
        <div className="slots" role="group" aria-label="Time slot">
          {booking.slots.map((s) => (
            <button key={s} type="button" className="slot" aria-pressed={s === slot} disabled={!daySlots.includes(s)} onClick={() => setSlot(s)}>
              {fmtSlot(s)}
            </button>
          ))}
        </div>
        <FieldMessage id="date-msg" error={err.preferredDate ?? err.preferredSlot} />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          Pickups run {booking.workingDays.length === 6 ? "Mon – Sat" : booking.workingDays.map((d) => d.slice(0, 3).toLowerCase()).join(", ")}, {booking.openTime} – {booking.closeTime}.
        </p>
      </section>

      <section className="step" aria-labelledby="s4">
        <div className="step-h"><span className="n">4</span><h2 id="s4">Notes and photos</h2></div>
        <textarea className="input" placeholder="Where should the collector go? Anything to know?" value={notes} maxLength={1000}
          onChange={(e) => setNotes(e.target.value)} aria-label="Notes for the collector" />
        <div className="photos">
          {(existing?.photos ?? []).filter((p) => p.kind === "CUSTOMER").map((p) => (
            <div key={p.id} className="photo" style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={`/files/photo/${p.id}`} alt="Your photo of the material" />
              <button type="button" className="rm" aria-label="Remove photo" onClick={() => existing && deleteRequestPhoto(existing.id, p.id)}><Icon name="x" size={12} /></button>
            </div>
          ))}
          {(existing?.photos.filter((p) => p.kind === "CUSTOMER").length ?? 0) < 4 && (
            <label className="photo add" aria-label="Add photo" style={{ cursor: "pointer" }}>
              <Icon name="camera" size={22} />
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {photo.pending && <p className="muted" style={{ fontSize: 13 }}>Uploading…</p>}
        <FieldMessage id="photo-msg" error={photo.error?.fields.file ?? photo.error?.message} hint={`Optional. Up to 4 photos, ${booking.maxUploadMb} MB each.`} />
        {existing?.status === "DRAFT" && (
          <div style={{ marginTop: 16 }}>
            <ConfirmButton className="lnk bad" title="Delete this draft?" body="The draft and its photos will be removed." confirmLabel="Delete draft" danger
              onConfirm={() => deleteDraft(existing.id)}>Delete draft</ConfirmButton>
          </div>
        )}
      </section>
      <div style={{ height: 20 }} />
      <div className="foot">
        <button type="button" className="btn btn-ghost" disabled={save.pending} onClick={saveDraft}>Save draft</button>
        <button type="button" className="btn btn-primary" disabled={save.pending || selected.length === 0} onClick={() => save.run(draftId, payload(true))}>
          {save.pending ? "Sending…" : "Submit request"}
        </button>
      </div>
    </>
  );
}
