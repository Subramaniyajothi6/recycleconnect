package com.recycleconnect.notification;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.events.AccountEvent;
import com.recycleconnect.events.ComplaintEvent;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;

/**
 * Turns domain events into in-app notifications (always) and emails (when the admin turned email on and the
 * user wants it). Covers every notification in brief §22. Runs inside the transaction that caused the event,
 * so a notification exists only if the change was saved.
 */
@Service
public class NotificationService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);

    private final NotificationRepository repository;
    private final UserRepository users;
    private final EmailSender email;
    private final SettingsService settings;

    public NotificationService(NotificationRepository repository, UserRepository users, EmailSender email,
            SettingsService settings) {
        this.repository = repository;
        this.users = users;
        this.email = email;
        this.settings = settings;
    }

    public static String when(String date, String slot) {
        if (date == null || date.equals("null")) return "a date to be confirmed";
        String d = LocalDate.parse(date).format(DAY);
        return slot == null || slot.equals("null") ? d : d + ", " + slot.replace("-", " – ");
    }

    /** Creates one notification (and email if wanted). */
    @Transactional
    public void notify(Long userId, String kind, String title, String body, String link) {
        if (userId == null) return;
        repository.save(new Notification(userId, kind, title, body, link));
        if (settings.rules().emailEnabled()) {
            users.findById(userId).filter(User::isEmailNotifications)
                    .ifPresent(u -> email.send(u.getEmail(), title, body));
        }
    }

    public void notifyAdmins(String kind, String title, String body, String link) {
        for (User a : users.findByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE)) notify(a.getId(), kind, title, body, link);
    }

    @EventListener
    public void on(RequestEvent e) {
        String cu = "/customer/requests/" + e.requestId();
        String co = "/collector/assigned";
        String code = e.code();
        switch (e.type()) {
            case SUBMITTED -> notify(e.customerId(), "submitted", "Request submitted",
                    "We received " + code + " and will review it shortly.", cu);
            case ACCEPTED -> notify(e.customerId(), "accepted", "Request accepted",
                    "We accepted " + code + ". We'll book a pickup slot next.", cu);
            case REJECTED -> notify(e.customerId(), "rejected", "Request rejected",
                    code + " was rejected. Reason: " + e.detail("reason"), cu);
            case INFO_REQUESTED -> notify(e.customerId(), "info", "We need more information",
                    "About " + code + ": " + e.detail("message") + " Open the request to update it.", cu);
            case SCHEDULED -> notify(e.customerId(), "scheduled", "Pickup scheduled",
                    code + " is booked for " + when(e.detail("date"), e.detail("slot")) + ".", cu);
            case ASSIGNED -> {
                notify(e.customerId(), "assigned", "Collector assigned", e.detail("collector") + " will collect "
                        + code + " on " + when(e.detail("date"), e.detail("slot")) + ".", cu);
                notify(e.collectorId(), "assigned", "New pickup assigned", code + " on "
                        + when(e.detail("date"), e.detail("slot")) + ". Accept it so the customer knows you're coming.", co);
            }
            case UNASSIGNED -> {
                if ("true".equals(e.detail("declined"))) {
                    notifyAdmins("reassign", "Collector asked to reassign " + code,
                            "Reason: " + e.detail("reason") + ". Pick another collector.", "/admin/requests?open=" + e.requestId());
                } else {
                    notify(e.collectorId(), "unassigned", "Pickup moved", code + " is no longer assigned to you.", co);
                }
            }
            case RESCHEDULED -> {
                String body = code + " moved from " + when(e.detail("fromDate"), e.detail("fromSlot")) + " to "
                        + when(e.detail("date"), e.detail("slot")) + ". " + e.detail("reason");
                notify(e.customerId(), "rescheduled", "Pickup rescheduled", body, cu);
                notify(e.collectorId(), "rescheduled", "Pickup rescheduled", body, co);
            }
            case PICKUP_ACCEPTED -> {
                String name = users.findById(e.collectorId()).map(User::getName).orElse("Your collector");
                notify(e.customerId(), "confirmed", "Collector confirmed", name + " accepted your pickup " + code + ".", cu);
            }
            case PICKUP_STARTED -> notify(e.customerId(), "started", "Pickup started",
                    e.detail("collector") + " is on the way to your address.", cu);
            case COLLECTED -> notify(e.customerId(), "collected", "Material collected",
                    e.detail("kg") + " kg recorded for " + code + ". Check the items and confirm.", cu);
            case PICKUP_COMPLETED -> { }
            case COMPLETED -> notify(e.customerId(), "completed", "Pickup completed",
                    "auto".equals(e.detail("by")) ? code + " is now complete. Report an issue if anything was wrong."
                            : "Thank you! " + code + " is complete.", cu);
            case FAILED -> {
                notify(e.customerId(), "failed", "Pickup failed",
                        code + ": " + e.detail("reason") + ". We'll be in touch to book again.", cu);
                if (e.actorId() != null && !e.actorId().equals(e.collectorId())) {
                    notify(e.collectorId(), "failed", "Pickup marked failed", code + ": " + e.detail("reason"), co);
                }
                if (e.actorId() != null && e.actorId().equals(e.collectorId())) {
                    notifyAdmins("failed", "Pickup failed: " + code, "Reason: " + e.detail("reason") + ". Book it again or close it.",
                            "/admin/requests?open=" + e.requestId());
                }
            }
            case CANCELLED -> {
                boolean byAdmin = "admin".equals(e.detail("by"));
                notify(e.customerId(), "cancelled", "Request cancelled", byAdmin
                        ? "We cancelled " + code + ". Reason: " + e.detail("reason")
                        : "You cancelled " + code + ". Reason: " + e.detail("reason"), cu);
                notify(e.collectorId(), "cancelled", "Pickup cancelled", code + " was cancelled and removed from your list.", co);
            }
            case REMINDER -> notify(e.customerId(), "reminder", "Pickup reminder", "Your pickup " + code + " is "
                    + e.detail("when") + ". Please keep the material ready near the gate.", cu);
        }
    }

    @EventListener
    public void on(ComplaintEvent e) {
        String link = "/customer/complaints";
        switch (e.type()) {
            case RAISED -> {
                notify(e.customerId(), "complaint", "Complaint received",
                        "We received " + e.code() + ". The team replies within 2 working days.", link);
                notifyAdmins("complaint", "New complaint " + e.code(), e.message(), "/admin/complaints?open=" + e.complaintId());
            }
            case IN_REVIEW -> notify(e.customerId(), "complaint", "Complaint update",
                    e.code() + " is being reviewed. " + (e.message() == null ? "" : e.message()), link);
            case RESOLVED -> notify(e.customerId(), "complaint", "Complaint resolved",
                    e.code() + ": " + (e.message() == null ? "Resolved." : e.message()), link);
        }
    }

    @EventListener
    public void on(AccountEvent e) {
        switch (e.type()) {
            case COLLECTOR_APPROVED -> notify(e.userId(), "approved", "Your account is approved",
                    "You can now receive pickups. Check Today and Assigned for your first jobs.", "/collector");
            case COLLECTOR_REJECTED -> users.findById(e.userId()).ifPresent(u ->
                    email.send(u.getEmail(), "Your collector registration", e.message()));
            case STATUS_CHANGED -> { }
        }
    }

    // ---------- reading ----------

    public record Item(Long id, String kind, String title, String body, String link, boolean read,
            java.time.Instant at) {
    }

    public record Inbox(long unread, List<Item> items) {
    }

    @Transactional(readOnly = true)
    public Inbox inbox(User user, int limit) {
        var list = repository.findByUserIdOrderByCreatedAtDescIdDesc(user.getId(), PageRequest.of(0, Math.min(Math.max(limit, 1), 100)));
        return new Inbox(repository.countByUserIdAndReadAtIsNull(user.getId()), list.stream()
                .map(n -> new Item(n.getId(), n.getKind(), n.getTitle(), n.getBody(), n.getLink(), n.getReadAt() != null,
                        n.getCreatedAt())).toList());
    }

    @Transactional
    public void markRead(User user, Long id) {
        repository.findByIdAndUserId(id, user.getId()).ifPresent(Notification::markRead);
    }

    @Transactional
    public void markAllRead(User user) {
        repository.markAllRead(user.getId(), java.time.Instant.now());
    }
}
