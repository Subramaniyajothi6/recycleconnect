"use client";

import Link from "next/link";
import { useState } from "react";
import { addNotAccepted, removeNotAccepted, saveCategory, type CategoryPayload } from "@/actions/admin";
import { FieldMessage, FormError } from "@/components/form/FieldMessage";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/ui";
import type { CategoryRow } from "@/lib/admin-types";

const COLOURS = ["#2F6FDE", "#D9A21B", "#A0683A", "#6B7A86", "#159C8F", "#7A4FD0", "#D9452B", "#D6559A", "#8A8F5A", "#1E7A55"];

export function CategoryEditor({ rows, notAccepted, selected }: { rows: CategoryRow[]; notAccepted: { id: number; text: string }[]; selected: number | "new" }) {
  const current = selected === "new" ? null : rows.find((r) => r.id === selected) ?? null;
  const toggle = useAction(saveCategory);
  return (
    <div className="two wide-right">
      <div className="tcard">
        <table className="tbl cattbl">
          <thead><tr><th>Category</th><th>Unit</th><th className="num">Requests, 30 days</th><th>Shown to customers</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={(c.active ? "" : "off") + (c.id === selected ? " sel" : "")}>
                <td><div className="catname">
                  <span className="bin-ic" style={{ ["--c" as string]: c.color }}>{c.name.slice(0, 2).toUpperCase()}</span>
                  <span><b>{c.name}</b><small>{c.accepts ?? "—"}</small></span>
                </div></td>
                <td>{c.unit === "PCS" ? "pcs" : "kg"}</td>
                <td className="num">{c.requests30Days}</td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={c.active} aria-label={`Show ${c.name} to customers`} disabled={toggle.pending}
                      onChange={(e) => toggle.run(c.id, { ...payloadOf(c), active: e.target.checked })} />
                    <span />
                  </label>
                </td>
                <td><div className="rowact"><Link className="lnk" href={`/admin/categories?edit=${c.id}`}>Edit</Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager"><Link className="btn btn-primary btn-sm" href="/admin/categories?edit=new" style={{ color: "#fff" }}><Icon name="plus" size={16} />Add category</Link><span /></div>
        {toggle.error && <p className="err-text" style={{ padding: 10 }}>{toggle.error.message}</p>}
      </div>
      <aside className="review" aria-label="Edit category">
        <Form key={String(selected)} row={current} />
        <NotAccepted items={notAccepted} />
      </aside>
    </div>
  );
}

function payloadOf(c: CategoryRow): CategoryPayload {
  return { name: c.name, unit: c.unit, accepts: c.accepts ?? "", warning: c.warning ?? "", color: c.color, active: c.active, sortOrder: c.sortOrder };
}

function Form({ row }: { row: CategoryRow | null }) {
  const [v, setV] = useState<CategoryPayload>(row ? payloadOf(row) : { code: "", name: "", unit: "KG", accepts: "", warning: "", color: COLOURS[0], active: true, sortOrder: 50 });
  const save = useAction(saveCategory);
  const err = save.error?.fields ?? {};
  return (
    <>
      <div className="rh">
        <div className="r1"><h2>{row ? `Edit: ${row.name}` : "New category"}</h2>{row && <Pill tone={row.active ? "done" : "muted"}>{row.active ? "Active" : "Hidden"}</Pill>}</div>
        <small>Changes apply to new requests only</small>
      </div>
      <form className="rs form" onSubmit={(e) => { e.preventDefault(); save.run(row?.id ?? null, v); }}>
        <FormError message={save.error && !Object.keys(err).length ? save.error.message : undefined} />
        {save.result?.ok && <p className="hint ok" style={{ color: "var(--leaf-text)" }}>Saved.</p>}
        {!row && (
          <div className="field"><label className="field-label" htmlFor="ce-code">Short code</label>
            <input id="ce-code" className="input" style={{ height: 40 }} value={v.code} placeholder="e.g. tetrapak" onChange={(e) => setV({ ...v, code: e.target.value.toLowerCase() })} />
            <FieldMessage id="ce-code-msg" error={err.code} hint="Lower-case letters. Can’t be changed later." /></div>
        )}
        <div className="field"><label className="field-label" htmlFor="ce-name">Name</label>
          <input id="ce-name" className="input" style={{ height: 40 }} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <FieldMessage id="ce-name-msg" error={err.name} /></div>
        <div className="row2">
          <div className="field"><label className="field-label" htmlFor="ce-unit">Unit</label>
            <select id="ce-unit" className="input" style={{ height: 40 }} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })}><option value="KG">kg</option><option value="PCS">pcs</option></select></div>
          <div className="field"><span className="field-label" id="ce-col-l">Colour</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }} role="group" aria-labelledby="ce-col-l">
              {COLOURS.map((c) => (
                <button key={c} type="button" aria-label={c} aria-pressed={v.color.toUpperCase() === c} onClick={() => setV({ ...v, color: c })}
                  style={{ width: 24, height: 24, borderRadius: 8, border: 0, background: c, boxShadow: v.color.toUpperCase() === c ? "0 0 0 2px #fff, 0 0 0 4px var(--ink)" : "none" }} />
              ))}
            </div></div>
        </div>
        <div className="field"><label className="field-label" htmlFor="ce-acc">What we accept</label>
          <input id="ce-acc" className="input" style={{ height: 40 }} value={v.accepts} onChange={(e) => setV({ ...v, accepts: e.target.value })} /></div>
        <div className="field"><label className="field-label" htmlFor="ce-warn">Warning shown before submit</label>
          <textarea id="ce-warn" className="input" style={{ height: 76 }} value={v.warning} onChange={(e) => setV({ ...v, warning: e.target.value })} />
          <span className="hint">Keep it to what the customer should do. Don’t add handling instructions beyond pickup.</span></div>
        <div className="row2">
          <div className="field"><label className="field-label" htmlFor="ce-order">Order in the list</label>
            <input id="ce-order" type="number" className="input" style={{ height: 40 }} value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} /></div>
          <div className="set-row" style={{ alignSelf: "end" }}><span>Show to customers</span>
            <label className="switch"><input type="checkbox" checked={v.active} aria-label="Show to customers" onChange={(e) => setV({ ...v, active: e.target.checked })} /><span /></label></div>
        </div>
        <button type="submit" className="btn btn-primary btn-block" style={{ height: 44 }} disabled={save.pending}>Save category</button>
      </form>
    </>
  );
}

function NotAccepted({ items }: { items: { id: number; text: string }[] }) {
  const [text, setText] = useState("");
  const add = useAction(addNotAccepted);
  const remove = useAction(removeNotAccepted);
  return (
    <div className="rs" style={{ borderBottom: 0 }}>
      <h3>Not accepted (shown on every booking)</h3>
      <div className="chiplist">
        {items.map((x) => (
          <span key={x.id} className="rchip">{x.text}
            <button type="button" aria-label={`Remove ${x.text}`} onClick={() => remove.run(x.id)}><Icon name="x" size={12} /></button>
          </span>
        ))}
      </div>
      <form className="addrow" onSubmit={async (e) => { e.preventDefault(); const r = await add.run(text); if (r.ok) setText(""); }}>
        <input className="input" placeholder="Add an item that can’t be collected" aria-label="New item that can’t be collected" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
        <button className="btn btn-ghost btn-sm" type="submit" disabled={!text.trim() || add.pending}>Add</button>
      </form>
      <FieldMessage id="na-msg" error={add.error?.fields.text ?? add.error?.message} />
    </div>
  );
}
