package com.recycleconnect.request;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.recycleconnect.admin.ReportService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.settings.Rules;

/** Pure rules, no database: state machines, slots, cut-offs and safe CSV. */
class RulesTests {

    @Test
    void requestStateMachineAllowsOnlyLegalMoves() {
        assertThat(RequestStatus.DRAFT.canMoveTo(RequestStatus.SUBMITTED)).isTrue();
        assertThat(RequestStatus.SUBMITTED.canMoveTo(RequestStatus.ACCEPTED)).isTrue();
        assertThat(RequestStatus.ACCEPTED.canMoveTo(RequestStatus.SCHEDULED)).isTrue();
        assertThat(RequestStatus.SCHEDULED.canMoveTo(RequestStatus.ASSIGNED)).isTrue();
        assertThat(RequestStatus.ASSIGNED.canMoveTo(RequestStatus.PICKUP_STARTED)).isTrue();
        assertThat(RequestStatus.PICKUP_STARTED.canMoveTo(RequestStatus.COLLECTED)).isTrue();
        assertThat(RequestStatus.COLLECTED.canMoveTo(RequestStatus.COMPLETED)).isTrue();
        assertThat(RequestStatus.FAILED.canMoveTo(RequestStatus.SCHEDULED)).isTrue();

        assertThat(RequestStatus.DRAFT.canMoveTo(RequestStatus.ACCEPTED)).isFalse();
        assertThat(RequestStatus.SUBMITTED.canMoveTo(RequestStatus.ASSIGNED)).isFalse();
        assertThat(RequestStatus.COLLECTED.canMoveTo(RequestStatus.CANCELLED)).isFalse();
        for (RequestStatus s : RequestStatus.values()) {
            assertThat(RequestStatus.COMPLETED.canMoveTo(s)).isFalse();
            assertThat(RequestStatus.CANCELLED.canMoveTo(s)).isFalse();
            assertThat(RequestStatus.REJECTED.canMoveTo(s)).isFalse();
        }
    }

    @Test
    void pickupStepsGoInOrder() {
        assertThat(PickupStatus.ASSIGNED.canMoveTo(PickupStatus.ACCEPTED)).isTrue();
        assertThat(PickupStatus.ASSIGNED.canMoveTo(PickupStatus.ON_THE_WAY)).isFalse();
        assertThat(PickupStatus.ARRIVED.canMoveTo(PickupStatus.COLLECTION_STARTED)).isTrue();
        assertThat(PickupStatus.COLLECTED.canMoveTo(PickupStatus.FAILED)).isFalse();
        assertThat(PickupStatus.COMPLETED.canMoveTo(PickupStatus.FAILED)).isFalse();
    }

    private static Map<String, String> defaults() {
        Map<String, String> s = new LinkedHashMap<>();
        s.put("working_days", "MON,TUE,WED,THU,FRI,SAT");
        s.put("open_time", "08:00");
        s.put("close_time", "18:00");
        s.put("slot_minutes", "120");
        s.put("closed_dates", "2031-03-05");
        s.put("cancel_cutoff", "DAY_BEFORE_1800");
        s.put("collector_daily_capacity", "8");
        s.put("booking_horizon_days", "14");
        s.put("photo_required", "false");
        s.put("email_enabled", "false");
        s.put("reminder", "EVENING_BEFORE_1800");
        s.put("timezone", "Asia/Kolkata");
        s.put("auto_complete_hours", "48");
        s.put("max_upload_mb", "5");
        s.put("draft_keep_days", "30");
        return s;
    }

    private static Rules parse(Map<String, String> s) throws Exception {
        var m = com.recycleconnect.settings.SettingsService.class.getDeclaredMethod("parse", Map.class);
        m.setAccessible(true);
        try {
            return (Rules) m.invoke(null, s);
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    @Test
    void slotsAndOpenDaysFollowTheSettings() throws Exception {
        Rules r = parse(defaults());
        assertThat(r.slots()).containsExactly("08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00");
        assertThat(r.isOpen(LocalDate.of(2031, 3, 3))).isTrue(); // Monday
        assertThat(r.isOpen(LocalDate.of(2031, 3, 9))).isFalse(); // Sunday
        assertThat(r.isOpen(LocalDate.of(2031, 3, 5))).isFalse(); // closed date
        assertThat(r.workingDays()).doesNotContain(DayOfWeek.SUNDAY);
        assertThat(r.cancelDeadline(LocalDate.of(2031, 3, 4), "10:00-12:00")).isEqualTo(LocalDateTime.of(2031, 3, 3, 18, 0));
    }

    @Test
    void badSettingsAreRejectedWithAFieldMessage() {
        Map<String, String> s = defaults();
        s.put("close_time", "07:00");
        assertThatThrownBy(() -> parse(s)).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getFields()).containsKey("close_time"));
        Map<String, String> s2 = defaults();
        s2.put("working_days", "");
        assertThatThrownBy(() -> parse(s2)).isInstanceOf(ApiException.class);
        Map<String, String> s3 = defaults();
        s3.put("cancel_cutoff", "WHENEVER");
        assertThatThrownBy(() -> parse(s3)).isInstanceOf(ApiException.class);
    }

    @Test
    void csvNeutralisesFormulasAndQuotes() {
        byte[] out = ReportService.csv(List.of("Name", "Note"),
                List.of(List.of("=HYPERLINK(\"http://evil\")", "a,b"), List.of("@SUM(A1)", "plain")), null);
        String text = new String(out, java.nio.charset.StandardCharsets.UTF_8);
        assertThat(text).contains("\"'=HYPERLINK(\"\"http://evil\"\")\"").contains("'@SUM(A1)").contains("\"a,b\"");
    }

    @Test
    void phoneNumbersAreMaskedForLists() {
        assertThat(RequestViews.mask("9840012345")).isEqualTo("+91 98••• ••345");
        assertThat(RequestViews.full("9840012345")).isEqualTo("+91 98400 12345");
    }

    @Test
    void overdueMeansTheBookedSlotEndedWithoutACollection() {
        LocalDate fri = LocalDate.of(2031, 3, 7);
        CollectionRequest r = new CollectionRequest("RC-31-000001", 1L);
        r.setSchedule(fri, "14:00-16:00");
        LocalDateTime during = fri.atTime(15, 0), after = fri.atTime(16, 1), nextDay = fri.plusDays(1).atTime(9, 0);

        r.setStatus(RequestStatus.ASSIGNED);
        assertThat(Overdue.is(r, during)).isFalse();
        assertThat(Overdue.is(r, after)).isTrue();
        r.setStatus(RequestStatus.SCHEDULED);
        assertThat(Overdue.is(r, after)).isTrue();
        // A trip under way is late only once the day is over.
        r.setStatus(RequestStatus.PICKUP_STARTED);
        assertThat(Overdue.is(r, after)).isFalse();
        assertThat(Overdue.is(r, nextDay)).isTrue();
        // Collected, finished or never booked: never overdue.
        for (RequestStatus s : List.of(RequestStatus.COLLECTED, RequestStatus.COMPLETED, RequestStatus.FAILED, RequestStatus.CANCELLED)) {
            r.setStatus(s);
            assertThat(Overdue.is(r, nextDay)).isFalse();
        }
        CollectionRequest unbooked = new CollectionRequest("RC-31-000002", 1L);
        unbooked.setStatus(RequestStatus.ACCEPTED);
        assertThat(Overdue.is(unbooked, nextDay)).isFalse();
    }
}
