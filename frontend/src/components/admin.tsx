// Shared admin pieces (design a-*). Server-safe.
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function AdminTop({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="topline">
      <div><h1>{title}</h1>{sub && <div className="page-sub">{sub}</div>}</div>
      <span className="sp" />
      {children}
    </div>
  );
}

/** A GET search box: works without JavaScript, keeps the other filters, and updates the page without a full reload (next/form). */
export function SearchForm({ action, q, placeholder, keep = {} }: { action: string; q?: string; placeholder: string; keep?: Record<string, string | undefined> }) {
  return (
    <Form scroll={false} className="search search-joined" role="search" action={action}>
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label>
        <Icon name="search" size={16} />
        {/* key: the box empties when the search is cleared (no full page reload, so it would keep the old text) */}
        <input key={q ?? ""} name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder={placeholder} aria-label={placeholder} maxLength={100} />
        {q && (
          <Link className="clear" scroll={false} href={`${action}?${new URLSearchParams(Object.entries(keep).filter((e): e is [string, string] => !!e[1]))}`}
            aria-label="Clear search" title="Clear search"><Icon name="x" size={12} /></Link>
        )}
      </label>
      <button type="submit" className="go">Search</button>
    </Form>
  );
}

export function Pager({ page, size, total, href }: { page: number; size: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="pager">
      <span>Showing {from}–{to} of {total.toLocaleString("en-IN")}</span>
      <span className="pg">
        <Link href={href(page - 1)} aria-label="Previous page" aria-disabled={page <= 0}>‹</Link>
        <span style={{ padding: "0 8px", alignSelf: "center" }}>Page {page + 1} of {pages}</span>
        <Link href={href(page + 1)} aria-label="Next page" aria-disabled={page + 1 >= pages}>›</Link>
      </span>
    </div>
  );
}

export function Kpi({ label, value, note, alert }: { label: string; value: ReactNode; note?: ReactNode; alert?: boolean }) {
  return <div className={alert ? "kpi alert" : "kpi"}><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>;
}
