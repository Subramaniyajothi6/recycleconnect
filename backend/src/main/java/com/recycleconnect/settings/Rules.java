package com.recycleconnect.settings;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * The admin-editable rules (DECISIONS P6), parsed and typed. Slots are written as {@code 08:00-10:00}.
 * Everything that decides "can this be booked / cancelled" goes through here.
 */
public record Rules(
        Set<DayOfWeek> workingDays,
        LocalTime openTime,
        LocalTime closeTime,
        int slotMinutes,
        Set<LocalDate> closedDates,
        CancelCutoff cancelCutoff,
        int collectorDailyCapacity,
        int bookingHorizonDays,
        boolean photoRequired,
        boolean emailEnabled,
        Reminder reminder,
        ZoneId zone,
        int autoCompleteHours,
        int maxUploadMb,
        int draftKeepDays) {

    public enum CancelCutoff { DAY_BEFORE_1800, HOURS_BEFORE_2, SLOT_START }

    public enum Reminder { EVENING_BEFORE_1800, HOURS_BEFORE_2, OFF }

    /** Slots generated from opening hours, e.g. 08:00-10:00 ... 16:00-18:00. */
    public List<String> slots() {
        List<String> out = new ArrayList<>();
        LocalTime t = openTime;
        while (!t.plusMinutes(slotMinutes).isAfter(closeTime) && t.plusMinutes(slotMinutes).isAfter(t)) {
            out.add(slot(t, t.plusMinutes(slotMinutes)));
            t = t.plusMinutes(slotMinutes);
        }
        return out;
    }

    public static String slot(LocalTime from, LocalTime to) {
        return from + "-" + to;
    }

    public static LocalTime slotStart(String slot) {
        return LocalTime.parse(slot.substring(0, 5));
    }

    public static LocalTime slotEnd(String slot) {
        return LocalTime.parse(slot.substring(6, 11));
    }

    public boolean isValidSlot(String slot) {
        return slot != null && slots().contains(slot);
    }

    /** Open for pickups on this date: a working weekday and not a closed date. */
    public boolean isOpen(LocalDate date) {
        return workingDays.contains(date.getDayOfWeek()) && !closedDates.contains(date);
    }

    /** The last moment a customer may cancel a pickup on this date and slot. */
    public LocalDateTime cancelDeadline(LocalDate date, String slot) {
        return switch (cancelCutoff) {
            case DAY_BEFORE_1800 -> date.minusDays(1).atTime(18, 0);
            case HOURS_BEFORE_2 -> date.atTime(slotStart(slot)).minusHours(2);
            case SLOT_START -> date.atTime(slotStart(slot));
        };
    }
}
