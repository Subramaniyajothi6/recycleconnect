package com.recycleconnect.request;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** The collector's steps for one pickup (brief §11) and the legal moves between them. */
public enum PickupStatus {
    ASSIGNED, ACCEPTED, ON_THE_WAY, ARRIVED, COLLECTION_STARTED, COLLECTED, COMPLETED, FAILED;

    private static final Map<PickupStatus, Set<PickupStatus>> NEXT = Map.of(
            ASSIGNED, EnumSet.of(ACCEPTED, FAILED),
            ACCEPTED, EnumSet.of(ON_THE_WAY, FAILED),
            ON_THE_WAY, EnumSet.of(ARRIVED, FAILED),
            ARRIVED, EnumSet.of(COLLECTION_STARTED, FAILED),
            COLLECTION_STARTED, EnumSet.of(COLLECTED, FAILED),
            COLLECTED, EnumSet.of(COMPLETED),
            COMPLETED, EnumSet.noneOf(PickupStatus.class),
            FAILED, EnumSet.noneOf(PickupStatus.class));

    public boolean canMoveTo(PickupStatus next) {
        return NEXT.get(this).contains(next);
    }

    /** The collector is out doing this pickup right now. */
    public boolean isUnderway() {
        return this == ON_THE_WAY || this == ARRIVED || this == COLLECTION_STARTED;
    }

    public boolean isFinished() {
        return this == COMPLETED || this == FAILED;
    }
}
