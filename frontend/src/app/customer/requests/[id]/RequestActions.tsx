"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelRequest, confirmCollection } from "@/actions/customer";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { num, when } from "@/lib/format";

export function ConfirmCollection({ id, collector, actualKg, estimatedKg }: { id: number; collector: string; actualKg: number; estimatedKg: number }) {
  const [feedback, setFeedback] = useState("");
  const confirm = useAction(confirmCollection);
  return (
    <section className="confirm" aria-labelledby="confirm-h">
      <h3 id="confirm-h">Did we collect everything?</h3>
      <p>{collector} recorded {num(actualKg)} kg. You estimated {num(estimatedKg)} kg. Check the items below, then confirm.</p>
      <FormError message={confirm.error?.message} />
      <div className="btns">
        <button type="button" className="btn btn-primary btn-block" disabled={confirm.pending} onClick={() => confirm.run(id, feedback)}>
          {confirm.pending ? "Confirming…" : "Confirm collection"}
        </button>
        <Link className="btn btn-ghost btn-block" href={`/customer/complaints?request=${id}`}>Report an issue</Link>
      </div>
      <textarea className="input" style={{ marginTop: 10, height: 64 }} placeholder="Feedback for the collector (optional)"
        aria-label="Feedback for the collector" value={feedback} maxLength={1000} onChange={(e) => setFeedback(e.target.value)} />
    </section>
  );
}

export function CancelRequest({ id, until }: { id: number; until: string | null }) {
  const cancel = useAction(cancelRequest);
  return (
    <div className="pad" style={{ marginTop: 22 }}>
      <FormError message={cancel.error?.message} />
      <ConfirmButton className="btn btn-danger btn-block" title="Cancel this request?" danger confirmLabel="Cancel request"
        body="The pickup will be called off. You can book again any time." reasonLabel="Why are you cancelling?"
        onConfirm={(reason) => cancel.run(id, reason)}>
        Cancel request
      </ConfirmButton>
      {until && (
        <p className="muted" style={{ fontSize: 12.5, textAlign: "center", marginTop: 8 }}>
          You can cancel until {when(until.endsWith("Z") ? until : until + "+05:30")}. We’ll ask for a reason.
        </p>
      )}
    </div>
  );
}
