"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Tab = { href: string; label: string; icon: IconName; main?: boolean };

const CUSTOMER: Tab[] = [
  { href: "/customer", label: "Home", icon: "home" },
  { href: "/customer/new", label: "New", icon: "plus", main: true },
  { href: "/customer/requests", label: "Requests", icon: "list" },
  { href: "/customer/history", label: "History", icon: "clock" },
  { href: "/customer/profile", label: "Profile", icon: "user" },
];

const COLLECTOR: Tab[] = [
  { href: "/collector", label: "Today", icon: "route" },
  { href: "/collector/assigned", label: "Assigned", icon: "list" },
  { href: "/collector/history", label: "History", icon: "clock" },
  { href: "/collector/profile", label: "Profile", icon: "user" },
];

/** Bottom navigation for the phone screens. The home tab is current only on its exact path. */
export function TabBar({ role }: { role: "customer" | "collector" }) {
  const path = usePathname();
  // Screens with their own sticky action bar hide the tab bar (as in the design).
  if (path.startsWith("/customer/new") || path.startsWith("/collector/pickups/")) return null;
  const tabs = role === "customer" ? CUSTOMER : COLLECTOR;
  const home = tabs[0].href;
  return (
    <nav className={tabs.length === 4 ? "tabbar four" : "tabbar"} aria-label="Main">
      {tabs.map((t) => {
        const current = t.href === home ? path === home : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={t.main ? "new" : undefined} aria-current={current ? "page" : undefined}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
