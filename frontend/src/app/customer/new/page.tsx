import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import type { BookingOptions, Category, RequestDetail } from "@/lib/types";
import { backend } from "@/lib/backend";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "New collection" };

export default function NewCollectionPage(props: PageProps<"/customer/new">) {
  return (
    <Suspense fallback={<div className="pad" style={{ paddingTop: 20 }}><Skeleton h={40} /><Skeleton h={300} style={{ marginTop: 16 }} /></div>}>
      <Loader searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Loader({ searchParams }: { searchParams: PageProps<"/customer/new">["searchParams"] }) {
  const sp = await searchParams;
  const editId = typeof sp.edit === "string" && /^\d+$/.test(sp.edit) ? Number(sp.edit) : null;
  const me = await requireRole("CUSTOMER");
  const [categories, notAccepted, booking, existing] = await Promise.all([
    backend<Category[]>("/api/catalog/categories"),
    backend<string[]>("/api/catalog/not-accepted"),
    backend<BookingOptions>("/api/catalog/booking-options"),
    editId ? api<RequestDetail>(`/api/customer/requests/${editId}`) : Promise.resolve(null),
  ]);
  return (
    <NewRequestForm
      categories={categories}
      notAccepted={notAccepted}
      booking={booking}
      addresses={me.customer?.addresses ?? []}
      existing={existing && existing.actions.canEdit ? existing : null}
    />
  );
}
