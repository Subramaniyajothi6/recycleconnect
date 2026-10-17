package com.recycleconnect.request;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Request status (brief §7, plus REJECTED from §8) and every legal move between them (DECISIONS P4).
 * Services call {@link #canMoveTo} before changing status; anything else is refused.
 */
public enum RequestStatus {
    DRAFT, SUBMITTED, UNDER_REVIEW, INFO_REQUESTED, ACCEPTED, REJECTED, SCHEDULED, ASSIGNED, PICKUP_STARTED,
    COLLECTED, COMPLETED, CANCELLED, FAILED;

    private static final Map<RequestStatus, Set<RequestStatus>> NEXT = Map.ofEntries(
            Map.entry(DRAFT, EnumSet.of(SUBMITTED, CANCELLED)),
            Map.entry(SUBMITTED, EnumSet.of(UNDER_REVIEW, ACCEPTED, REJECTED, INFO_REQUESTED, CANCELLED)),
            Map.entry(UNDER_REVIEW, EnumSet.of(ACCEPTED, REJECTED, INFO_REQUESTED, CANCELLED)),
            Map.entry(INFO_REQUESTED, EnumSet.of(SUBMITTED, CANCELLED)),
            Map.entry(ACCEPTED, EnumSet.of(SCHEDULED, CANCELLED)),
            Map.entry(SCHEDULED, EnumSet.of(ASSIGNED, SCHEDULED, CANCELLED)),
            Map.entry(ASSIGNED, EnumSet.of(PICKUP_STARTED, SCHEDULED, ASSIGNED, FAILED, CANCELLED)),
            Map.entry(PICKUP_STARTED, EnumSet.of(COLLECTED, FAILED, CANCELLED)),
            Map.entry(COLLECTED, EnumSet.of(COMPLETED)),
            Map.entry(FAILED, EnumSet.of(SCHEDULED, CANCELLED)),
            Map.entry(COMPLETED, EnumSet.noneOf(RequestStatus.class)),
            Map.entry(CANCELLED, EnumSet.noneOf(RequestStatus.class)),
            Map.entry(REJECTED, EnumSet.noneOf(RequestStatus.class)));

    public boolean canMoveTo(RequestStatus next) {
        return NEXT.get(this).contains(next);
    }

    /** The customer may still change the request's details. */
    public boolean isEditableByCustomer() {
        return this == DRAFT || this == INFO_REQUESTED;
    }

    /** Waiting for an admin decision. */
    public boolean isInReview() {
        return this == SUBMITTED || this == UNDER_REVIEW;
    }

    /** Still going: not finished, cancelled, rejected or failed. */
    public boolean isOpen() {
        return this != COMPLETED && this != CANCELLED && this != REJECTED && this != FAILED;
    }

    /** Statuses a customer may cancel from (a cut-off time also applies once a pickup date is set). */
    public boolean isCancellableByCustomer() {
        return EnumSet.of(DRAFT, SUBMITTED, UNDER_REVIEW, INFO_REQUESTED, ACCEPTED, SCHEDULED, ASSIGNED).contains(this);
    }
}
