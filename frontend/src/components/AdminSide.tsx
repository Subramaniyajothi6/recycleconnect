"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Admin sidebar. On wide screens it is the fixed left column; at 900px and below it becomes a top bar
 * whose ☰ button slides the links down over the page. Picking a link, ✕ or Esc closes it.
 */
export function AdminSide({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <aside className="side" data-open={open || undefined}>
      <div className="side-top">
        {brand}
        <button type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="admin-menu"
          aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          <Icon name={open ? "x" : "menu"} size={20} />
        </button>
      </div>
      <div className="side-body" id="admin-menu" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
        {children}
      </div>
    </aside>
  );
}
