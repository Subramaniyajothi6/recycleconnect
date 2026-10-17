"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { registerCollector } from "@/actions/auth";
import { ChoiceGroup, MultiChoiceGroup } from "@/components/form/Choices";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { PasswordInput } from "@/components/form/PasswordInput";
import { Icon } from "@/components/Icon";
import type { Day, VehicleType, Zone } from "@/lib/types";

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: "CARGO_TRICYCLE", label: "Cargo tricycle" },
  { value: "THREE_WHEELER", label: "Three-wheeler" },
  { value: "MINI_TRUCK", label: "Mini truck" },
];

const DAYS: { value: Day; label: string }[] = [
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
];

type Key = "name" | "mobile" | "email" | "vehicleNumber" | "password";

export function CollectorForm({ zones }: { zones: Zone[] }) {
  const [state, action, pending] = useActionState(registerCollector, undefined);
  const [vehicle, setVehicle] = useState<VehicleType | "">("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [days, setDays] = useState<Day[]>(DAYS.map((d) => d.value));
  const [agree, setAgree] = useState(false);
  const [proofName, setProofName] = useState<string | null>(null);
  const [v, setV] = useState<Record<Key, string>>({ name: "", mobile: "", email: "", vehicleNumber: "", password: "" });
  const err = state?.fields ?? {};

  const bind = (key: Key) => ({
    id: `rk-${key}`,
    name: key,
    value: v[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setV({ ...v, [key]: e.target.value }),
    className: err[key] ? "input err" : "input",
    "aria-invalid": err[key] ? true : undefined,
    "aria-describedby": `rk-${key}-msg`,
  });

  return (
    <form action={action} className="form" noValidate>
      <FormError message={state?.message} />

      <div className="form-sec">
        <h2>Your details</h2>
        <div className="field">
          <label className="field-label" htmlFor="rk-name">Full name</label>
          <input {...bind("name")} autoComplete="name" />
          <FieldMessage id="rk-name-msg" error={err.name} />
        </div>
        <div className="row2">
          <div className="field">
            <label className="field-label" htmlFor="rk-mobile">Mobile</label>
            <input {...bind("mobile")} inputMode="tel" autoComplete="tel" placeholder="99401 55821" />
            <FieldMessage id="rk-mobile-msg" error={err.mobile} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rk-email">Email (optional)</label>
            <input {...bind("email")} inputMode="email" autoComplete="email" placeholder="name@example.com" />
            <FieldMessage id="rk-email-msg" error={err.email} />
          </div>
        </div>
      </div>

      <div className="form-sec">
        <h2>Vehicle</h2>
        <div className="field">
          <span className="field-label" id="rk-veh-l">Vehicle type</span>
          <ChoiceGroup name="vehicleType" options={VEHICLES} value={vehicle} onChange={setVehicle} labelledBy="rk-veh-l" />
          <FieldMessage id="rk-veh-msg" error={err.vehicleType} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rk-vehicleNumber">Registration number</label>
          <input {...bind("vehicleNumber")} placeholder="TN 22 AQ 7310" autoCapitalize="characters" />
          <FieldMessage id="rk-vehicleNumber-msg" error={err.vehicleNumber} />
        </div>
      </div>

      <div className="form-sec">
        <h2>Where and when you can work</h2>
        <div className="field">
          <span className="field-label" id="rk-zones-l">Areas (pick one or more)</span>
          <MultiChoiceGroup name="zoneIds" labelledBy="rk-zones-l" values={zoneIds} onChange={setZoneIds}
            options={zones.map((z) => ({ value: String(z.id), label: z.name }))} />
          <FieldMessage id="rk-zones-msg" error={err.zoneIds} />
        </div>
        <div className="field">
          <span className="field-label" id="rk-days-l">Working days</span>
          <MultiChoiceGroup name="workingDays" labelledBy="rk-days-l" values={days} onChange={setDays}
            options={DAYS} className="daychips" buttonClass="" />
          <FieldMessage id="rk-days-msg" error={err.workingDays} hint="Pickups run Monday to Saturday, 08:00 – 18:00." />
        </div>
      </div>

      <div className="form-sec">
        <h2>ID proof</h2>
        <label className="upload" style={{ cursor: "pointer" }}>
          <span className="ico"><Icon name="file" size={20} /></span>
          <span>
            <b title={proofName ?? undefined}>{proofName ??"Upload driving licence or a government photo ID"}</b>
            <small>Photo or PDF, up to 5 MB. Only admins can see it.</small>
          </span>
          <input type="file" name="idProof" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
            onChange={(e) => setProofName(e.target.files?.[0]?.name ?? null)} />
        </label>
      </div>

      <div className="form-sec">
        <h2>Password</h2>
        <div className="field">
          <label className="field-label" htmlFor="rk-password">Create a password</label>
          <PasswordInput {...bind("password")} autoComplete="new-password" />
          <FieldMessage id="rk-password-msg" error={err.password} hint="At least 8 characters" />
        </div>
        <label className="check">
          <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            aria-describedby="rk-agree-msg" />
          <span>I agree to the collector terms, including recording actual quantities honestly.</span>
        </label>
        <FieldMessage id="rk-agree-msg" error={err.agree} />
      </div>

      <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={pending}>
        {pending ? "Sending…" : "Send for approval"}
      </button>
    </form>
  );
}
