package com.recycleconnect.events;

/** Something happened to a user account that the user should hear about. */
public record AccountEvent(Type type, Long userId, Long actorId, String message) {

    public enum Type { COLLECTOR_APPROVED, COLLECTOR_REJECTED, STATUS_CHANGED }
}
