package com.recycleconnect.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.audit.AuditText;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.request.AdminRequestService;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

/** Dashboard, analytics, reports and the audit log. Admin only (URL rule in SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminInsightsController {

    /** {@code summary} is {@code details} in plain words ({@link AuditText}); the screen and the Excel file both use it. */
    public record AuditRow(Long id, Instant at, String who, String role, String action, String entity, String entityId,
            Map<String, Object> details, String summary) {
    }

    public record AuditPage(List<AuditRow> rows, long total, int page, int size) {
    }

    public record RecentExport(Instant at, String who, String report, String format) {
    }

    private final AnalyticsService analytics;
    private final ReportService reports;
    private final NamedParameterJdbcTemplate jdbc;
    private final AuditService audit;
    private final BusinessClock clock;
    private final tools.jackson.databind.ObjectMapper json;

    public AdminInsightsController(AnalyticsService analytics, ReportService reports, NamedParameterJdbcTemplate jdbc,
            AuditService audit, BusinessClock clock, tools.jackson.databind.ObjectMapper json) {
        this.analytics = analytics;
        this.reports = reports;
        this.jdbc = jdbc;
        this.audit = audit;
        this.clock = clock;
        this.json = json;
    }

    @GetMapping("/dashboard")
    public AnalyticsService.Dashboard dashboard(@RequestParam(required = false) String month) {
        return analytics.dashboard(month == null || month.isBlank() ? null : parseMonth(month));
    }

    @GetMapping("/analytics")
    public AnalyticsService.Analytics analytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long zoneId, @RequestParam(required = false) String customerType,
            @RequestParam(required = false) Long categoryId) {
        return analytics.analytics(new AnalyticsService.Filters(from, to, zoneId, customerType, categoryId));
    }

    @GetMapping("/reports/{type}")
    public ReportService.Table report(@PathVariable ReportService.Type type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long zoneId, @RequestParam(required = false) Long categoryId) {
        return reports.build(type, new ReportService.Filters(from, to, zoneId, categoryId));
    }

    @GetMapping("/reports/{type}/export")
    public ResponseEntity<byte[]> export(@CurrentUser User me, @PathVariable ReportService.Type type,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long zoneId, @RequestParam(required = false) Long categoryId) {
        ReportService.File f = reports.export(me, type, new ReportService.Filters(from, to, zoneId, categoryId), format);
        return file(f.name(), f.contentType(), f.bytes());
    }

    @GetMapping("/reports/recent-exports")
    public List<RecentExport> recentExports() {
        return jdbc.query("""
                select a.at, coalesce(u.name, 'System'), a.entity_id, a.details ->> 'format'
                from audit_log a left join users u on u.id = a.user_id
                where a.action = 'EXPORT_REPORT' order by a.at desc limit 8""", Map.of(),
                (rs, n) -> new RecentExport(rs.getTimestamp(1).toInstant(), rs.getString(2), rs.getString(3), rs.getString(4)));
    }

    // ---------- audit log ----------

    @GetMapping("/audit")
    public AuditPage audit(@RequestParam(required = false) String q, @RequestParam(required = false) String role,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        MapSqlParameterSource p = new MapSqlParameterSource("tz", clock.zone().getId());
        String where = auditWhere(q, role, action, from, to, p);
        int sz = Math.min(Math.max(size, 1), 200);
        long total = jdbc.queryForObject("select count(*) from audit_log a left join users u on u.id = a.user_id" + where, p, Long.class);
        p.addValue("limit", sz).addValue("offset", (long) Math.max(page, 0) * sz);
        List<AuditRow> rows = jdbc.query("select a.id, a.at, coalesce(u.name, 'System'), coalesce(a.role, 'SYSTEM'), a.action,"
                + " a.entity, " + AUDIT_ON + ", a.details::text from audit_log a left join users u on u.id = a.user_id"
                + AUDIT_TARGET + where
                + " order by a.at desc, a.id desc limit :limit offset :offset", p, (rs, n) -> {
                    Map<String, Object> d = details(rs.getString(8));
                    return new AuditRow(rs.getLong(1), rs.getTimestamp(2).toInstant(), rs.getString(3), rs.getString(4),
                            rs.getString(5), rs.getString(6), rs.getString(7), d, AuditText.details(d));
                });
        return new AuditPage(rows, total, page, sz);
    }

    @GetMapping("/audit/export")
    public ResponseEntity<byte[]> auditExport(@CurrentUser User me, @RequestParam(required = false) String q,
            @RequestParam(required = false) String role, @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "xlsx") String format) {
        if (!format.equals("xlsx") && !format.equals("csv")) throw ApiException.badRequest("Pick Excel or CSV.");
        MapSqlParameterSource p = new MapSqlParameterSource("tz", clock.zone().getId());
        String where = auditWhere(q, role, action, from, to, p);
        // Columns 1-7 are the raw stored values (the CSV); column 8 is the readable "On" for the Excel file.
        List<List<Object>> rows = jdbc.query("select to_char(a.at at time zone :tz, 'YYYY-MM-DD HH24:MI:SS'),"
                + " coalesce(u.name, 'System'), coalesce(a.role, 'SYSTEM'), a.action, a.entity, a.entity_id, a.details::text, "
                + AUDIT_ON + " from audit_log a left join users u on u.id = a.user_id" + AUDIT_TARGET + where
                + " order by a.at desc limit 50000", p,
                (rs, n) -> {
                    List<Object> r = new ArrayList<>();
                    for (int c = 1; c <= 8; c++) r.add(rs.getString(c));
                    return r;
                });
        audit.recordStandalone(me, "EXPORT_AUDIT", "audit", null, Map.of("rows", rows.size(), "format", format));
        String base = "audit-log_" + clock.today();
        if (format.equals("csv")) {
            // For other software: the stored values, unchanged.
            return file(base + ".csv", "text/csv; charset=utf-8", ReportService.csv(
                    List.of("Time", "Who", "Role", "Action", "Entity", "Entity ID", "Details"), rows.stream().map(r -> r.subList(0, 7)).toList(), null));
        }
        // For people: the same plain wording as the audit screen.
        List<List<Object>> readable = rows.stream().map(r -> List.<Object>of(
                AUDIT_TIME.format(java.time.LocalDateTime.parse(((String) r.get(0)).replace(' ', 'T'))),
                r.get(1), roleWord((String) r.get(2)), AuditText.action((String) r.get(3)),
                r.get(7) == null ? "" : r.get(7), AuditText.details(details((String) r.get(6))))).toList();
        var table = new ReportService.Table("AUDIT", "Audit log", from, to, List.of(
                new ReportService.Column("at", "Time", false), new ReportService.Column("who", "Who", false),
                new ReportService.Column("role", "Role", false), new ReportService.Column("action", "Action", false),
                new ReportService.Column("on", "On", false), new ReportService.Column("details", "Details", false)),
                readable, null);
        return file(base + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                reports.styledXlsx(table, auditFilters(q, role, action, from, to, rows.size())));
    }

    /** Joins the person an entry is about, when it is stored by database id ("user", "83"). Padded with spaces. */
    private static final String AUDIT_TARGET = " left join users t on a.entity = 'user' and t.id::text = a.entity_id ";
    /** What an entry is about, readable: CU-00082 / COL-083 (same codes as the admin lists), an admin's name, else as stored. */
    private static final String AUDIT_ON = " case when t.id is null then a.entity_id"
            + " when t.role = 'CUSTOMER' then 'CU-' || lpad(t.id::text, 5, '0')"
            + " when t.role = 'COLLECTOR' then 'COL-' || lpad(t.id::text, 3, '0') else t.name end ";

    private static final java.time.format.DateTimeFormatter AUDIT_TIME =
            java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", java.util.Locale.ENGLISH);
    private static final java.time.format.DateTimeFormatter AUDIT_DAY =
            java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", java.util.Locale.ENGLISH);

    private static String roleWord(String role) {
        return role == null || role.isEmpty() ? "" : role.charAt(0) + role.substring(1).toLowerCase(java.util.Locale.ROOT);
    }

    /** The filters behind a download, for the line under its title: "Search: RC-26-00035 · From 1 Oct 2026 · 16 entries". */
    private static String auditFilters(String q, String role, String action, LocalDate from, LocalDate to, int count) {
        List<String> f = new ArrayList<>();
        if (q != null && !q.isBlank()) f.add("Search: " + q.trim());
        if (role != null && !role.isBlank()) f.add("Role: " + roleWord(role));
        if (action != null && !action.isBlank()) f.add("Action: " + AuditText.action(action));
        if (from != null) f.add("From " + from.format(AUDIT_DAY));
        if (to != null) f.add("To " + to.format(AUDIT_DAY));
        if (f.isEmpty()) f.add("All entries");
        f.add(count + (count == 1 ? " entry" : " entries"));
        return String.join(" · ", f);
    }

    private static String auditWhere(String q, String role, String action, LocalDate from, LocalDate to,
            MapSqlParameterSource p) {
        StringBuilder w = new StringBuilder(" where true");
        if (q != null && !q.isBlank()) {
            w.append(" and (a.entity_id ilike :q or u.name ilike :q or a.action ilike :q)");
            p.addValue("q", "%" + AdminRequestService.likeEscape(q.trim()) + "%");
        }
        if (role != null && !role.isBlank()) {
            w.append(" and coalesce(a.role, 'SYSTEM') = :role");
            p.addValue("role", role);
        }
        if (action != null && !action.isBlank()) {
            w.append(" and a.action = :action");
            p.addValue("action", action);
        }
        if (from != null) {
            w.append(" and (a.at at time zone :tz)::date >= :from");
            p.addValue("from", from);
        }
        if (to != null) {
            w.append(" and (a.at at time zone :tz)::date <= :to");
            p.addValue("to", to);
        }
        return w.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> details(String raw) {
        if (raw == null) return Map.of();
        try {
            return json.readValue(raw, Map.class);
        } catch (RuntimeException e) {
            return Map.of("raw", raw);
        }
    }

    private static YearMonth parseMonth(String s) {
        try {
            return YearMonth.parse(s);
        } catch (java.time.format.DateTimeParseException e) {
            throw ApiException.badRequest("Use a month like 2026-10.");
        }
    }

    static ResponseEntity<byte[]> file(String name, String contentType, byte[] bytes) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .contentType(MediaType.parseMediaType(contentType))
                .header("X-Content-Type-Options", "nosniff")
                .body(bytes);
    }
}
