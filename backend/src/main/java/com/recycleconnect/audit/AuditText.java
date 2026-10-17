package com.recycleconnect.audit;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Audit entries in plain words, shared by the audit screen and its Excel download. The stored details stay as
 * they were written (raw codes); only the wording shown to people changes here.
 */
public final class AuditText {

    private AuditText() {
    }

    /** Request and pickup statuses as people say them. */
    private static final Map<String, String> STATUS = Map.ofEntries(
            Map.entry("DRAFT", "Draft"), Map.entry("SUBMITTED", "Submitted"), Map.entry("UNDER_REVIEW", "Under review"),
            Map.entry("INFO_REQUESTED", "More info needed"), Map.entry("ACCEPTED", "Accepted"),
            Map.entry("REJECTED", "Rejected"), Map.entry("SCHEDULED", "Scheduled"),
            Map.entry("ASSIGNED", "Collector assigned"), Map.entry("PICKUP_STARTED", "Pickup started"),
            Map.entry("COLLECTED", "Collected"), Map.entry("COMPLETED", "Completed"), Map.entry("CANCELLED", "Cancelled"),
            Map.entry("FAILED", "Failed"), Map.entry("ON_THE_WAY", "On the way"), Map.entry("ARRIVED", "Arrived"),
            Map.entry("COLLECTION_STARTED", "Collection started"));

    private static final Map<String, String> KEY = Map.ofEntries(
            Map.entry("note", "Note"), Map.entry("reason", "Reason"), Map.entry("collector", "Collector"),
            Map.entry("rows", "Rows"), Map.entry("format", "Format"), Map.entry("name", "Name"),
            Map.entry("email", "Email"), Map.entry("text", "Item"), Map.entry("zones", "Areas"));

    private static final Map<String, String> RESOLUTION = Map.of(
            "EXPLAINED", "explained, no change", "QUANTITY_CORRECTED", "quantity corrected",
            "COLLECTOR_STATEMENT", "collector statement", "OTHER", "other");

    private static final Set<String> HANDLED = Set.of("from", "to", "date", "slot");
    /** Addresses that mean "the same machine as the server" (local testing), shown as words instead of "::1". */
    private static final Set<String> LOCAL_IPS = Set.of("::1", "0:0:0:0:0:0:0:1", "127.0.0.1", "::ffff:127.0.0.1");
    private static final Pattern TRAILING_ZEROS = Pattern.compile("\\b(\\d+)\\.(\\d*?)0+\\b");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);

    /** "REQUEST_PICKUP_STARTED" → "Pickup started", "APPROVE_COLLECTOR" → "Approve collector". */
    public static String action(String code) {
        String s = code.replaceFirst("^REQUEST_", "").replace('_', ' ').toLowerCase(Locale.ROOT);
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** One readable line, e.g. "Scheduled → Collector assigned. Fri 9 Oct, 14:00 – 16:00. Collector: Murugan Kannan". */
    public static String details(Map<String, Object> d) {
        if (d == null || d.isEmpty()) return "";
        List<String> parts = new ArrayList<>();
        Object from = d.get("from"), to = d.get("to"), collector = d.get("collector");
        // Same status on both sides means something else changed: with a collector named, the collector was swapped.
        boolean swapped = from != null && from.equals(to) && collector != null;
        if (swapped) parts.add("Collector changed to " + collector);
        else if (from != null && to != null && !from.equals(to)) parts.add(status(from) + " → " + status(to));
        Object date = d.get("date"), slot = d.get("slot");
        if (date instanceof String ds) parts.add(day(ds) + (slot instanceof String ss ? ", " + ss.replace("-", " – ") : ""));
        for (Map.Entry<String, Object> e : d.entrySet()) {
            String k = e.getKey();
            Object v = e.getValue();
            if (HANDLED.contains(k) || v == null || "".equals(v)) continue;
            if (swapped && k.equals("collector")) continue;
            // A note that only repeats the collector or the booked slot adds nothing.
            if (k.equals("note") && (v.equals(d.get("collector")) || v.equals(date + " " + slot))) continue;
            switch (k) {
                case "resolution" -> parts.add("Resolution: " + RESOLUTION.getOrDefault(String.valueOf(v), value(v)));
                case "kg" -> parts.add("Collected: " + value(v) + " kg");
                case "role" -> parts.add("Role: " + String.valueOf(v).toLowerCase(Locale.ROOT));
                case "ip" -> parts.add("IP address: " + (LOCAL_IPS.contains(String.valueOf(v)) ? "this computer" : v));
                default -> parts.add(KEY.getOrDefault(k, k) + ": " + value(v));
            }
        }
        return String.join(". ", parts);
    }

    private static String status(Object v) {
        return STATUS.getOrDefault(String.valueOf(v), String.valueOf(v));
    }

    private static String day(String iso) {
        try {
            return LocalDate.parse(iso.substring(0, 10)).format(DAY);
        } catch (RuntimeException e) {
            return iso;
        }
    }

    /** Stored values in plain words: "13.4 KG" → "13.4 kg", "13.40 -> 14" → "13.4 → 14". */
    static String value(Object v) {
        String s = v instanceof Collection<?> c ? String.join(", ", c.stream().map(String::valueOf).toList()) : String.valueOf(v);
        s = TRAILING_ZEROS.matcher(s).replaceAll(m -> m.group(2).isEmpty() ? m.group(1) : m.group(1) + "." + m.group(2));
        return s.replaceAll(" ?-> ?", " → ").replaceAll("\\bKG\\b", "kg").replaceAll("\\bPCS\\b", "pcs");
    }
}
