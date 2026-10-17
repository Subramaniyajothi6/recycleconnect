"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * A button that asks before doing something hard to undo (brief §27: confirmation dialogs).
 * Uses the native <dialog> element: keyboard and screen-reader friendly, no browser alert().
 * With {@code reasonLabel} the dialog asks for a reason, which is passed to onConfirm.
 */
export function ConfirmButton({
  children, className = "btn btn-ghost", title, body, confirmLabel, danger, reasonLabel, reasonRequired = true,
  onConfirm, disabled,
}: {
  children: ReactNode; className?: string; title: string; body?: ReactNode; confirmLabel: string; danger?: boolean;
  reasonLabel?: string; reasonRequired?: boolean; onConfirm: (reason: string) => Promise<unknown> | void; disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = !!reasonLabel && reasonRequired && reason.trim() === "";
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog ref={ref} className="confirm-dialog" onClose={() => setReason("")} aria-labelledby={`${title}-h`}>
        <form method="dialog" className="form" onSubmit={async (e) => {
          e.preventDefault();
          if (blocked) return;
          setBusy(true);
          try {
            await onConfirm(reason.trim());
          } finally {
            setBusy(false);
            ref.current?.close();
          }
        }}>
          <h2 id={`${title}-h`} style={{ fontSize: 19 }}>{title}</h2>
          {body && <div className="muted" style={{ fontSize: 14 }}>{body}</div>}
          {reasonLabel && (
            <div className="field">
              <label className="field-label" htmlFor={`${title}-r`}>{reasonLabel}</label>
              <textarea id={`${title}-r`} className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </div>
          )}
          <div className="decide">
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Go back</button>
            <button type="submit" className={danger ? "btn btn-danger-solid" : "btn btn-primary"} disabled={busy || blocked}>
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
