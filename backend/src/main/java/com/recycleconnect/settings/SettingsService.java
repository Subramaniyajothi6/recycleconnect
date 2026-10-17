package com.recycleconnect.settings;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.user.User;

/**
 * Reads and updates the admin settings. Parsed rules are cached and refreshed after every update,
 * so booking checks don't hit the database. With several backend instances the cache is per instance
 * and refreshes on the next update or restart (see docs/EXTENDING.md).
 */
@Service
public class SettingsService {

    private static final Map<String, DayOfWeek> DAY = Map.of(
            "MON", DayOfWeek.MONDAY, "TUE", DayOfWeek.TUESDAY, "WED", DayOfWeek.WEDNESDAY, "THU", DayOfWeek.THURSDAY,
            "FRI", DayOfWeek.FRIDAY, "SAT", DayOfWeek.SATURDAY, "SUN", DayOfWeek.SUNDAY);

    private final SettingRepository repository;
    private final AuditService audit;
    private volatile Rules cached;

    public SettingsService(SettingRepository repository, AuditService audit) {
        this.repository = repository;
        this.audit = audit;
    }

    public Rules rules() {
        Rules r = cached;
        if (r == null) {
            r = parse(raw());
            cached = r;
        }
        return r;
    }

    public Map<String, String> raw() {
        Map<String, String> m = new LinkedHashMap<>();
        repository.findAll().forEach(s -> m.put(s.getKey(), s.getValue()));
        return m;
    }

    /** Validates every value first, then saves the changed ones and writes each change to the audit log. */
    @Transactional
    public Map<String, String> update(User admin, Map<String, String> changes) {
        Map<String, String> current = raw();
        Map<String, String> merged = new LinkedHashMap<>(current);
        for (var e : changes.entrySet()) {
            if (!current.containsKey(e.getKey())) {
                throw ApiException.field(e.getKey(), "Unknown setting.");
            }
            merged.put(e.getKey(), e.getValue() == null ? "" : e.getValue().trim());
        }
        parse(merged); // throws a field error if anything is invalid
        for (var e : changes.entrySet()) {
            String before = current.get(e.getKey());
            String after = merged.get(e.getKey());
            if (!after.equals(before)) {
                Setting s = repository.findById(e.getKey()).orElseThrow();
                s.setValue(after);
                audit.record(admin, "CHANGE_SETTING", "setting", e.getKey(), Map.of("from", before, "to", after));
            }
        }
        cached = null;
        return raw();
    }

    static Rules parse(Map<String, String> s) {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        for (String d : get(s, "working_days").split(",")) {
            if (!d.isBlank()) {
                DayOfWeek day = DAY.get(d.trim().toUpperCase());
                if (day == null) throw ApiException.field("working_days", "Use day names like MON,TUE.");
                days.add(day);
            }
        }
        if (days.isEmpty()) throw ApiException.field("working_days", "Pick at least one working day.");
        LocalTime open = time(s, "open_time");
        LocalTime close = time(s, "close_time");
        if (!close.isAfter(open)) throw ApiException.field("close_time", "Closing time must be after opening time.");
        int slot = number(s, "slot_minutes", 30, 240);
        if (slot > java.time.Duration.between(open, close).toMinutes()) {
            throw ApiException.field("slot_minutes", "A slot can't be longer than the working day.");
        }
        Set<LocalDate> closed = new TreeSet<>();
        for (String d : get(s, "closed_dates").split(",")) {
            if (!d.isBlank()) {
                try {
                    closed.add(LocalDate.parse(d.trim()));
                } catch (DateTimeParseException e) {
                    throw ApiException.field("closed_dates", "Write dates as YYYY-MM-DD, separated by commas.");
                }
            }
        }
        return new Rules(days, open, close, slot, closed,
                choice(s, "cancel_cutoff", Rules.CancelCutoff.class),
                number(s, "collector_daily_capacity", 1, 50),
                number(s, "booking_horizon_days", 1, 90),
                bool(s, "photo_required"),
                bool(s, "email_enabled"),
                choice(s, "reminder", Rules.Reminder.class),
                zone(s),
                number(s, "auto_complete_hours", 1, 720),
                number(s, "max_upload_mb", 1, 20),
                number(s, "draft_keep_days", 1, 365));
    }

    private static String get(Map<String, String> s, String key) {
        String v = s.get(key);
        if (v == null) throw new IllegalStateException("Missing setting " + key);
        return v;
    }

    private static LocalTime time(Map<String, String> s, String key) {
        try {
            return LocalTime.parse(get(s, key));
        } catch (DateTimeParseException e) {
            throw ApiException.field(key, "Use a time like 08:00.");
        }
    }

    private static int number(Map<String, String> s, String key, int min, int max) {
        try {
            int n = Integer.parseInt(get(s, key));
            if (n < min || n > max) throw ApiException.field(key, "Use a number from " + min + " to " + max + ".");
            return n;
        } catch (NumberFormatException e) {
            throw ApiException.field(key, "Use a whole number.");
        }
    }

    private static boolean bool(Map<String, String> s, String key) {
        String v = get(s, key);
        if (!v.equals("true") && !v.equals("false")) throw ApiException.field(key, "Use true or false.");
        return Boolean.parseBoolean(v);
    }

    private static <E extends Enum<E>> E choice(Map<String, String> s, String key, Class<E> type) {
        try {
            return Enum.valueOf(type, get(s, key));
        } catch (IllegalArgumentException e) {
            throw ApiException.field(key, "Pick one of: " + Arrays.stream(type.getEnumConstants())
                    .map(Enum::name).collect(Collectors.joining(", ")) + ".");
        }
    }

    private static ZoneId zone(Map<String, String> s) {
        try {
            return ZoneId.of(get(s, "timezone"));
        } catch (Exception e) {
            throw ApiException.field("timezone", "Use a time zone like Asia/Kolkata.");
        }
    }
}
