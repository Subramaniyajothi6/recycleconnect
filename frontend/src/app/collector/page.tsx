import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { AppMap } from "@/components/map/AppMap";
import { Note, Skeleton } from "@/components/ui";
import { api, qs, requireRole } from "@/lib/dal";
import { DAY_SHORT, VEHICLE, day, num } from "@/lib/format";
import { MAP } from "@/lib/map/config";
import type { Category, CollectorToday, Me } from "@/lib/types";
import { backend } from "@/lib/backend";
import { StopCard } from "./StopCard";
import { IdProofUpload } from "./IdProofUpload";

export const metadata: Metadata = { title: "Today" };

export default function CollectorToday(props: PageProps<"/collector">) {
  return (
    <Suspense fallback={<div className="k-head"><Skeleton h={120} style={{ opacity: 0.25 }} /></div>}>
      <Today searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Today({ searchParams }: { searchParams: PageProps<"/collector">["searchParams"] }) {
  const me = await requireRole("COLLECTOR");
  if (me.status === "PENDING_APPROVAL") return <Waiting me={me} />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const categoryId = typeof sp.category === "string" ? sp.category : "";
  const [t, categories] = await Promise.all([
    api<CollectorToday>(`/api/collector/today${qs({ status, categoryId })}`),
    backend<Category[]>("/api/catalog/categories"),
  ]);
  const located = t.stops.filter((s) => s.lat && s.lng);
  const filter = (k: string, label: string) => (
    <Link className="fchip" href={`/collector${qs({ status: k, category: categoryId })}`} aria-pressed={status === k}>{label}</Link>
  );

  return (
    <>
      <div className="k-head">
        <div className="top">
          <small>{t.zones}</small>
          <Link className="icon-btn" href="/collector/assigned" style={{ background: "transparent", borderColor: "rgba(255,255,255,.25)", color: "#fff" }} aria-label="New assignments">
            <Icon name="bell" />{t.needsAnswer.length > 0 && <span className="dot" />}
          </Link>
        </div>
        <h1>{day(t.date)}, {t.counts.today} pickup{t.counts.today === 1 ? "" : "s"}</h1>
        <div className="k-counts">
          <div><b>{t.counts.today}</b><span>Today</span></div>
          <div><b>{t.counts.pending}</b><span>Pending</span></div>
          <div><b>{t.counts.completed}</b><span>Completed</span></div>
          <div><b>{t.counts.failed}</b><span>Failed</span></div>
        </div>
        <div className="k-kg"><span>Collected today</span><b>{num(t.counts.kg)} kg</b></div>
      </div>

      {t.needsAnswer.length > 0 && (
        <div style={{ margin: "14px 20px 0" }}>
          <Note tone="warn" icon="bell">
            {t.needsAnswer.length} new assignment{t.needsAnswer.length === 1 ? "" : "s"} to accept. <Link href="/collector/assigned" style={{ fontWeight: 700, color: "inherit" }}>Review</Link>
          </Note>
        </div>
      )}

      <div className="filters" role="group" aria-label="Filters">
        {filter("", "All statuses")}
        {filter("pending", "Pending")}
        {filter("completed", "Completed")}
        {filter("failed", "Failed")}
        <form action="/collector" style={{ display: "contents" }}>
          {status && <input type="hidden" name="status" value={status} />}
          <label className="fchip"><Icon name="filter" size={15} />
            <select name="category" defaultValue={categoryId} aria-label="Category" style={{ border: 0, background: "transparent", font: "inherit" }}>
              <option value="">Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="fchip" type="submit">Apply</button>
        </form>
      </div>

      {located.length > 0 && (
        <div className="pad" style={{ marginTop: 12 }}>
          <AppMap className="mapbox" style={{ height: 200 }} label="Map of today’s stops"
            route={located.filter((s) => !["COMPLETED", "COLLECTED", "FAILED"].includes(s.pickupStatus)).map((s) => [s.lat!, s.lng!] as [number, number])}
            markers={located.map((s, i) => ({ id: s.pickupId, lat: s.lat!, lng: s.lng!, kind: "stop" as const, label: String(i + 1), status: s.pickupStatus, title: s.customer }))} />
        </div>
      )}

      <div className="sec-h">
        <h2>Route</h2>
        {located.length > 0 && <a href={MAP.directionsUrl(located[0].lat!, located[0].lng!)} target="_blank" rel="noopener">Open in maps</a>}
      </div>
      {t.stops.length === 0 ? (
        <p className="empty-hint">{status || categoryId ? "No pickups match these filters." : "No pickups today. New ones appear under Assigned."}</p>
      ) : (
        <div className="stops">{t.stops.map((s, i) => <StopCard key={s.pickupId} stop={s} n={i + 1} />)}</div>
      )}
      <div style={{ height: 20 }} />
    </>
  );
}

function Waiting({ me }: { me: Me }) {
  const c = me.collector!;
  return (
    <>
      <div className="k-head slim">
        <div className="top"><small>Hi, {me.name.split(" ")[0]}</small></div>
        <h1>Waiting for approval</h1>
      </div>
      <div style={{ margin: "16px 20px 0" }}>
        <Note icon="clock">An admin is checking your details. You’ll get a notification when your account is approved, usually within 2 working days. Pickups appear here after that.</Note>
      </div>
      <div className="sec-h"><h2>What you sent</h2></div>
      <div className="kvlist">
        <div className="kvrow"><Icon name="truck" /><span>{c.vehicleType ? VEHICLE[c.vehicleType] : "Vehicle"}<small>{c.vehicleNumber}</small></span><span /></div>
        <div className="kvrow"><Icon name="pin" /><span>{c.zones.map((z) => z.name).join(", ")}<small>Areas</small></span><span /></div>
        <div className="kvrow"><Icon name="cal" /><span>{c.workingDays.map((d) => DAY_SHORT[d]).join(", ")}<small>Working days</small></span><span /></div>
        <div className="kvrow"><Icon name="file" /><span>{c.idProofUploaded ? "ID proof uploaded" : "No ID proof yet"}<small>Only admins can see it</small></span><span /></div>
      </div>
      {!c.idProofUploaded && <IdProofUpload />}
    </>
  );
}
