package com.recycleconnect.events;

/** A complaint was raised or changed. */
public record ComplaintEvent(Type type, Long complaintId, String code, Long customerId, Long actorId, String message) {

    public enum Type { RAISED, IN_REVIEW, RESOLVED }
}
