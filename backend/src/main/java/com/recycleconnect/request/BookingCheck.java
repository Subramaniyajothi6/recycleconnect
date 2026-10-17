package com.recycleconnect.request;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;

/** Validates a date and slot against the operating rules (brief §25: no scheduling outside operational periods). */
@Component
public class BookingCheck {

    /** How far ahead an admin may book, beyond the customer horizon. */
    static final int ADMIN_HORIZON_DAYS = 60;

    private final SettingsService settings;
    private final BusinessClock clock;

    public BookingCheck(SettingsService settings, BusinessClock clock) {
        this.settings = settings;
        this.clock = clock;
    }

    /** For a customer's preferred date: inside the booking horizon. Field names match the request form. */
    public void customerPreference(LocalDate date, String slot) {
        check(date, slot, settings.rules().bookingHorizonDays(), "preferredDate", "preferredSlot");
    }

    /** For an admin booking a pickup. */
    public void adminBooking(LocalDate date, String slot) {
        check(date, slot, ADMIN_HORIZON_DAYS, "date", "slot");
    }

    private void check(LocalDate date, String slot, int horizonDays, String dateField, String slotField) {
        Rules rules = settings.rules();
        LocalDate today = clock.today();
        if (date == null) throw ApiException.field(dateField, "Pick a date.");
        if (date.isBefore(today)) throw ApiException.field(dateField, "Pick today or a later date.");
        if (date.isAfter(today.plusDays(horizonDays))) {
            throw ApiException.field(dateField, "Pick a date within the next " + horizonDays + " days.");
        }
        if (!rules.isOpen(date)) {
            throw ApiException.field(dateField, rules.closedDates().contains(date)
                    ? "We're closed on that date. Pick another day."
                    : "We don't collect on that day of the week. Pick another day.");
        }
        if (!rules.isValidSlot(slot)) throw ApiException.field(slotField, "Pick one of the time slots shown.");
        LocalDateTime start = date.atTime(Rules.slotStart(slot));
        if (!start.isAfter(clock.localNow())) throw ApiException.field(slotField, "That time has already passed. Pick a later slot.");
    }
}
