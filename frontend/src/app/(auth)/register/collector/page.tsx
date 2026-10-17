import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ApiError, backend } from "@/lib/backend";
import type { Zone } from "@/lib/types";
import { CollectorForm } from "./CollectorForm";

export const metadata: Metadata = { title: "Become a collector" };

export default function RegisterCollectorPage() {
  return (
    <main className="phone">
      <div className="screen-wrap">
        <div className="body">
          <div className="app-top">
            <Link href="/login" className="icon-btn" aria-label="Back to sign in"><Icon name="back" /></Link>
            <h1 className="title">Become a collector</h1>
          </div>
          <div className="reg-body">
            <div className="note info" style={{ marginBottom: 16 }}>
              <Icon name="info" size={18} />
              <span>
                An admin checks every new collector. You’ll get a notification when your account is approved,
                usually within 2 working days.
              </span>
            </div>
            <Suspense fallback={<div className="skeleton" style={{ height: 520 }} />}>
              <FormWithZones />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

async function FormWithZones() {
  let zones: Zone[];
  try {
    zones = await backend<Zone[]>("/api/catalog/zones");
  } catch (e) {
    const message = e instanceof ApiError ? e.message : "Something went wrong. Try again.";
    return (
      <div className="note warn" role="alert">
        <Icon name="alert" size={18} />
        <span>{message}</span>
      </div>
    );
  }
  return <CollectorForm zones={zones} />;
}
