"use client";

import { scheduleRequest } from "@/actions/admin";
import { useAction } from "@/components/form/useAction";

/** Books a waiting request with the suggested collector at the customer's preferred slot. */
export function BookButton({ id, date, slot, collectorId }: { id: number; date: string; slot: string; collectorId: number }) {
  const book = useAction(scheduleRequest);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" style={{ height: 30, padding: "0 10px", fontSize: 12.5 }} disabled={book.pending}
        onClick={() => book.run(id, date, slot, collectorId)}>{book.pending ? "Booking…" : "Book"}</button>
      {book.error && <span className="err-text" style={{ display: "block" }}>{Object.values(book.error.fields)[0] ?? book.error.message}</span>}
    </>
  );
}
