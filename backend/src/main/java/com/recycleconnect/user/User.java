package com.recycleconnect.user;

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
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String name;

    /** Lower-case. Optional for collectors. */
    private String email;

    /** Ten digits, no country code. */
    @Column(nullable = false)
    private String mobile;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "preferred_language", nullable = false)
    private String preferredLanguage = "en";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Part of every token; bumping it signs the user out everywhere (password change, block). */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;

    @Column(name = "reminder_enabled", nullable = false)
    private boolean reminderEnabled = true;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Version
    private long version;

    protected User() {
    }

    public User(Role role, String name, String email, String mobile, String passwordHash, UserStatus status) {
        this.role = role;
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.passwordHash = passwordHash;
        this.status = status;
    }

    public Long getId() { return id; }
    public Role getRole() { return role; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getMobile() { return mobile; }
    public String getPasswordHash() { return passwordHash; }
    public UserStatus getStatus() { return status; }
    public String getPreferredLanguage() { return preferredLanguage; }
    public Instant getCreatedAt() { return createdAt; }
    public int getTokenVersion() { return tokenVersion; }
    public boolean isEmailNotifications() { return emailNotifications; }
    public boolean isReminderEnabled() { return reminderEnabled; }
    public Instant getLastLoginAt() { return lastLoginAt; }

    public boolean isActive() { return status == UserStatus.ACTIVE; }

    public void setStatus(UserStatus status) { this.status = status; }
    public void setName(String name) { this.name = name; }
    public void setEmail(String email) { this.email = email; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
    public void setEmailNotifications(boolean emailNotifications) { this.emailNotifications = emailNotifications; }
    public void setReminderEnabled(boolean reminderEnabled) { this.reminderEnabled = reminderEnabled; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public void changePassword(String newHash) {
        this.passwordHash = newHash;
        this.tokenVersion++;
    }

    /** Invalidates every token issued so far. */
    public void revokeTokens() {
        this.tokenVersion++;
    }
}
