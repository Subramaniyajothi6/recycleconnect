import type { Metadata } from "next";
import { Suspense } from "react";
import { Note, Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { backend } from "@/lib/backend";
import type { BookingOptions, Category, RequestDetail } from "@/lib/types";
import { PickupFlow } from "./PickupFlow";

export const metadata: Metadata = { title: "Pickup" };

export default function PickupPage(props: PageProps<"/collector/pickups/[id]">) {
  return (
    <Suspense fallback={<div className="pad" style={{ paddingTop: 20 }}><Skeleton h={40} /><Skeleton h={300} style={{ marginTop: 16 }} /></div>}>
      <Loader params={props.params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/collector/pickups/[id]">["params"] }) {
  const { id } = await params;
  await requireRole("COLLECTOR");
  if (!/^\d+$/.test(id)) return <Note tone="warn">We couldn’t find that pickup.</Note>;
  const [r, categories, booking] = await Promise.all([
    api<RequestDetail>(`/api/collector/pickups/${id}`),
    backend<Category[]>("/api/catalog/categories"),
    backend<BookingOptions>("/api/catalog/booking-options"),
  ]);
  return <PickupFlow pickupId={Number(id)} r={r} categories={categories} photoRequired={booking.photoRequired} />;
}
