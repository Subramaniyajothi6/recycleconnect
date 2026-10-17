"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";
import { registerCustomer } from "@/actions/auth";
import { Icon } from "@/components/Icon";
import { ChoiceGroup } from "@/components/form/Choices";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { PasswordInput } from "@/components/form/PasswordInput";
import { AppMap } from "@/components/map/AppMap";
import { MAP } from "@/lib/map/config";
import type { ContactPreference, CustomerType } from "@/lib/types";

const TYPES: { value: CustomerType; label: string }[] = [
  { value: "HOUSEHOLD", label: "Household" },
  { value: "SHOP", label: "Shop" },
  { value: "OFFICE", label: "Office" },
  { value: "INSTITUTION", label: "Institution" },
  { value: "BUSINESS", label: "Business" },
];

const CONTACT: { value: ContactPreference; label: ReactNode }[] = [
  { value: "PHONE", label: <><Icon name="phone" size={16} />Phone call</> },
  { value: "EMAIL", label: <><Icon name="message" size={16} />Email</> },
  { value: "APP", label: <><Icon name="bell" size={16} />App only</> },
];

const STATES = ["Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh"];

type Key = "name" | "mobile" | "email" | "line1" | "area" | "pin" | "city" | "district" | "state" | "password";

export function CustomerForm() {
  const [state, action, pending] = useActionState(registerCustomer, undefined);
  const [type, setType] = useState<CustomerType>("HOUSEHOLD");
  const [contact, setContact] = useState<ContactPreference>("PHONE");
  const [agree, setAgree] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [v, setV] = useState<Record<Key, string>>({
    name: "", mobile: "", email: "", line1: "", area: "", pin: "",
    city: "Chennai", district: "Chennai", state: "Tamil Nadu", password: "",
  });
  const err = state?.fields ?? {};

  // Props for a field. Address errors come back from the API under "address.<key>".
  const bind = (key: Key, apiKey: string = key) => ({
    id: `rc-${key}`,
    name: key,
    value: v[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [key]: e.target.value }),
    className: err[apiKey] ? "input err" : "input",
    "aria-invalid": err[apiKey] ? true : undefined,
    "aria-describedby": `rc-${key}-msg`,
  });

  return (
    <form action={action} className="form" noValidate>
      <FormError message={state?.message} />

      <div className="form-sec">
        <h2>About you</h2>
        <div className="field">
          <label className="field-label" htmlFor="rc-name">Full name or business name</label>
          <input {...bind("name")} autoComplete="name" />
          <FieldMessage id="rc-name-msg" error={err.name} />
        </div>
        <div className="field">
          <span className="field-label" id="rc-type-l">I’m registering as</span>
          <ChoiceGroup name="customerType" options={TYPES} value={type} onChange={setType} labelledBy="rc-type-l" />
        </div>
      </div>

      <div className="form-sec">
        <h2>Contact</h2>
        <div className="field">
          <label className="field-label" htmlFor="rc-mobile">Mobile number</label>
          <input {...bind("mobile")} inputMode="tel" autoComplete="tel" placeholder="98400 12345" />
          <FieldMessage id="rc-mobile-msg" error={err.mobile} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rc-email">Email</label>
          <input {...bind("email")} inputMode="email" autoComplete="email" placeholder="name@example.com" />
          <FieldMessage id="rc-email-msg" error={err.email} />
        </div>
        <div className="field">
          <span className="field-label" id="rc-contact-l">How should we contact you?</span>
          <ChoiceGroup name="preferredContact" options={CONTACT} value={contact} onChange={setContact} labelledBy="rc-contact-l" />
        </div>
      </div>

      <div className="form-sec">
        <h2>Pickup address</h2>
        <div className="field">
          <label className="field-label" htmlFor="rc-line1">House, building and street</label>
          <input {...bind("line1", "address.line1")} autoComplete="address-line1" />
          <FieldMessage id="rc-line1-msg" error={err["address.line1"]} />
        </div>
        <div className="row2">
          <div className="field">
            <label className="field-label" htmlFor="rc-area">Area</label>
            <input {...bind("area", "address.area")} placeholder="Anna Nagar" />
            <FieldMessage id="rc-area-msg" error={err["address.area"]} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rc-pin">PIN code</label>
            <input {...bind("pin", "address.pin")} inputMode="numeric" autoComplete="postal-code" maxLength={6} />
            <FieldMessage id="rc-pin-msg" error={err["address.pin"]} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label className="field-label" htmlFor="rc-city">City</label>
            <input {...bind("city", "address.city")} autoComplete="address-level2" />
            <FieldMessage id="rc-city-msg" error={err["address.city"]} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rc-district">District</label>
            <input {...bind("district", "address.district")} />
            <FieldMessage id="rc-district-msg" error={err["address.district"]} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rc-state">State</label>
          <select {...bind("state", "address.state")}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <FieldMessage id="rc-state-msg" error={err["address.state"]} />
        </div>
        <AppMap className="addr-map" style={{ height: 160 }} label="Map pin for the pickup address" fit={false}
          center={pin ? [pin.lat, pin.lng] : MAP.defaultCenter} zoom={pin ? 16 : 12}
          pin={{ lat: pin?.lat ?? MAP.defaultCenter[0], lng: pin?.lng ?? MAP.defaultCenter[1], onMove: (lat, lng) => setPin({ lat, lng }) }} />
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
        <span className="muted" style={{ fontSize: 12.5 }}>Drag the pin to your gate. You can add more addresses later.</span>
      </div>

      <div className="form-sec">
        <h2>Password</h2>
        <div className="field">
          <label className="field-label" htmlFor="rc-password">Create a password</label>
          <PasswordInput {...bind("password")} autoComplete="new-password" />
          <FieldMessage id="rc-password-msg" error={err.password} hint="At least 8 characters" />
        </div>
        <label className="check">
          <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            aria-describedby="rc-agree-msg" />
          <span>I agree to the terms and privacy policy. My phone number is shown only to the collector assigned to my pickup.</span>
        </label>
        <FieldMessage id="rc-agree-msg" error={err.agree} />
      </div>

      <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
        Already have an account? <Link href="/login" style={{ color: "var(--leaf-text)", fontWeight: 600 }}>Sign in</Link>
      </p>
    </form>
  );
}
