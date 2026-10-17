package com.recycleconnect.request;

import java.time.LocalDateTime;

import com.recycleconnect.settings.Rules;

/**
 * A pickup is overdue when its booked slot has ended and nothing was collected: still scheduled or assigned after
 * the slot, or a trip started on an earlier day and never finished. One rule for the request lists, the review
 * panel, the dashboard count and the admins' morning notice.
 */
public final class Overdue {

    private Overdue() {
    }

    /** SQL condition on {@code collection_requests r}; needs {@code :nowLocal} (timestamp) and {@code :today} (date). Padded with spaces. */
    public static final String SQL = " ((r.status in ('SCHEDULED', 'ASSIGNED') and r.scheduled_date is not null"
            + " and r.scheduled_date + cast(split_part(r.scheduled_slot, '-', 2) as time) < :nowLocal)"
            + " or (r.status = 'PICKUP_STARTED' and r.scheduled_date < :today)) ";

    public static boolean is(CollectionRequest r, LocalDateTime now) {
        if (r.getScheduledDate() == null || r.getScheduledSlot() == null) return false;
        return switch (r.getStatus()) {
            case SCHEDULED, ASSIGNED -> r.getScheduledDate().atTime(Rules.slotEnd(r.getScheduledSlot())).isBefore(now);
            case PICKUP_STARTED -> r.getScheduledDate().isBefore(now.toLocalDate());
            default -> false;
        };
    }
}
