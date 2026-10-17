// Small presentational pieces from the approved design. Server-safe (no hooks).
import type { ReactNode } from "react";
import type { Item } from "@/lib/types";
import { REQUEST_STATUS, day, qty, slot, when, type Tone } from "@/lib/format";
import { Icon } from "./Icon";

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/** Quantity to show for an item: what was collected if known, else the estimate. */
function shown(i: Item, actual: boolean) {
  return Number((actual && i.actual !== null ? i.actual : i.estimated) ?? 0);
}

export function ItemStrip({ items, actual = false, thick = false }: { items: Item[]; actual?: boolean; thick?: boolean }) {
  return (
    <div className={thick ? "strip thick" : "strip"} aria-hidden="true">
      {items.filter((i) => shown(i, actual) > 0).map((i) => (
        <i key={i.categoryId} style={{ flex: shown(i, actual), background: `var(--c-${i.code}, ${i.color})` }} title={i.name} />
      ))}
    </div>
  );
}

export function ItemLegend({ items, actual = false }: { items: Item[]; actual?: boolean }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.categoryId}>
          <b className="sw" style={{ background: `var(--c-${i.code}, ${i.color})` }} />
          {i.name} {qty(shown(i, actual), actual && i.actualUnit ? i.actualUnit : i.unit)}
        </span>
      ))}
    </div>
  );
}

/** A simple coloured bar for {code, value} pairs (dashboard, history). */
export function ValueStrip({ parts, thick = false }: { parts: { code: string; color: string; value: number; label: string }[]; thick?: boolean }) {
  return (
    <div className={thick ? "strip thick" : "strip"} aria-hidden="true">
      {parts.filter((p) => p.value > 0).map((p) => <i key={p.code} style={{ flex: p.value, background: `var(--c-${p.code}, ${p.color})` }} title={p.label} />)}
    </div>
  );
}

/** "2026-10-08 16:00-18:00" from the API → "Thu 8 Oct, 16:00 – 18:00". */
function friendly(detail: string | null) {
  const m = detail?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}-\d{2}:\d{2})$/);
  return m ? `${day(m[1])}, ${slot(m[2])}` : detail;
}

export function Timeline({ steps }: { steps: { key: string; label: string; done: boolean; current: boolean; at: string | null; detail: string | null }[] }) {
  return (
    <ol className="tl">
      {steps.map((t) => (
        <li key={t.key} className={(t.done ? "done" : "") + (t.current ? " cur" : "")}>
          <span className="dot">{t.done && <Icon name="check" size={10} />}</span>
          {t.label}
          {(t.at || t.detail) && <small>{[friendly(t.detail), t.at ? when(t.at) : null].filter(Boolean).join(" — ")}</small>}
        </li>
      ))}
    </ol>
  );
}

export function Empty({ icon = "leaf", title, children }: { icon?: Parameters<typeof Icon>[0]["name"]; title: string; children?: ReactNode }) {
  return (
    <div className="list">
      <div className="li">
        <span className="ico"><Icon name={icon} size={18} /></span>
        <div className="t">{title}{children && <small>{children}</small>}</div>
      </div>
    </div>
  );
}

export function Note({ tone = "info", icon = "info", children, style }: { tone?: "info" | "warn" | "ok" | "bad"; icon?: Parameters<typeof Icon>[0]["name"]; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`note ${tone}`} style={style}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
}

export function Skeleton({ h = 120, style }: { h?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, ...style }} />;
}
