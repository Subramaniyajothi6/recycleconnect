package com.recycleconnect.common;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.stereotype.Component;

import com.recycleconnect.settings.SettingsService;

/**
 * "Now" in the service's local time zone (a setting, Asia/Kolkata by default). All business dates
 * (today's pickups, cut-offs, reminders) use this, never the server's own zone.
 * Tests can replace the underlying java.time.Clock bean to freeze time.
 */
@Component
public class BusinessClock {

    private final java.time.Clock base;
    private final SettingsService settings;

    public BusinessClock(java.time.Clock base, SettingsService settings) {
        this.base = base;
        this.settings = settings;
    }

    public ZoneId zone() {
        return settings.rules().zone();
    }

    public Instant now() {
        return base.instant();
    }

    public LocalDateTime localNow() {
        return LocalDateTime.ofInstant(base.instant(), zone());
    }

    public LocalDate today() {
        return localNow().toLocalDate();
    }
}
