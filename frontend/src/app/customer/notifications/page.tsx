import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { Inbox } from "@/components/Inbox";
import { Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import type { Inbox as InboxData } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <div className="app-top">
        <Link href="/customer" className="icon-btn" aria-label="Back"><Icon name="back" /></Link>
        <h1 className="title">Notifications</h1>
      </div>
      <Suspense fallback={<div className="pad"><Skeleton h={240} /></div>}>
        <List />
      </Suspense>
      <p className="empty-hint" style={{ margin: "14px 20px 20px" }}>Notifications are shown in the app and sent by email when email is turned on.</p>
    </>
  );
}

async function List() {
  await requireRole("CUSTOMER");
  const inbox = await api<InboxData>("/api/notifications?limit=100");
  return <Inbox items={inbox.items} unread={inbox.unread} />;
}
