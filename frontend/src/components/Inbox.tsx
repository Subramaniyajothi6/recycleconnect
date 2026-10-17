"use client";

import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/account";
import { useAction } from "@/components/form/useAction";
import { when } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

const ICON: Record<string, IconName> = {
  submitted: "list", accepted: "check", rejected: "x", info: "message", scheduled: "cal", assigned: "truck",
  unassigned: "truck", rescheduled: "refresh", confirmed: "check", started: "truck", collected: "scale",
  completed: "check", failed: "x", cancelled: "x", reminder: "bell", complaint: "message", approved: "check", reassign: "refresh",
};

/** The notification list (brief §22), grouped into today and earlier, shared by every role. */
export function Inbox({ items, unread }: { items: Notification[]; unread: number }) {
  const all = useAction(markAllNotificationsRead);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isToday = (n: Notification) => new Date(n.at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === today;
  const groups: [string, Notification[]][] = [["Today", items.filter(isToday)], ["Earlier", items.filter((n) => !isToday(n))]];
  return (
    <>
      {unread > 0 && (
        <div className="pad" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={all.pending} onClick={() => all.run()}>Mark all read</button>
        </div>
      )}
      {groups.filter(([, list]) => list.length > 0).map(([g, list]) => (
        <section key={g}>
          <div className="notif-group">{g}</div>
          <div className="nlist">
            {list.map((n) => {
              const tone = n.kind === "failed" || n.kind === "cancelled" || n.kind === "rejected" ? " bad" : n.kind === "rescheduled" || n.kind === "info" ? " warn" : "";
              return (
                <Link key={n.id} className={`nitem${n.read ? "" : " unread"}${tone}`} href={n.link ?? "#"}
                  onClick={() => { if (!n.read) markNotificationRead(n.id); }}>
                  <span className="ico"><Icon name={ICON[n.kind] ?? "bell"} size={18} /></span>
                  <span><b>{n.title}{!n.read && <i className="udot" aria-label="unread" />}</b><span>{n.body}</span></span>
                  <time dateTime={n.at}>{isToday(n) ? new Date(n.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : when(n.at)}</time>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {items.length === 0 && <p className="empty-hint" style={{ marginTop: 20 }}>No notifications yet.</p>}
    </>
  );
}
