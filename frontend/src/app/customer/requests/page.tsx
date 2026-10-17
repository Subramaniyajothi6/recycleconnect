import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { Empty, ItemLegend, ItemStrip, Skeleton, StatusPill } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { day, slot } from "@/lib/format";
import type { RequestCard } from "@/lib/types";
import { SearchBox } from "./SearchBox";

export const metadata: Metadata = { title: "My requests" };

const PAST = ["COMPLETED", "CANCELLED", "REJECTED", "FAILED"];

export default function MyRequestsPage(props: PageProps<"/customer/requests">) {
  return (
    <>
      <div className="app-top">
        <h1 className="title">My requests</h1>
        <Link className="icon-btn" href="/customer/new" aria-label="New collection"><Icon name="plus" /></Link>
      </div>
      <Suspense fallback={<div className="pad"><Skeleton h={44} /><Skeleton h={160} style={{ marginTop: 14 }} /></div>}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/customer/requests">["searchParams"] }) {
  const sp = await searchParams;
  const tab = sp.tab === "draft" || sp.tab === "past" ? sp.tab : "active";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  await requireRole("CUSTOMER");
  const all = await api<RequestCard[]>("/api/customer/requests");
  const groups = {
    active: all.filter((r) => r.status !== "DRAFT" && !PAST.includes(r.status)),
    draft: all.filter((r) => r.status === "DRAFT"),
    past: all.filter((r) => PAST.includes(r.status)),
  };
  let list = groups[tab];
  if (q) list = list.filter((r) => r.code.toLowerCase().includes(q) || r.items.some((i) => i.name.toLowerCase().includes(q)));

  return (
    <>
      <div className="pad-t">
        <nav className="seg" aria-label="Request groups">
          {([["active", "Active"], ["draft", "Drafts"], ["past", "Past"]] as const).map(([k, l]) => (
            <Link key={k} href={`/customer/requests?tab=${k}`} aria-current={k === tab ? "page" : undefined}>
              {l}<span className="n">{groups[k].length}</span>
            </Link>
          ))}
        </nav>
      </div>
      {tab === "past" && <SearchBox initial={q} />}
      <div className="rcards" style={{ marginTop: 14 }}>
        {list.map((r) => (
          <Link key={r.id} className={r.status === "DRAFT" ? "rcard draft" : "rcard"}
            href={r.status === "DRAFT" || r.status === "INFO_REQUESTED" ? `/customer/new?edit=${r.id}` : `/customer/requests/${r.id}`}>
            <div className="r1"><span className="id">{r.code}</span><StatusPill status={r.status} /></div>
            <div className="when">{r.status === "DRAFT" ? "Not submitted yet" : r.date ? `${day(r.date)}${r.slot ? `, ${slot(r.slot)}` : ""}` : "No date yet"}</div>
            <ItemStrip items={r.items} actual={r.status === "COMPLETED"} />
            <ItemLegend items={r.items} actual={r.status === "COMPLETED"} />
            <div className="foot-note"><span>{r.note}</span><Icon name="chev" size={16} /></div>
          </Link>
        ))}
      </div>
      {list.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <Empty title={tab === "draft" ? "No drafts" : tab === "past" ? "Nothing here yet" : "No active requests"}>
            {tab === "active" ? "Book a pickup with New." : tab === "draft" ? "Save a request as a draft to finish it later." : "Finished, cancelled and failed requests appear here."}
          </Empty>
        </div>
      )}
      {tab === "draft" && list.length > 0 && <p className="empty-hint">Drafts are kept for 30 days. Open one to finish and submit it.</p>}
    </>
  );
}
