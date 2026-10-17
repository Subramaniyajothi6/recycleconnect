import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTop } from "@/components/admin";
import { Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import type { CategoryRow } from "@/lib/admin-types";
import { CategoryEditor } from "./CategoryEditor";

export const metadata: Metadata = { title: "Waste categories" };

export default function CategoriesPage(props: PageProps<"/admin/categories">) {
  return (
    <>
      <AdminTop title="Waste categories" sub="What customers can book, and what they see before they submit" />
      <Suspense fallback={<Skeleton h={400} style={{ marginTop: 16 }} />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/categories">["searchParams"] }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const [rows, notAccepted] = await Promise.all([
    api<CategoryRow[]>("/api/admin/categories"),
    api<{ id: number; text: string }[]>("/api/admin/not-accepted"),
  ]);
  const edit = typeof sp.edit === "string" ? sp.edit : null;
  return <CategoryEditor rows={rows} notAccepted={notAccepted} selected={edit === "new" ? "new" : edit ? Number(edit) : rows[0]?.id ?? "new"} />;
}
