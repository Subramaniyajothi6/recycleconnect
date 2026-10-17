package com.recycleconnect.request;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * A collection request. The pickup address is copied in (a snapshot), so later edits to the customer's saved
 * addresses never change past requests. Status changes go through {@link RequestWorkflow}.
 */
@Entity
@Table(name = "collection_requests")
public class CollectionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private String code;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "address_id")
    private Long addressId;

    @Column(name = "address_label")
    private String addressLabel;

    @Column(name = "address_line1", nullable = false)
    private String addressLine1;

    @Column(name = "address_area")
    private String addressArea;

    @Column(name = "address_city", nullable = false)
    private String addressCity;

    @Column(name = "address_district")
    private String addressDistrict;

    @Column(name = "address_state")
    private String addressState;

    @Column(name = "address_pin")
    private String addressPin;

    private Double lat;
    private Double lng;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "preferred_date")
    private LocalDate preferredDate;

    @Column(name = "preferred_slot")
    private String preferredSlot;

    /** The booked pickup, set by an admin. The customer's preference above is kept as asked. */
    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "scheduled_slot")
    private String scheduledSlot;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.DRAFT;

    @Column(name = "reject_reason")
    private String rejectReason;

    @Column(name = "info_request")
    private String infoRequest;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Column(name = "cancelled_by")
    private Long cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Version
    private long version;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<RequestItem> items = new ArrayList<>();

    protected CollectionRequest() {
    }

    public CollectionRequest(String code, Long customerId) {
        this.code = code;
        this.customerId = customerId;
    }

    public void setAddress(Long addressId, String label, String line1, String area, String city, String district,
            String state, String pin, Double lat, Double lng, Long zoneId) {
        this.addressId = addressId;
        this.addressLabel = label;
        this.addressLine1 = line1;
        this.addressArea = area;
        this.addressCity = city;
        this.addressDistrict = district;
        this.addressState = state;
        this.addressPin = pin;
        this.lat = lat;
        this.lng = lng;
        this.zoneId = zoneId;
    }

    public void setPreference(LocalDate date, String slot, String notes) {
        this.preferredDate = date;
        this.preferredSlot = slot;
        this.notes = notes;
    }

    /** Only {@link RequestWorkflow} calls this, after checking the move is legal. */
    void setStatus(RequestStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void setSchedule(LocalDate date, String slot) {
        this.scheduledDate = date;
        this.scheduledSlot = slot;
    }

    public void markSubmitted() { this.submittedAt = Instant.now(); }
    public void markCompleted() { this.completedAt = Instant.now(); }
    public void setRejectReason(String reason) { this.rejectReason = reason; }
    public void setInfoRequest(String message) { this.infoRequest = message; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }
    public void touch() { this.updatedAt = Instant.now(); }

    public void markCancelled(Long by, String reason) {
        this.cancelledBy = by;
        this.cancelReason = reason;
        this.cancelledAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getCustomerId() { return customerId; }
    public Long getAddressId() { return addressId; }
    public String getAddressLabel() { return addressLabel; }
    public String getAddressLine1() { return addressLine1; }
    public String getAddressArea() { return addressArea; }
    public String getAddressCity() { return addressCity; }
    public String getAddressDistrict() { return addressDistrict; }
    public String getAddressState() { return addressState; }
    public String getAddressPin() { return addressPin; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public Long getZoneId() { return zoneId; }
    public LocalDate getPreferredDate() { return preferredDate; }
    public String getPreferredSlot() { return preferredSlot; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public String getScheduledSlot() { return scheduledSlot; }
    public String getNotes() { return notes; }
    public RequestStatus getStatus() { return status; }
    public String getRejectReason() { return rejectReason; }
    public String getInfoRequest() { return infoRequest; }
    public String getCancelReason() { return cancelReason; }
    public Long getCancelledBy() { return cancelledBy; }
    public Instant getCancelledAt() { return cancelledAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public List<RequestItem> getItems() { return items; }

    /** One-line address for lists and notifications. */
    public String addressText() {
        StringBuilder sb = new StringBuilder(addressLine1);
        if (addressArea != null && !addressArea.isBlank()) sb.append(", ").append(addressArea);
        sb.append(", ").append(addressCity);
        if (addressPin != null && !addressPin.isBlank()) sb.append(" ").append(addressPin);
        return sb.toString();
    }
}
