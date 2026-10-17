"use client";

import Link from "next/link";
import { approveCollector, rejectCollector, setCollectorAvailability } from "@/actions/admin";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { useAction } from "@/components/form/useAction";
import { StatusActions } from "../StatusActions";

export function ApproveActions({ id, name, idProof }: { id: number; name: string; idProof: boolean }) {
  const approve = useAction(approveCollector);
  const reject = useAction(rejectCollector);
  return (
    <span className="acts">
      {idProof && <a className="btn btn-ghost btn-sm" href={`/files/id-proof/${id}`} target="_blank" rel="noopener">View ID proof</a>}
      <ConfirmButton className="btn btn-danger btn-sm" title={`Reject ${name}?`} confirmLabel="Reject" danger reasonLabel="Reason (emailed to them if they gave an email)"
        onConfirm={(r) => reject.run(id, r)}>Reject</ConfirmButton>
      <ConfirmButton className="btn btn-primary btn-sm" title={`Approve ${name}?`} confirmLabel="Approve"
        body={idProof ? "They can receive pickups straight away." : "They haven’t uploaded an ID proof. Approve only if you’ve checked their ID another way."}
        onConfirm={() => approve.run(id)}>Approve</ConfirmButton>
      {(approve.error || reject.error) && <span className="err-text">{(approve.error ?? reject.error)?.message}</span>}
    </span>
  );
}

export function CollectorActions({ id, name, status, available, idProof }: { id: number; name: string; status: string; available: boolean; idProof: boolean }) {
  const leave = useAction(setCollectorAvailability);
  return (
    <div className="rowact" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
      <Link className="lnk" href={`/admin/requests?tab=SCHEDULED&collectorId=${id}`}>View schedule</Link>
      {status === "ACTIVE" && (
        <button type="button" className="lnk" disabled={leave.pending} onClick={() => leave.run(id, !available)}>{available ? "Mark on leave" : "Back from leave"}</button>
      )}
      {idProof && <a className="lnk" href={`/files/id-proof/${id}`} target="_blank" rel="noopener">ID proof</a>}
      <StatusActions id={id} status={status} name={name} />
    </div>
  );
}
