"use client";

import { setUserStatus } from "@/actions/admin";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { useAction } from "@/components/form/useAction";

/** Deactivate, block or restore an account. Turning one off signs it out everywhere. */
export function StatusActions({ id, status, name }: { id: number; status: string; name: string }) {
  const act = useAction(setUserStatus);
  return (
    <>
      {status === "ACTIVE" ? (
        <>
          <ConfirmButton className="lnk bad" title={`Deactivate ${name}?`} confirmLabel="Deactivate" danger reasonLabel="Reason (kept in the audit log)"
            body="They’re signed out and can’t sign in until you reactivate them." onConfirm={(r) => act.run(id, "INACTIVE", r)}>Deactivate</ConfirmButton>
          <ConfirmButton className="lnk bad" title={`Block ${name}?`} confirmLabel="Block" danger reasonLabel="Reason (kept in the audit log)"
            body="Use for misuse. They’re signed out at once." onConfirm={(r) => act.run(id, "BLOCKED", r)}>Block</ConfirmButton>
        </>
      ) : (
        <ConfirmButton className="lnk" title={`Reactivate ${name}?`} confirmLabel="Reactivate" reasonLabel="Reason (optional)" reasonRequired={false}
          onConfirm={(r) => act.run(id, "ACTIVE", r)}>{status === "BLOCKED" ? "Unblock" : "Reactivate"}</ConfirmButton>
      )}
      {act.error && <span className="err-text">{act.error.message}</span>}
    </>
  );
}
