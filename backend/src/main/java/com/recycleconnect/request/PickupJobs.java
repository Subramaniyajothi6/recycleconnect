package com.recycleconnect.request;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.notification.NotificationRepository;
import com.recycleconnect.notification.NotificationService;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.UserRepository;

/**
 * Background jobs, all in the service's local time zone:
 * pickup reminders (brief §22), completing collected requests the customer never confirmed,
 * the admins' morning notice about overdue pickups, and removing old drafts.
 * With several backend instances, add a shared lock (docs/EXTENDING.md).
 */
@Component
public class PickupJobs {

    private static final Logger log = LoggerFactory.getLogger(PickupJobs.class);

    private final PickupRepository pickups;
    private final CollectionRequestRepository requests;
    private final ConfirmationRepository confirmations;
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final RequestWorkflow workflow;
    private final SettingsService settings;
    private final BusinessClock clock;
    private final NotificationService notifier;
    private final NamedParameterJdbcTemplate jdbc;

    public PickupJobs(PickupRepository pickups, CollectionRequestRepository requests,
            ConfirmationRepository confirmations, NotificationRepository notifications, UserRepository users,
            RequestWorkflow workflow, SettingsService settings, BusinessClock clock, NotificationService notifier,
            NamedParameterJdbcTemplate jdbc) {
        this.pickups = pickups;
        this.requests = requests;
        this.confirmations = confirmations;
        this.notifications = notifications;
        this.users = users;
        this.workflow = workflow;
        this.settings = settings;
        this.clock = clock;
        this.notifier = notifier;
        this.jdbc = jdbc;
    }

    /** Every 15 minutes: send the reminders that fall due in this window (each one only once). */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void reminders() {
        Rules rules = settings.rules();
        LocalDateTime now = clock.localNow();
        switch (rules.reminder()) {
            case OFF -> { }
            case EVENING_BEFORE_1800 -> {
                if (!now.toLocalTime().isBefore(LocalTime.of(18, 0)) && now.toLocalTime().isBefore(LocalTime.of(18, 15))) {
                    remindFor(now.toLocalDate().plusDays(1), null, now);
                }
            }
            case HOURS_BEFORE_2 -> remindFor(now.toLocalDate(), now, now);
        }
    }

    int remindFor(LocalDate date, LocalDateTime windowStart, LocalDateTime now) {
        int sent = 0;
        Instant dedupeAfter = clock.now().minus(Duration.ofDays(2));
        for (Pickup p : pickups.findByScheduledDateAndActiveTrue(date)) {
            if (p.getStatus().isFinished() || p.getStatus().isUnderway()) continue;
            if (windowStart != null) {
                LocalDateTime due = date.atTime(Rules.slotStart(p.getSlot())).minusHours(2);
                if (due.isBefore(windowStart) || !due.isBefore(windowStart.plusMinutes(15))) continue;
            }
            CollectionRequest r = requests.findById(p.getRequestId()).orElse(null);
            if (r == null) continue;
            String link = "/customer/requests/" + r.getId();
            boolean wants = users.findById(r.getCustomerId()).map(u -> u.isReminderEnabled()).orElse(false);
            if (!wants || notifications.existsByUserIdAndKindAndLinkAndCreatedAtAfter(r.getCustomerId(), "reminder", link, dedupeAfter)) {
                continue;
            }
            String when = (windowStart == null ? "tomorrow, " : "today, ") + NotificationService.when(date.toString(), p.getSlot());
            workflow.publish(RequestEvent.Type.REMINDER, r, p.getCollectorId(), null, Map.of("when", when));
            sent++;
        }
        if (sent > 0) log.info("Sent {} pickup reminders for {}", sent, date);
        return sent;
    }

    /** Hourly: a collected request the customer hasn't confirmed completes after the configured hours. */
    @Scheduled(cron = "0 5 * * * *")
    @Transactional
    public void autoComplete() {
        int hours = settings.rules().autoCompleteHours();
        Instant cutoff = clock.now().minus(Duration.ofHours(hours));
        for (CollectionRequest r : requests.findByStatusAndUpdatedAtBefore(RequestStatus.COLLECTED, cutoff)) {
            if (!confirmations.existsById(r.getId())) {
                confirmations.save(new RequestRecords.Confirmation(r.getId(), true, null, null, true));
            }
            Long collectorId = pickups.findByRequestIdAndActiveTrue(r.getId()).map(Pickup::getCollectorId).orElse(null);
            workflow.move(r, RequestStatus.COMPLETED, null, "Completed automatically after " + hours + " hours",
                    RequestEvent.Type.COMPLETED, collectorId, Map.of("by", "auto"));
            r.markCompleted();
        }
    }

    /** Daily at 08:00 business time: tell the admins how many pickups are overdue, so missed pickups get rebooked. */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void overdueNotice() {
        if (clock.localNow().getHour() != 8) return;
        long n = overdueCount();
        if (n == 0) return;
        notifier.notifyAdmins("overdue", n == 1 ? "1 pickup is overdue" : n + " pickups are overdue",
                "The booked time has passed and nothing was collected. Reschedule, reassign or mark them failed.",
                "/admin/requests?tab=OVERDUE");
        log.info("Overdue pickups: {}", n);
    }

    long overdueCount() {
        var p = new MapSqlParameterSource("nowLocal", clock.localNow()).addValue("today", clock.today());
        Long n = jdbc.queryForObject("select count(*) from collection_requests r where" + Overdue.SQL, p, Long.class);
        return n == null ? 0 : n;
    }

    /** Daily: drafts nobody touched for the configured days are removed (the design promises 30 days). */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void removeOldDrafts() {
        Instant cutoff = clock.now().minus(Duration.ofDays(settings.rules().draftKeepDays()));
        var old = requests.findByStatusAndUpdatedAtBefore(RequestStatus.DRAFT, cutoff);
        requests.deleteAll(old);
        if (!old.isEmpty()) log.info("Removed {} old drafts", old.size());
    }
}
