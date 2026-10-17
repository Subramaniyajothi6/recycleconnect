import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { Pill, Skeleton } from "@/components/ui";
import { api, requireRole } from "@/lib/dal";
import { when } from "@/lib/format";
import type { Complaint, RequestCard } from "@/lib/types";
import { ComplaintForm } from "./ComplaintForm";

export const metadata: Metadata = { title: "Report an issue" };

export default function ComplaintsPage(props: PageProps<"/customer/complaints">) {
  return (
    <>
      <div className="app-top">
        <Link href="/customer/profile" className="icon-btn" aria-label="Back"><Icon name="back" /></Link>
        <h1 className="title">Report an issue</h1>
      </div>
      <Suspense fallback={<div className="pad"><Skeleton h={300} /></div>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/customer/complaints">["searchParams"] }) {
  const sp = await searchParams;
  await requireRole("CUSTOMER");
  const [requests, complaints] = await Promise.all([
    api<RequestCard[]>("/api/customer/requests"),
    api<Complaint[]>("/api/customer/complaints"),
  ]);
  const eligible = requests.filter((r) => ["COLLECTED", "COMPLETED", "FAILED", "ASSIGNED", "PICKUP_STARTED", "SCHEDULED"].includes(r.status)).slice(0, 8);
  const pre = typeof sp.request === "string" ? Number(sp.request) : null;
  return (
    <>
      <ComplaintForm requests={eligible} preselected={pre && eligible.some((r) => r.id === pre) ? pre : eligible[0]?.id ?? null} />
      <div className="sec-h"><h2>Your complaints</h2></div>
      {complaints.length === 0 ? <p className="empty-hint">You haven’t reported any issues.</p> : (
        <div className="cmp-list">
          {complaints.map((c) => (
            <div key={c.id} className="cmp">
              <div className="r1">
                <span className="muted" style={{ fontSize: 13 }}>{c.code}{c.requestCode ? `, ${c.requestCode}` : ""}</span>
                <Pill tone={c.status === "RESOLVED" ? "done" : c.status === "IN_REVIEW" ? "info" : "warn"}>
                  {c.status === "RESOLVED" ? "Resolved" : c.status === "IN_REVIEW" ? "In review" : "Open"}
                </Pill>
              </div>
              <h3>{c.typeLabel}</h3>
              {c.reply ? (
                <div className="reply"><b>Reply from RecycleConnect{c.resolvedAt ? `, ${when(c.resolvedAt)}` : ""}</b>{c.reply}</div>
              ) : (
                <ul className="mini-tl">
                  <li className="done"><i />Sent {when(c.createdAt)}</li>
                  <li className={c.status !== "OPEN" ? "done" : ""}><i />{c.assignedTo ? `${c.assignedTo} is reviewing it` : "Waiting for review"}</li>
                  <li><i />Reply and resolution</li>
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 20 }} />
    </>
  );
}
