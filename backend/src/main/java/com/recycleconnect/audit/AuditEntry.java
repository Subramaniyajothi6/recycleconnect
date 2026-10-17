package com.recycleconnect.audit;

import java.time.Instant;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One row of the append-only audit log. Never updated or deleted. */
@Entity
@Table(name = "audit_log")
public class AuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Instant at = Instant.now();

    @Column(name = "user_id", updatable = false)
    private Long userId;

    @Column(updatable = false)
    private String role;

    @Column(nullable = false, updatable = false)
    private String action;

    @Column(nullable = false, updatable = false)
    private String entity;

    @Column(name = "entity_id", updatable = false)
    private String entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(updatable = false)
    private Map<String, Object> details;

    protected AuditEntry() {
    }

    public AuditEntry(Long userId, String role, String action, String entity, String entityId,
            Map<String, Object> details) {
        this.userId = userId;
        this.role = role;
        this.action = action;
        this.entity = entity;
        this.entityId = entityId;
        this.details = details;
    }

    public Long getId() { return id; }
    public Instant getAt() { return at; }
    public Long getUserId() { return userId; }
    public String getRole() { return role; }
    public String getAction() { return action; }
    public String getEntity() { return entity; }
    public String getEntityId() { return entityId; }
    public Map<String, Object> getDetails() { return details; }
}
