"use client";

import Link from "next/link";
import { declinePickup, pickupStep } from "@/actions/collector";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { useAction } from "@/components/form/useAction";
import { Icon } from "@/components/Icon";
import { ItemLegend, ItemStrip, Pill } from "@/components/ui";
import { CUSTOMER_TYPE, PICKUP_LABEL, day, slot } from "@/lib/format";
import type { Stop } from "@/lib/types";

/** One stop in the collector's lists (design k-today / k-assigned). */
export function StopCard({ stop: s, n, showDate }: { stop: Stop; n: number | "new"; showDate?: boolean }) {
  const accept = useAction(pickupStep);
  const decline = useAction(declinePickup);
  const label = PICKUP_LABEL[s.pickupStatus] ?? { label: s.pickupStatus, tone: "neutral" as const };
  const done = s.pickupStatus === "COMPLETED" || s.pickupStatus === "COLLECTED";
  const recorded = done || s.pickupStatus === "FAILED";
  const css = `stop s-${s.pickupStatus === "COLLECTED" ? "completed" : s.pickupStatus.toLowerCase()}`;
  return (
    <article className={css}>
      <span className="num">{done ? <Icon name="check" size={16} /> : n === "new" ? <Icon name="bell" size={15} /> : n}</span>
      <div>
        <div className="r1">
          <div>
            <div className="slot-t">{showDate ? `${day(s.date)}, ` : ""}{slot(s.slot)}</div>
            <h3>{s.customer}</h3>
            <div className="area">{s.customerType ? CUSTOMER_TYPE[s.customerType] : ""}{s.area ? `, ${s.area}` : ""}</div>
          </div>
          <Pill tone={label.tone}>{label.label}</Pill>
        </div>
        <ItemStrip items={s.items} actual={recorded} />
        <ItemLegend items={s.items} actual={recorded} />
        {s.failReason && <div className="fail-r">Reason: {s.failReason}</div>}
        {(accept.error || decline.error) && <div className="fail-r">{(accept.error ?? decline.error)?.message}</div>}
        <div className="acts">
          {s.pickupStatus === "ASSIGNED" && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={accept.pending} onClick={() => accept.run(s.pickupId, "ACCEPTED")}>Accept pickup</button>
              <ConfirmButton className="btn btn-ghost btn-sm" title="Ask the office to reassign?" confirmLabel="Ask to reassign"
                reasonLabel="Why can’t you take it?" onConfirm={(r) => decline.run(s.pickupId, r)}>Ask to reassign</ConfirmButton>
            </>
          )}
          {!recorded && s.pickupStatus !== "ASSIGNED" && (
            <Link href={`/collector/pickups/${s.pickupId}`} className="btn btn-primary btn-sm">
              {s.pickupStatus === "ACCEPTED" ? "Open pickup" : "Continue pickup"}
            </Link>
          )}
          {(recorded || s.pickupStatus === "ASSIGNED") && (
            <Link href={`/collector/pickups/${s.pickupId}`} className="btn btn-ghost btn-sm">Details</Link>
          )}
        </div>
      </div>
    </article>
  );
}
