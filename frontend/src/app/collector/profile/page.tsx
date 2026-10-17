import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PasswordForm, Preferences } from "@/components/AccountForms";
import { Icon } from "@/components/Icon";
import { ProfileHead } from "@/components/ProfileHead";
import { SignOutButton } from "@/components/SignOutButton";
import { Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { DAY_SHORT, VEHICLE, mobile, monthLabel, num } from "@/lib/format";
import type { CollectorStats } from "@/lib/types";
import { Availability } from "./Availability";

export const metadata: Metadata = { title: "Profile" };

export default function CollectorProfilePage() {
  return (
    <>
      <div className="app-top"><h1 className="title">Profile</h1></div>
      <Suspense fallback={<div className="pad"><Skeleton h={300} /></div>}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const me = await requireRole("COLLECTOR");
  const c = me.collector!;
  const pending = me.status === "PENDING_APPROVAL";
  const stats = pending ? null : await api<CollectorStats>("/api/collector/stats");
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
  return (
    <>
      <ProfileHead me={me} line={pending ? "Collector, waiting for approval" : `Collector COL-${String(me.id).padStart(3, "0")}`} pill={c.zones.map((z) => z.name).join(", ")} />
      {!pending && <Availability available={c.available} />}
      {stats && (
        <>
          <div className="sec-h"><h2>{monthLabel(month)} so far</h2></div>
          <div className="kstats3" style={{ marginTop: 0 }}>
            <div><b>{stats.completed}</b><span>Completed</span></div>
            <div><b>{stats.failed}</b><span>Failed</span></div>
            <div><b>{num(stats.kg, 0)}</b><span>kg</span></div>
            <div><b>{stats.onTimePercent}%</b><span>On time</span></div>
          </div>
        </>
      )}
      <div className="sec-h"><h2>Work details</h2></div>
      <div className="kvlist">
        <div className="kvrow"><Icon name="truck" size={18} /><span>{c.vehicleNumber}<small>{c.vehicleType ? VEHICLE[c.vehicleType] : ""}</small></span><span /></div>
        <div className="kvrow"><Icon name="pin" size={18} /><span>{c.zones.map((z) => z.name).join(", ")}<small>Areas you cover</small></span><span /></div>
        <div className="kvrow"><Icon name="cal" size={18} /><span>{c.workingDays.map((d) => DAY_SHORT[d]).join(", ")}<small>Working days</small></span><span /></div>
        <div className="kvrow"><Icon name="phone" size={18} /><span>{mobile(me.mobile)}<small>Shown to customers only while a pickup is in progress</small></span><span /></div>
      </div>
      <p className="empty-hint" style={{ textAlign: "left", margin: "8px 20px 0" }}>To change your areas, days or vehicle, ask the office.</p>
      <div className="sec-h"><h2>Notifications</h2></div>
      <Preferences email={me.emailNotifications} reminder={me.reminderEnabled} language={me.preferredLanguage} showReminder={false} />
      <div className="sec-h"><h2>Account</h2></div>
      <div className="kvlist">
        <Link className="kvrow" href="/collector/notifications"><Icon name="bell" size={18} /><span>Notifications<small>Approvals, assignments and changes</small></span><Icon name="chev" size={18} className="chev" /></Link>
        <PasswordForm />
      </div>
      <div className="signout"><SignOutButton /></div>
      <div style={{ height: 20 }} />
    </>
  );
}
