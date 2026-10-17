"use client";

import { useState } from "react";
import { raiseComplaint } from "@/actions/customer";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { ItemLegend, ItemStrip, Note } from "@/components/ui";
import { COMPLAINT_TYPES, day } from "@/lib/format";
import type { RequestCard } from "@/lib/types";

export function ComplaintForm({ requests, preselected }: { requests: RequestCard[]; preselected: number | null }) {
  const [requestId, setRequestId] = useState<number | null>(preselected);
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const send = useAction(raiseComplaint);
  const err = send.error?.fields ?? {};

  if (send.result?.ok) {
    return <div style={{ margin: "6px 20px 0" }}><Note tone="ok" icon="check">Thanks. We’ve sent your complaint to the team. They reply within 2 working days.</Note></div>;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); send.run(requestId, type, text); }}>
      <div className="step" style={{ marginTop: 6 }}>
        <div className="step-h"><span className="n">1</span><h2>Which pickup?</h2></div>
        <div className="cmp-pick">
          {requests.map((r) => (
            <label key={r.id} className="cmp-req">
              <input type="radio" name="cmpreq" checked={requestId === r.id} onChange={() => setRequestId(r.id)} />
              <span>
                <b>{r.code}</b>
                <small>{r.date ? day(r.date) : ""}{r.collectorName ? `, ${r.collectorName}` : ""}</small>
                <ItemStrip items={r.items} actual={r.status === "COMPLETED" || r.status === "COLLECTED"} />
                <ItemLegend items={r.items} actual={r.status === "COMPLETED" || r.status === "COLLECTED"} />
              </span>
            </label>
          ))}
          <label className="cmp-req">
            <input type="radio" name="cmpreq" checked={requestId === null} onChange={() => setRequestId(null)} />
            <span><b>Something else</b><small>Not about a particular pickup</small></span>
          </label>
        </div>
        <FieldMessage id="cmp-req-msg" error={err.requestId} />
      </div>
      <div className="step">
        <div className="step-h"><span className="n">2</span><h2 id="cmp-type-l">What went wrong?</h2></div>
        <div className="opts" role="group" aria-labelledby="cmp-type-l">
          {COMPLAINT_TYPES.map((t) => (
            <button key={t.value} type="button" className="opt" aria-pressed={type === t.value} onClick={() => setType(t.value)}>{t.label}</button>
          ))}
        </div>
        <FieldMessage id="cmp-type-msg" error={err.type} />
      </div>
      <div className="step">
        <div className="step-h"><span className="n">3</span><h2>Tell us more</h2></div>
        <textarea className="input" aria-label="Describe the issue" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)}
          placeholder="What happened? Include anything that helps us check it." />
        <FieldMessage id="cmp-desc-msg" error={err.description} />
        <FormError message={send.error && !Object.keys(err).length ? send.error.message : undefined} />
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={send.pending}>
          {send.pending ? "Sending…" : "Send complaint"}
        </button>
        <p className="muted" style={{ fontSize: 12.5, textAlign: "center", marginTop: 8 }}>The admin team replies within 2 working days.</p>
      </div>
    </form>
  );
}
