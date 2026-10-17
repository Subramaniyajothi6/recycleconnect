package com.recycleconnect.request;

/** Why a pickup failed (brief §14). */
public enum FailReason {
    CUSTOMER_UNAVAILABLE("Customer unavailable"),
    INCORRECT_ADDRESS("Incorrect address"),
    MATERIAL_UNAVAILABLE("Material unavailable"),
    UNABLE_TO_REACH("Unable to reach location"),
    UNSAFE_MATERIAL("Unsafe or invalid material"),
    OTHER("Other");

    private final String label;

    FailReason(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
