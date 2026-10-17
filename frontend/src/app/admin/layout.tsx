import { Suspense } from "react";
import { AdminNav } from "@/components/AdminNav";
import { AdminSide } from "@/components/AdminSide";
import { Brand } from "@/components/Brand";
import { FilterPicker } from "@/components/FilterPicker";
import { initials } from "@/components/ProfileHead";
import { SignOutButton } from "@/components/SignOutButton";
import { requireRole } from "@/lib/dal";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="admin">
      <AdminSide brand={<Brand />}>
        <Suspense fallback={null}>
          <AdminNav />
        </Suspense>
        <Suspense fallback={<div className="me" />}>
          <SignedInAs />
        </Suspense>
      </AdminSide>
      <main className="main">{children}</main>
      <FilterPicker />
    </div>
  );
}

async function SignedInAs() {
  const me = await requireRole("ADMIN");
  return (
    <div className="me" style={{ flexWrap: "wrap" }}>
      <span className="avatar" aria-hidden="true">{initials(me.name)}</span>
      <div>
        <b>{me.name}</b>
        <div className="muted" style={{ fontSize: 12 }}>Operations admin</div>
      </div>
      <SignOutButton className="lnk bad" />
    </div>
  );
}
