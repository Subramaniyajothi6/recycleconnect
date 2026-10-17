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

/** The append-only records kept beside a request: status history, reschedules, photos, confirmation. */
public final class RequestRecords {

    private RequestRecords() {
    }

    @Entity
    @Table(name = "status_history")
    public static class StatusChange {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        @Column(name = "request_id", nullable = false, updatable = false) private Long requestId;
        @Column(name = "from_status", updatable = false) private String fromStatus;
        @Column(name = "to_status", nullable = false, updatable = false) private String toStatus;
        @Column(name = "by_user", updatable = false) private Long byUser;
        @Column(nullable = false, updatable = false) private Instant at = Instant.now();
        @Column(updatable = false) private String note;

        protected StatusChange() {
        }

        public StatusChange(Long requestId, String from, String to, Long byUser, String note) {
            this.requestId = requestId;
            this.fromStatus = from;
            this.toStatus = to;
            this.byUser = byUser;
            this.note = note;
        }

        public Long getId() { return id; }
        public Long getRequestId() { return requestId; }
        public String getFromStatus() { return fromStatus; }
        public String getToStatus() { return toStatus; }
        public Long getByUser() { return byUser; }
        public Instant getAt() { return at; }
        public String getNote() { return note; }
    }

    @Entity
    @Table(name = "reschedules")
    public static class Reschedule {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        @Column(name = "request_id", nullable = false, updatable = false) private Long requestId;
        @Column(name = "from_date", updatable = false) private LocalDate fromDate;
        @Column(name = "from_slot", updatable = false) private String fromSlot;
        @Column(name = "to_date", nullable = false, updatable = false) private LocalDate toDate;
        @Column(name = "to_slot", nullable = false, updatable = false) private String toSlot;
        @Column(updatable = false) private String reason;
        @Column(name = "changed_by", nullable = false, updatable = false) private Long changedBy;
        @Column(name = "changed_at", nullable = false, updatable = false) private Instant changedAt = Instant.now();

        protected Reschedule() {
        }

        public Reschedule(Long requestId, LocalDate fromDate, String fromSlot, LocalDate toDate, String toSlot,
                String reason, Long changedBy) {
            this.requestId = requestId;
            this.fromDate = fromDate;
            this.fromSlot = fromSlot;
            this.toDate = toDate;
            this.toSlot = toSlot;
            this.reason = reason;
            this.changedBy = changedBy;
        }

        public Long getId() { return id; }
        public Long getRequestId() { return requestId; }
        public LocalDate getFromDate() { return fromDate; }
        public String getFromSlot() { return fromSlot; }
        public LocalDate getToDate() { return toDate; }
        public String getToSlot() { return toSlot; }
        public String getReason() { return reason; }
        public Long getChangedBy() { return changedBy; }
        public Instant getChangedAt() { return changedAt; }
    }

    @Entity
    @Table(name = "request_photos")
    public static class Photo {
        public enum Kind { CUSTOMER, EVIDENCE }

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        @Column(name = "request_id", nullable = false, updatable = false) private Long requestId;
        @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Kind kind;
        @Column(nullable = false, updatable = false) private String path;
        @Column(name = "content_type", updatable = false) private String contentType;
        @Column(name = "size_bytes", updatable = false) private Long sizeBytes;
        @Column(name = "uploaded_by", nullable = false, updatable = false) private Long uploadedBy;
        @Column(name = "uploaded_at", nullable = false, updatable = false) private Instant uploadedAt = Instant.now();

        protected Photo() {
        }

        public Photo(Long requestId, Kind kind, String path, String contentType, long sizeBytes, Long uploadedBy) {
            this.requestId = requestId;
            this.kind = kind;
            this.path = path;
            this.contentType = contentType;
            this.sizeBytes = sizeBytes;
            this.uploadedBy = uploadedBy;
        }

        public Long getId() { return id; }
        public Long getRequestId() { return requestId; }
        public Kind getKind() { return kind; }
        public String getPath() { return path; }
        public String getContentType() { return contentType; }
        public Long getUploadedBy() { return uploadedBy; }
        public Instant getUploadedAt() { return uploadedAt; }
    }

    @Entity
    @Table(name = "customer_confirmations")
    public static class Confirmation {
        @Id @Column(name = "request_id") private Long requestId;
        @Column(nullable = false) private boolean confirmed;
        private String feedback;
        @Column(nullable = false) private Instant at = Instant.now();
        @Column(name = "confirmed_by") private Long confirmedBy;
        @Column(nullable = false) private boolean auto;

        protected Confirmation() {
        }

        public Confirmation(Long requestId, boolean confirmed, String feedback, Long confirmedBy, boolean auto) {
            this.requestId = requestId;
            this.confirmed = confirmed;
            this.feedback = feedback;
            this.confirmedBy = confirmedBy;
            this.auto = auto;
        }

        public Long getRequestId() { return requestId; }
        public boolean isConfirmed() { return confirmed; }
        public String getFeedback() { return feedback; }
        public Instant getAt() { return at; }
        public boolean isAuto() { return auto; }
    }
}
