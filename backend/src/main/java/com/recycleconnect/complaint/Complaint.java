package com.recycleconnect.complaint;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "complaints")
public class Complaint {

    public enum Type {
        COLLECTOR_DID_NOT_ARRIVE("Collector did not arrive"),
        WRONG_QUANTITY("Wrong quantity recorded"),
        WRONG_CATEGORY("Wrong material category"),
        PICKUP_DELAYED("Pickup delayed"),
        POOR_SERVICE("Poor service"),
        OTHER("Other");

        private final String label;

        Type(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    public enum Status { OPEN, IN_REVIEW, RESOLVED }

    public enum Resolution { EXPLAINED, QUANTITY_CORRECTED, COLLECTOR_STATEMENT, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private String code;

    @Column(name = "request_id", updatable = false)
    private Long requestId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Type type;

    @Column(nullable = false, updatable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.OPEN;

    @Column(name = "assigned_to")
    private Long assignedTo;

    /** Internal note for the admin team; never shown to the customer. */
    private String resolution;

    /** The reply the customer sees. */
    private String reply;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_type")
    private Resolution resolutionType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Version
    private long version;

    protected Complaint() {
    }

    public Complaint(String code, Long requestId, Long customerId, Type type, String description) {
        this.code = code;
        this.requestId = requestId;
        this.customerId = customerId;
        this.type = type;
        this.description = description;
    }

    public void review(Long adminId) {
        this.assignedTo = adminId;
        if (status == Status.OPEN) status = Status.IN_REVIEW;
    }

    public void note(String note) {
        this.resolution = note;
    }

    public void resolve(Long adminId, Resolution type, String reply) {
        this.assignedTo = adminId;
        this.resolutionType = type;
        this.reply = reply;
        this.status = Status.RESOLVED;
        this.resolvedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getRequestId() { return requestId; }
    public Long getCustomerId() { return customerId; }
    public Type getType() { return type; }
    public String getDescription() { return description; }
    public Status getStatus() { return status; }
    public Long getAssignedTo() { return assignedTo; }
    public String getResolution() { return resolution; }
    public String getReply() { return reply; }
    public Resolution getResolutionType() { return resolutionType; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
}
