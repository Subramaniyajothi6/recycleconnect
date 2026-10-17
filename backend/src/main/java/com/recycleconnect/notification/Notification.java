package com.recycleconnect.notification;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    /** What happened, e.g. ASSIGNED, RESCHEDULED, FAILED. The app picks an icon from it. */
    @Column(nullable = false, updatable = false)
    private String kind;

    @Column(nullable = false, updatable = false)
    private String title;

    @Column(updatable = false)
    private String body;

    /** In-app path to open, e.g. /customer/requests/12. */
    @Column(updatable = false)
    private String link;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {
    }

    public Notification(Long userId, String kind, String title, String body, String link) {
        this.userId = userId;
        this.kind = kind;
        this.title = title;
        this.body = body;
        this.link = link;
    }

    public void markRead() {
        if (readAt == null) readAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getKind() { return kind; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getLink() { return link; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
}
