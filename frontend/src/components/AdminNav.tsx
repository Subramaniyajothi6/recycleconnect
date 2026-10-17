"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/customers", label: "Customers", icon: "users" },
  { href: "/admin/collectors", label: "Collectors", icon: "truck" },
  { href: "/admin/requests", label: "Collection requests", icon: "list" },
  { href: "/admin/categories", label: "Waste categories", icon: "tag" },
  { href: "/admin/scheduling", label: "Scheduling", icon: "cal" },
  { href: "/admin/complaints", label: "Complaints", icon: "message" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  { href: "/admin/reports", label: "Reports", icon: "file" },
  { href: "/admin/audit", label: "Audit logs", icon: "shield" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <>
      {LINKS.map((l) => {
        const current = l.href === "/admin" ? path === "/admin" : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            <Icon name={l.icon} size={18} />
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
