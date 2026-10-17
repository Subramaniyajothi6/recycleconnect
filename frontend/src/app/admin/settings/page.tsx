import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTop } from "@/components/admin";
import { Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import type { ZoneRow } from "@/lib/admin-types";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <AdminTop title="Settings" sub="Rules the whole platform follows. Changes are written to the audit log." />
      <Suspense fallback={<Skeleton h={400} style={{ marginTop: 16 }} />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireRole("ADMIN");
  const [settings, zones] = await Promise.all([api<Record<string, string>>("/api/admin/settings"), api<ZoneRow[]>("/api/admin/zones")]);
  return <SettingsForm initial={settings} zones={zones} />;
}
