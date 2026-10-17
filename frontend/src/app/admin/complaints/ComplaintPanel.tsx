"use client";

import Link from "next/link";
import { useState } from "react";
import { noteComplaint, resolveComplaint, reviewComplaint } from "@/actions/admin";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { PanelClose } from "@/components/PanelClose";
import { useAction } from "@/components/form/useAction";
import { Pill } from "@/components/ui";
import type { ComplaintDetail } from "@/lib/admin-types";
import { qty, when } from "@/lib/format";

const RESOLUTIONS: [string, string][] = [
  ["EXPLAINED", "Explain what happened (no change)"],
  ["QUANTITY_CORRECTED", "Correct the recorded quantity"],
  ["COLLECTOR_STATEMENT", "Ask the collector for a statement"],
  ["OTHER", "Other"],
];

export function ComplaintPanel({ d, closeHref }: { d: ComplaintDetail; closeHref: string }) {
  const c = d.complaint;
  const review = useAction(reviewComplaint);
  const note = useAction(noteComplaint);
  const resolve = useAction(resolveComplaint);
  const [resolution, setResolution] = useState("EXPLAINED");
  const [reply, setReply] = useState("");
  const [memo, setMemo] = useState(d.note ?? "");
  const [fix, setFix] = useState<Record<number, string>>(() => Object.fromEntries(d.items.map((i) => [i.categoryId, String(i.actual ?? "")])));
  const err = resolve.error?.fields ?? {};
  const done = c.status === "RESOLVED";

  return (
    <aside className="review" aria-label="Complaint detail">
      <div className="rh">
        <div className="r1"><h2>{c.code}</h2><span className="r1-end"><Pill tone={done ? "done" : c.status === "IN_REVIEW" ? "info" : "warn"}>{done ? "Resolved" : c.status === "IN_REVIEW" ? "In review" : "Open"}</Pill><PanelClose href={closeHref} /></span></div>
        <small>{c.typeLabel}, raised {when(c.createdAt)}</small>
      </div>
      <div className="rs">
        <h3>Customer says</h3>
        <div className="msgbox"><small>{c.customer}{c.requestCode ? `, about ${c.requestCode}` : ""}</small>{c.description}</div>
        {c.requestId && <Link className="lnk" href={`/admin/requests?open=${c.requestId}`}>Open the request</Link>}
      </div>
      {d.items.length > 0 && (
        <div className="rs">
          <h3>What was recorded</h3>
          <table className="items-t">
            <thead><tr><th>Material</th><th>Estimate</th><th>Recorded</th></tr></thead>
            <tbody>{d.items.map((i) => (
              <tr key={i.categoryId}><td><b className="sw" style={{ background: `var(--c-${i.code}, ${i.color})` }} />{i.name}</td>
                <td>{i.estimated !== null ? qty(i.estimated, i.unit) : "—"}</td><td>{i.actual !== null ? qty(i.actual, i.actualUnit ?? i.unit) : "—"}</td></tr>
            ))}</tbody>
          </table>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {d.collector ? `Collected by ${d.collector}${d.collectedAt ? `, ${when(d.collectedAt)}` : ""}. ` : ""}
            {d.evidencePhotos ? `${d.evidencePhotos} collector photo${d.evidencePhotos === 1 ? "" : "s"} attached. ` : "No collector photo. "}
            {d.customerConfirmed ? "The customer confirmed the collection." : ""}
          </p>
        </div>
      )}
      {done ? (
        <div className="rs"><h3>Reply sent</h3><div className="reply">{c.reply}</div></div>
      ) : (
        <form className="rs" onSubmit={(e) => {
          e.preventDefault();
          const corrections = resolution === "QUANTITY_CORRECTED" ? d.items.filter((i) => fix[i.categoryId] !== "").map((i) => ({ categoryId: i.categoryId, qty: Number(fix[i.categoryId]) })) : [];
          resolve.run(c.id, resolution, reply, corrections);
        }}>
          <h3>Resolution</h3>
          {c.status === "OPEN" && <button type="button" className="btn btn-ghost btn-block" style={{ marginBottom: 10 }} onClick={() => review.run(c.id)} disabled={review.pending}>Take it (tell the customer it’s in review)</button>}
          <div className="radio-list">
            {RESOLUTIONS.map(([v, l]) => <label key={v}><input type="radio" name="res" checked={resolution === v} onChange={() => setResolution(v)} />{l}</label>)}
          </div>
          {resolution === "QUANTITY_CORRECTED" && (
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              {d.items.map((i) => (
                <label key={i.categoryId} style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8, alignItems: "center", fontSize: 14 }}>{i.name} ({i.actualUnit === "PCS" ? "pcs" : "kg"})
                  <input className="input" style={{ height: 36 }} type="number" step="0.1" min="0" value={fix[i.categoryId]} onChange={(e) => setFix({ ...fix, [i.categoryId]: e.target.value })} />
                </label>
              ))}
              <FieldMessage id="fix-msg" error={err.corrections} />
            </div>
          )}
          <label className="field-label" style={{ marginTop: 12 }} htmlFor="cmp-reply">Reply to the customer</label>
          <textarea id="cmp-reply" className="input" style={{ height: 86 }} value={reply} maxLength={2000} onChange={(e) => setReply(e.target.value)} />
          <FieldMessage id="reply-msg" error={err.reply} />
          <FormError message={resolve.error && !Object.keys(err).length ? resolve.error.message : undefined} />
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={resolve.pending}>Send and resolve</button>
        </form>
      )}
      <div className="rs">
        <h3>Internal note (not shown to the customer)</h3>
        <textarea className="input" style={{ height: 60 }} value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="Internal note" />
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} disabled={note.pending || !memo.trim()} onClick={() => note.run(c.id, memo)}>Save note</button>
      </div>
      <div className="rs" style={{ borderBottom: 0 }}>
        <h3>Activity</h3>
        <ul className="log">{d.activity.map((a, i) => <li key={i}><span>{when(a.at)}</span>{a.text}</li>)}</ul>
      </div>
    </aside>
  );
}
