"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";

/** ✕ button for the admin side panels; Esc also closes, unless a dialog is open or the user is typing. */
export function PanelClose({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      router.replace(href, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [href, router]);
  return (
    <Link href={href} scroll={false} className="icon-btn panel-x" aria-label="Close panel" title="Close (Esc)">
      <Icon name="x" size={16} />
    </Link>
  );
}
