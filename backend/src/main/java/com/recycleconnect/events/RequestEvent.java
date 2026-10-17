package com.recycleconnect.events;

import java.util.Map;

/**
 * Something happened to a collection request. Published inside the transaction that made the change.
 * Listeners today: notifications. Planned listeners (rewards, impact dashboard, partner hand-over) subscribe
 * to the same events without changing the request code (docs/EXTENDING.md).
 */
public record RequestEvent(Type type, Long requestId, String code, Long customerId, Long collectorId, Long actorId,
        Map<String, String> details) {

    public enum Type {
        SUBMITTED, ACCEPTED, REJECTED, INFO_REQUESTED, SCHEDULED, ASSIGNED, UNASSIGNED, RESCHEDULED, PICKUP_ACCEPTED,
        PICKUP_STARTED, COLLECTED, PICKUP_COMPLETED, COMPLETED, FAILED, CANCELLED, REMINDER
    }

    public String detail(String key) {
        return details == null ? null : details.get(key);
    }
}
