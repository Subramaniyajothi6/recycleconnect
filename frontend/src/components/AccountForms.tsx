"use client";

import { useState } from "react";
import { changePassword, savePreferences } from "@/actions/account";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { PasswordInput } from "@/components/form/PasswordInput";
import { useAction } from "@/components/form/useAction";
import { Icon } from "./Icon";
import { Note } from "./ui";

function Toggle({ id, on, label, disabled, onChange }: { id: string; on: boolean; label: string; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="switch">
      <input type="checkbox" id={id} checked={on} disabled={disabled} aria-label={label} onChange={(e) => onChange?.(e.target.checked)} />
      <span />
    </label>
  );
}

/** Notification preferences: in-app is always on; email and the evening reminder are the user's choice. */
export function Preferences({ email, reminder, language, showReminder = true }: { email: boolean; reminder: boolean; language: string; showReminder?: boolean }) {
  const save = useAction(savePreferences);
  const [e, setE] = useState(email);
  const [r, setR] = useState(reminder);
  const update = (ne: boolean, nr: boolean) => { setE(ne); setR(nr); save.run(ne, nr, language); };
  return (
    <div className="kvlist">
      <div className="kvrow"><Icon name="bell" size={18} /><span>In the app<small>Always on</small></span><Toggle id="pf-app" on label="In-app notifications" disabled /></div>
      <div className="kvrow"><Icon name="message" size={18} /><span>Email<small>Pickup updates and complaint replies</small></span><Toggle id="pf-mail" on={e} label="Email notifications" onChange={(v) => update(v, r)} /></div>
      {showReminder && <div className="kvrow"><Icon name="clock" size={18} /><span>Pickup reminder<small>Before each pickup</small></span><Toggle id="pf-rem" on={r} label="Pickup reminder" onChange={(v) => update(e, v)} /></div>}
      {save.error && <div className="kvrow"><span /><span className="err-text">{save.error.message}</span><span /></div>}
    </div>
  );
}

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const save = useAction(changePassword);
  const err = save.error?.fields ?? {};
  if (!open) {
    return (
      <button type="button" className="kvrow" style={{ width: "100%", border: 0, background: "none", textAlign: "left", font: "inherit" }} onClick={() => setOpen(true)}>
        <Icon name="shield" size={18} /><span>Change password<small>Signs you out on other devices</small></span><Icon name="chev" size={18} className="chev" />
      </button>
    );
  }
  if (save.result?.ok) return <div style={{ padding: 14 }}><Note tone="ok" icon="check">Password changed. Other devices are signed out.</Note></div>;
  return (
    <form className="form" style={{ padding: 14 }} onSubmit={(e) => { e.preventDefault(); save.run(current, next); }}>
      <FormError message={save.error && !Object.keys(err).length ? save.error.message : undefined} />
      <div className="field">
        <label className="field-label" htmlFor="pw-cur">Current password</label>
        <PasswordInput id="pw-cur" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <FieldMessage id="pw-cur-msg" error={err.currentPassword} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="pw-new">New password</label>
        <PasswordInput id="pw-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <FieldMessage id="pw-new-msg" error={err.newPassword} hint="At least 8 characters" />
      </div>
      <div className="decide">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={save.pending}>Change password</button>
      </div>
    </form>
  );
}
