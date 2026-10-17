package com.recycleconnect.request;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * One collector's assignment to a request on a date and slot. Reassigning keeps the old row with
 * {@code active = false}; the database allows only one active pickup per request (DECISIONS T8).
 */
@Entity
@Table(name = "pickups")
public class Pickup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, updatable = false)
    private Long requestId;

    @Column(name = "collector_id", nullable = false, updatable = false)
    private Long collectorId;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(nullable = false)
    private String slot;

    @Enumerated(EnumType.STRING)
    @Column(name = "pickup_status", nullable = false)
    private PickupStatus status = PickupStatus.ASSIGNED;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt = Instant.now();

    @Column(name = "assigned_by")
    private Long assignedBy;

    @Column(name = "accepted_at") private Instant acceptedAt;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "arrived_at") private Instant arrivedAt;
    @Column(name = "collected_at") private Instant collectedAt;
    @Column(name = "completed_at") private Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "fail_reason")
    private FailReason failReason;

    @Column(name = "fail_note")
    private String failNote;

    @Column(name = "collector_notes")
    private String collectorNotes;

    @Version
    private long version;

    protected Pickup() {
    }

    public Pickup(Long requestId, Long collectorId, LocalDate date, String slot, Long assignedBy) {
        this.requestId = requestId;
        this.collectorId = collectorId;
        this.scheduledDate = date;
        this.slot = slot;
        this.assignedBy = assignedBy;
    }

    /** Only {@link RequestWorkflow} calls this, after checking the move is legal. */
    void moveTo(PickupStatus next) {
        Instant now = Instant.now();
        switch (next) {
            case ACCEPTED -> acceptedAt = now;
            case ON_THE_WAY -> startedAt = now;
            case ARRIVED -> arrivedAt = now;
            case COLLECTED -> collectedAt = now;
            case COMPLETED -> completedAt = now;
            default -> { }
        }
        this.status = next;
    }

    void fail(FailReason reason, String note) {
        this.failReason = reason;
        this.failNote = note;
        this.status = PickupStatus.FAILED;
    }

    void deactivate() { this.active = false; }

    void reschedule(LocalDate date, String slot) {
        this.scheduledDate = date;
        this.slot = slot;
    }

    public void setCollectorNotes(String notes) { this.collectorNotes = notes; }

    public Long getId() { return id; }
    public Long getRequestId() { return requestId; }
    public Long getCollectorId() { return collectorId; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public String getSlot() { return slot; }
    public PickupStatus getStatus() { return status; }
    public boolean isActive() { return active; }
    public Instant getAssignedAt() { return assignedAt; }
    public Long getAssignedBy() { return assignedBy; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getArrivedAt() { return arrivedAt; }
    public Instant getCollectedAt() { return collectedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public FailReason getFailReason() { return failReason; }
    public String getFailNote() { return failNote; }
    public String getCollectorNotes() { return collectorNotes; }
}
