"use client";

import { useState } from "react";
import { deleteAddress, makeDefaultAddress, saveAddress, updateProfile, type AddressPayload } from "@/actions/customer";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { ChoiceGroup } from "@/components/form/Choices";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Pill } from "@/components/ui";
import { CUSTOMER_TYPE, mobile } from "@/lib/format";
import { MAP } from "@/lib/map/config";
import type { AddressView, Me } from "@/lib/types";

const CONTACT_LABEL: Record<string, string> = { PHONE: "Phone call", EMAIL: "Email", APP: "App only" };

export function ProfileDetails({ me }: { me: Me }) {
  const c = me.customer!;
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name: me.name, email: me.email ?? "", customerType: c.customerType as string, preferredContact: c.preferredContact as string });
  const save = useAction(updateProfile);
  const err = save.error?.fields ?? {};
  return (
    <>
      <div className="sec-h"><h2>Your details</h2>
        {!editing && <button type="button" className="linkbtn" onClick={() => setEditing(true)}>Edit</button>}
      </div>
      {!editing ? (
        <div className="kvlist">
          <div className="kvrow"><Icon name="phone" size={18} /><span>{mobile(me.mobile)}<small>Mobile{c.preferredContact === "PHONE" ? ", preferred contact" : ""}</small></span><span /></div>
          <div className="kvrow"><Icon name="message" size={18} /><span>{me.email}<small>Email{c.preferredContact === "EMAIL" ? ", preferred contact" : ""}</small></span><span /></div>
          <div className="kvrow"><Icon name="bell" size={18} /><span>{CONTACT_LABEL[c.preferredContact]}<small>How we contact you</small></span><span /></div>
        </div>
      ) : (
        <form className="form panel" style={{ margin: "0 20px" }} onSubmit={async (e) => {
          e.preventDefault();
          const r = await save.run(v);
          if (r.ok) setEditing(false);
        }}>
          <FormError message={save.error && !Object.keys(err).length ? save.error.message : undefined} />
          <div className="field"><label className="field-label" htmlFor="pf-name">Name</label>
            <input id="pf-name" className={err.name ? "input err" : "input"} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            <FieldMessage id="pf-name-msg" error={err.name} /></div>
          <div className="field"><label className="field-label" htmlFor="pf-email">Email</label>
            <input id="pf-email" className={err.email ? "input err" : "input"} inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
            <FieldMessage id="pf-email-msg" error={err.email} /></div>
          <div className="field"><span className="field-label" id="pf-type-l">Account type</span>
            <ChoiceGroup name="customerType" labelledBy="pf-type-l" value={v.customerType} onChange={(x) => setV({ ...v, customerType: x })}
              options={Object.entries(CUSTOMER_TYPE).map(([value, label]) => ({ value, label }))} /></div>
          <div className="field"><span className="field-label" id="pf-c-l">How should we contact you?</span>
            <ChoiceGroup name="preferredContact" labelledBy="pf-c-l" value={v.preferredContact} onChange={(x) => setV({ ...v, preferredContact: x })}
              options={Object.entries(CONTACT_LABEL).map(([value, label]) => ({ value, label }))} /></div>
          <p className="muted" style={{ fontSize: 12.5 }}>To change your mobile number, contact the RecycleConnect team.</p>
          <div className="decide">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={save.pending}>Save</button>
          </div>
        </form>
      )}
    </>
  );
}

const EMPTY: AddressPayload = { label: "", line1: "", area: "", city: "Chennai", district: "Chennai", state: "Tamil Nadu", pin: "", lat: null, lng: null };

export function Addresses({ addresses }: { addresses: AddressView[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const remove = useAction(deleteAddress);
  const makeDefault = useAction(makeDefaultAddress);
  return (
    <div style={{ display: "grid", gap: 10, margin: "0 20px" }}>
      {addresses.map((a) => editing === a.id ? (
        <AddressEditor key={a.id} id={a.id} initial={{ label: a.label ?? "", line1: a.line1, area: a.area ?? "", city: a.city, district: a.district ?? "", state: a.state ?? "", pin: a.pin ?? "", lat: a.lat, lng: a.lng }} onDone={() => setEditing(null)} />
      ) : (
        <div key={a.id} className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <b>{a.label ?? "Address"}</b> {a.isDefault && <Pill tone="active">Default</Pill>}
              <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{[a.line1, a.area, a.city, a.pin].filter(Boolean).join(", ")}</div>
            </div>
          </div>
          {a.lat && a.lng && <AppMap className="addr-map" label={`Map of ${a.label ?? "your address"}`} markers={[{ id: a.id, lat: a.lat, lng: a.lng, kind: "home" }]} zoom={15} />}
          <div className="rowact" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button type="button" className="lnk" onClick={() => setEditing(a.id)}>Edit</button>
            {!a.isDefault && <button type="button" className="lnk" onClick={() => makeDefault.run(a.id)}>Make default</button>}
            {!a.isDefault && (
              <ConfirmButton className="lnk bad" title="Remove this address?" body="Past requests keep their address." confirmLabel="Remove" danger onConfirm={() => remove.run(a.id)}>
                Remove
              </ConfirmButton>
            )}
          </div>
        </div>
      ))}
      {(remove.error || makeDefault.error) && <FormError message={(remove.error ?? makeDefault.error)?.message} />}
      {editing === "new" ? <AddressEditor id={null} initial={EMPTY} onDone={() => setEditing(null)} />
        : <button type="button" className="btn btn-ghost btn-block" style={{ borderStyle: "dashed" }} onClick={() => setEditing("new")}><Icon name="plus" size={18} />Add address</button>}
    </div>
  );
}

function AddressEditor({ id, initial, onDone }: { id: number | null; initial: AddressPayload; onDone: () => void }) {
  const [v, setV] = useState<AddressPayload>(initial);
  const save = useAction(saveAddress);
  const err = save.error?.fields ?? {};
  const bind = (k: keyof AddressPayload, label: string) => (
    <div className="field">
      <label className="field-label" htmlFor={`ad-${k}`}>{label}</label>
      <input id={`ad-${k}`} className={err[k] ? "input err" : "input"} value={String(v[k] ?? "")} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
      <FieldMessage id={`ad-${k}-msg`} error={err[k]} />
    </div>
  );
  const center = v.lat && v.lng ? { lat: v.lat, lng: v.lng } : { lat: MAP.defaultCenter[0], lng: MAP.defaultCenter[1] };
  return (
    <form className="form panel" onSubmit={async (e) => { e.preventDefault(); const r = await save.run(id, v); if (r.ok) onDone(); }}>
      <FormError message={save.error && !Object.keys(err).length ? save.error.message : undefined} />
      {bind("label", "Name for this address (e.g. Home, Shop)")}
      {bind("line1", "House, building and street")}
      <div className="row2">{bind("area", "Area")}{bind("pin", "PIN code")}</div>
      <div className="row2">{bind("city", "City")}{bind("district", "District")}</div>
      {bind("state", "State")}
      <AppMap className="addr-map" style={{ height: 160 }} label="Drag the pin to your gate" fit={false} center={[center.lat, center.lng]} zoom={v.lat ? 16 : 12}
        pin={{ lat: center.lat, lng: center.lng, onMove: (lat, lng) => setV((x) => ({ ...x, lat, lng })) }} />
      <span className="hint" style={{ fontSize: 12.5, color: "var(--muted)" }}>Drag the pin to your gate.</span>
      <div className="decide">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={save.pending}>Save address</button>
      </div>
    </form>
  );
}
