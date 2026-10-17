import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PasswordForm, Preferences } from "@/components/AccountForms";
import { Icon } from "@/components/Icon";
import { ProfileHead } from "@/components/ProfileHead";
import { SignOutButton } from "@/components/SignOutButton";
import { Note, Skeleton } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { CUSTOMER_TYPE, day } from "@/lib/format";
import { Addresses, ProfileDetails } from "./ProfileForms";

export const metadata: Metadata = { title: "Profile" };

export default function CustomerProfilePage() {
  return (
    <>
      <div className="app-top"><h1 className="title">Profile</h1></div>
      <Suspense fallback={<div className="pad"><Skeleton h={320} /></div>}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const me = await requireRole("CUSTOMER");
  const c = me.customer!;
  return (
    <>
      <ProfileHead me={me} line={`Customer since ${day(me.memberSince).split(" ").slice(2).join(" ")} ${new Date(me.memberSince).getFullYear()}`} pill={CUSTOMER_TYPE[c.customerType]} />
      <ProfileDetails me={me} />
      <div className="sec-h" id="addresses"><h2>Pickup addresses</h2></div>
      <Addresses addresses={c.addresses} />
      <div className="sec-h"><h2>Notifications</h2></div>
      <Preferences email={me.emailNotifications} reminder={me.reminderEnabled} language={me.preferredLanguage} />
      <div className="sec-h"><h2>Account</h2></div>
      <div className="kvlist">
        <PasswordForm />
        <Link className="kvrow" href="/customer/complaints"><Icon name="alert" size={18} /><span>Report an issue<small>Complaints about a pickup</small></span><Icon name="chev" size={18} className="chev" /></Link>
      </div>
      <div className="privacy">
        <Note tone="ok" icon="shield">Only admins and the collector assigned to your pickup can see your phone number and address. The collector sees your number only while the pickup is in progress.</Note>
      </div>
      <div className="signout"><SignOutButton /></div>
      <div style={{ height: 20 }} />
    </>
  );
}
