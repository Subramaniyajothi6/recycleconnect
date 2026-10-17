package com.recycleconnect.admin;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.request.Overdue;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;

/**
 * Admin dashboard (brief §20) and analytics. Plain SQL aggregates over the operational tables; at larger scale
 * these move to a reporting replica or nightly summary tables without changing the API (docs/EXTENDING.md).
 * Kilograms count only items recorded in kg on completed requests.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    public record Kpis(long totalCustomers, long activeCollectors, long pendingRequests, long todaysPickups,
            long completedThisMonth, long failedThisMonth, BigDecimal totalKg, long overdue) {
    }

    public record CategoryKg(String code, String name, String color, BigDecimal kg) {
    }

    public record MonthValue(String month, BigDecimal value) {
    }

    public record MonthPair(String month, long completed, long failed) {
    }

    public record AreaCount(String area, Double lat, Double lng, long requests, long waiting) {
    }

    public record CollectorPerf(Long id, String name, String zones, long completed, long failed, BigDecimal kg,
            int onTimePercent, long complaints) {
    }

    public record CustomerActivity(long active, long newSignups, long repeat, long requests,
            Map<String, Long> byType) {
    }

    public record Dashboard(LocalDate today, String month, Kpis kpis, List<CategoryKg> categories,
            CustomerActivity customers, List<MonthValue> monthlyKg, List<MonthPair> completedVsFailed,
            List<AreaCount> areas, List<CollectorPerf> collectors) {
    }

    public record Filters(LocalDate from, LocalDate to, Long zoneId, String customerType, Long categoryId) {
    }

    public record StackedMonth(String month, Map<String, BigDecimal> byCategory, BigDecimal total) {
    }

    public record Share(String key, String label, long count, int percent) {
    }

    public record Heat(List<String> days, List<String> slots, long[][] counts, long max) {
    }

    public record Accuracy(String category, String color, int differencePercent, long samples) {
    }

    public record Analytics(Filters filters, List<StackedMonth> volume, List<CategoryKg> categories,
            List<Share> failReasons, long failedTotal, Heat heat, List<Accuracy> accuracy, List<Share> customerTypes,
            long activeCustomers, int repeatWithin60DaysPercent, List<CollectorPerf> collectors) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final BusinessClock clock;
    private final SettingsService settings;

    public AnalyticsService(NamedParameterJdbcTemplate jdbc, BusinessClock clock, SettingsService settings) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.settings = settings;
    }

    private MapSqlParameterSource base() {
        return new MapSqlParameterSource("tz", clock.zone().getId());
    }

    /** Padded with spaces: it is joined to text blocks, which drop trailing spaces. */
    private static final String KG = " (coalesce(i.actual_unit, i.unit) = 'KG' and i.actual_qty is not null) ";

    // ---------- dashboard ----------

    public Dashboard dashboard(YearMonth monthOrNull) {
        LocalDate today = clock.today();
        YearMonth month = monthOrNull != null ? monthOrNull : YearMonth.from(today);
        MapSqlParameterSource p = base().addValue("today", today).addValue("mFrom", month.atDay(1))
                .addValue("mTo", month.atEndOfMonth()).addValue("nowLocal", clock.localNow());

        Kpis kpis = new Kpis(
                count("select count(*) from users where role = 'CUSTOMER'", p),
                count("""
                        select count(*) from users u join collector_profiles c on c.user_id = u.id
                        where u.role = 'COLLECTOR' and u.status = 'ACTIVE' and c.available""", p),
                count("select count(*) from collection_requests where status in ('SUBMITTED', 'UNDER_REVIEW')", p),
                count("select count(*) from pickups where active and scheduled_date = :today and pickup_status <> 'FAILED'", p),
                count("""
                        select count(*) from collection_requests where status = 'COMPLETED'
                        and (completed_at at time zone :tz)::date between :mFrom and :mTo""", p),
                count("""
                        select count(*) from pickups where pickup_status = 'FAILED'
                        and scheduled_date between :mFrom and :mTo""", p),
                jdbc.queryForObject("select coalesce(sum(i.actual_qty), 0) from request_items i join collection_requests r on r.id = i.request_id where r.status = 'COMPLETED' and " + KG, p, BigDecimal.class),
                count("select count(*) from collection_requests r where" + Overdue.SQL, p));

        List<CategoryKg> cats = jdbc.query("""
                select c.code, c.name, c.color, coalesce(sum(i.actual_qty), 0) kg from waste_categories c
                left join request_items i on i.category_id = c.id and """ + KG + """
                 and exists (select 1 from collection_requests r where r.id = i.request_id and r.status = 'COMPLETED'
                   and (r.completed_at at time zone :tz)::date between :mFrom and :mTo)
                group by c.code, c.name, c.color, c.sort_order having coalesce(sum(i.actual_qty), 0) > 0 order by kg desc""",
                p, (rs, n) -> new CategoryKg(rs.getString(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4)));

        Map<String, Long> byType = new LinkedHashMap<>();
        jdbc.query("""
                select cp.customer_type, count(*) from collection_requests r join customer_profiles cp on cp.user_id = r.customer_id
                where r.status <> 'DRAFT' and (r.created_at at time zone :tz)::date between :mFrom and :mTo group by cp.customer_type""",
                p, rs -> { byType.put(rs.getString(1), rs.getLong(2)); });
        CustomerActivity activity = new CustomerActivity(
                count("""
                        select count(distinct customer_id) from collection_requests where status <> 'DRAFT'
                        and (created_at at time zone :tz)::date between :mFrom and :mTo""", p),
                count("select count(*) from users where role = 'CUSTOMER' and (created_at at time zone :tz)::date between :mFrom and :mTo", p),
                count("""
                        select count(*) from (select r.customer_id from collection_requests r where r.status <> 'DRAFT'
                          and (r.created_at at time zone :tz)::date between :mFrom and :mTo
                          and exists (select 1 from collection_requests o where o.customer_id = r.customer_id
                            and o.status <> 'DRAFT' and o.created_at < r.created_at) group by r.customer_id) x""", p),
                count("""
                        select count(*) from collection_requests where status <> 'DRAFT'
                        and (created_at at time zone :tz)::date between :mFrom and :mTo""", p),
                byType);

        List<AreaCount> areas = jdbc.query("""
                select coalesce(z.name, r.address_area, 'Other') area, max(z.lat), max(z.lng), count(*),
                  count(*) filter (where r.status in ('SUBMITTED', 'UNDER_REVIEW'))
                from collection_requests r left join zones z on z.id = r.zone_id
                where r.status <> 'DRAFT' and (r.created_at at time zone :tz)::date between :mFrom and :mTo
                group by 1 order by 4 desc limit 12""", p,
                (rs, n) -> new AreaCount(rs.getString(1), (Double) rs.getObject(2), (Double) rs.getObject(3), rs.getLong(4), rs.getLong(5)));

        return new Dashboard(today, month.toString(), kpis, cats, activity, monthlyKg(month, null), completedVsFailed(month),
                areas, collectorPerformance(month.atDay(1), month.atEndOfMonth()));
    }

    private long count(String sql, MapSqlParameterSource p) {
        Long n = jdbc.queryForObject(sql, p, Long.class);
        return n == null ? 0 : n;
    }

    private List<MonthValue> monthlyKg(YearMonth last, Filters f) {
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) out.put(last.minusMonths(i).toString(), BigDecimal.ZERO);
        MapSqlParameterSource p = base().addValue("from", last.minusMonths(5).atDay(1)).addValue("to", last.atEndOfMonth());
        jdbc.query("""
                select to_char((r.completed_at at time zone :tz), 'YYYY-MM'), sum(i.actual_qty)
                from request_items i join collection_requests r on r.id = i.request_id
                where r.status = 'COMPLETED' and """ + KG + " and (r.completed_at at time zone :tz)::date between :from and :to group by 1",
                p, rs -> { out.computeIfPresent(rs.getString(1), (k, v) -> safe(rs, 2)); });
        return out.entrySet().stream().map(e -> new MonthValue(e.getKey(), e.getValue())).toList();
    }

    private static BigDecimal safe(java.sql.ResultSet rs, int col) {
        try {
            BigDecimal b = rs.getBigDecimal(col);
            return b == null ? BigDecimal.ZERO : b;
        } catch (java.sql.SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    private List<MonthPair> completedVsFailed(YearMonth last) {
        Map<String, long[]> out = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) out.put(last.minusMonths(i).toString(), new long[2]);
        MapSqlParameterSource p = base().addValue("from", last.minusMonths(5).atDay(1)).addValue("to", last.atEndOfMonth());
        jdbc.query("""
                select to_char(scheduled_date, 'YYYY-MM'),
                  count(*) filter (where pickup_status in ('COLLECTED', 'COMPLETED')),
                  count(*) filter (where pickup_status = 'FAILED')
                from pickups where scheduled_date between :from and :to group by 1""", p, rs -> {
            long[] v = out.get(rs.getString(1));
            if (v != null) {
                v[0] = rs.getLong(2);
                v[1] = rs.getLong(3);
            }
        });
        return out.entrySet().stream().map(e -> new MonthPair(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    /** Per collector for a date range. On time = collected before the end of the booked slot. */
    public List<CollectorPerf> collectorPerformance(LocalDate from, LocalDate to) {
        MapSqlParameterSource p = base().addValue("from", from).addValue("to", to);
        return jdbc.query("""
                select u.id, u.name,
                  (select string_agg(z.name, ', ' order by z.name) from collector_zones cz join zones z on z.id = cz.zone_id where cz.collector_id = u.id),
                  count(p.id) filter (where p.pickup_status in ('COLLECTED', 'COMPLETED')),
                  count(p.id) filter (where p.pickup_status = 'FAILED'),
                  coalesce((select sum(i.actual_qty) from request_items i join pickups pp on pp.request_id = i.request_id
                    where pp.collector_id = u.id and pp.active and pp.pickup_status in ('COLLECTED', 'COMPLETED')
                    and pp.scheduled_date between :from and :to and coalesce(i.actual_unit, i.unit) = 'KG'), 0),
                  count(p.id) filter (where p.pickup_status in ('COLLECTED', 'COMPLETED')
                    and (p.collected_at at time zone :tz) <= p.scheduled_date + substring(p.slot from 7 for 5)::time),
                  (select count(*) from complaints c join pickups cp on cp.request_id = c.request_id and cp.collector_id = u.id
                    where (c.created_at at time zone :tz)::date between :from and :to)
                from users u left join pickups p on p.collector_id = u.id and p.scheduled_date between :from and :to
                where u.role = 'COLLECTOR' and u.status = 'ACTIVE'
                group by u.id, u.name order by 4 desc, u.name""", p, (rs, n) -> {
            long done = rs.getLong(4);
            long onTime = rs.getLong(7);
            return new CollectorPerf(rs.getLong(1), rs.getString(2), rs.getString(3), done, rs.getLong(5),
                    rs.getBigDecimal(6), done == 0 ? 100 : (int) Math.round(onTime * 100.0 / done), rs.getLong(8));
        });
    }

    // ---------- analytics ----------

    public Analytics analytics(Filters in) {
        LocalDate to = in.to() != null ? in.to() : clock.today();
        LocalDate from = in.from() != null ? in.from() : YearMonth.from(to).minusMonths(5).atDay(1);
        Filters f = new Filters(from, to, in.zoneId(), in.customerType(), in.categoryId());
        MapSqlParameterSource p = base().addValue("from", from).addValue("to", to);
        StringBuilder rf = new StringBuilder();
        if (f.zoneId() != null) {
            rf.append(" and r.zone_id = :zone");
            p.addValue("zone", f.zoneId());
        }
        if (f.customerType() != null && !f.customerType().isBlank()) {
            rf.append(" and exists (select 1 from customer_profiles cp where cp.user_id = r.customer_id and cp.customer_type = :ctype)");
            p.addValue("ctype", f.customerType());
        }
        if (f.categoryId() != null) {
            rf.append(" and exists (select 1 from request_items ci where ci.request_id = r.id and ci.category_id = :cat)");
            p.addValue("cat", f.categoryId());
        }

        // Volume by month and material.
        Map<String, StackedMonth> volume = new LinkedHashMap<>();
        for (YearMonth m = YearMonth.from(from); !m.isAfter(YearMonth.from(to)); m = m.plusMonths(1)) {
            volume.put(m.toString(), new StackedMonth(m.toString(), new LinkedHashMap<>(), BigDecimal.ZERO));
        }
        jdbc.query("""
                select to_char((r.completed_at at time zone :tz), 'YYYY-MM'), c.code, sum(i.actual_qty)
                from request_items i join collection_requests r on r.id = i.request_id join waste_categories c on c.id = i.category_id
                where r.status = 'COMPLETED' and """ + KG + " and (r.completed_at at time zone :tz)::date between :from and :to" + rf
                + " group by 1, 2", p, rs -> {
            StackedMonth sm = volume.get(rs.getString(1));
            if (sm != null) sm.byCategory().put(rs.getString(2), rs.getBigDecimal(3));
        });
        List<StackedMonth> vol = volume.values().stream().map(sm -> new StackedMonth(sm.month(), sm.byCategory(),
                sm.byCategory().values().stream().reduce(BigDecimal.ZERO, BigDecimal::add))).toList();

        List<CategoryKg> cats = jdbc.query("""
                select c.code, c.name, c.color, sum(i.actual_qty) from request_items i
                join collection_requests r on r.id = i.request_id join waste_categories c on c.id = i.category_id
                where r.status = 'COMPLETED' and """ + KG + " and (r.completed_at at time zone :tz)::date between :from and :to" + rf
                + " group by c.code, c.name, c.color order by 4 desc", p,
                (rs, n) -> new CategoryKg(rs.getString(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4)));

        // Why pickups fail.
        Map<String, Long> reasons = new LinkedHashMap<>();
        for (var r : com.recycleconnect.request.FailReason.values()) reasons.put(r.name(), 0L);
        jdbc.query("""
                select p.fail_reason, count(*) from pickups p join collection_requests r on r.id = p.request_id
                where p.pickup_status = 'FAILED' and p.scheduled_date between :from and :to""" + rf + " group by 1", p,
                rs -> { if (rs.getString(1) != null) reasons.put(rs.getString(1), rs.getLong(2)); });
        long failedTotal = reasons.values().stream().mapToLong(Long::longValue).sum();
        List<Share> failReasons = reasons.entrySet().stream().map(e -> new Share(e.getKey(),
                com.recycleconnect.request.FailReason.valueOf(e.getKey()).label(), e.getValue(),
                percent(e.getValue(), failedTotal))).toList();

        // Busiest days and slots.
        Rules rules = settings.rules();
        List<String> slots = rules.slots();
        List<String> days = rules.workingDays().stream().sorted().map(d -> d.name().substring(0, 1) + d.name().substring(1, 3).toLowerCase()).toList();
        List<Integer> dayNums = rules.workingDays().stream().sorted().map(d -> d.getValue()).toList();
        long[][] heat = new long[days.size()][slots.size()];
        jdbc.query("""
                select extract(isodow from p.scheduled_date)::int, p.slot, count(*) from pickups p
                join collection_requests r on r.id = p.request_id
                where p.scheduled_date between :from and :to""" + rf + " group by 1, 2", p, rs -> {
            int di = dayNums.indexOf(rs.getInt(1));
            int si = slots.indexOf(rs.getString(2));
            if (di >= 0 && si >= 0) heat[di][si] += rs.getLong(3);
        });
        long max = 0;
        for (long[] row : heat) for (long v : row) max = Math.max(max, v);

        // Estimate vs actual, per category, as an average percentage difference.
        List<Accuracy> accuracy = jdbc.query("""
                select c.name, c.color, avg((i.actual_qty - i.estimated_qty) / nullif(i.estimated_qty, 0)) * 100, count(*)
                from request_items i join collection_requests r on r.id = i.request_id join waste_categories c on c.id = i.category_id
                where r.status = 'COMPLETED' and i.estimated_qty > 0 and i.actual_qty is not null and i.actual_unit = i.unit
                  and (r.completed_at at time zone :tz)::date between :from and :to""" + rf
                + " group by c.name, c.color, c.sort_order order by c.sort_order", p,
                (rs, n) -> new Accuracy(rs.getString(1), rs.getString(2),
                        rs.getBigDecimal(3) == null ? 0 : rs.getBigDecimal(3).setScale(0, RoundingMode.HALF_UP).intValue(), rs.getLong(4)));

        // Customers by type, and loyalty.
        Map<String, Long> types = new LinkedHashMap<>();
        jdbc.query("""
                select cp.customer_type, count(*) from collection_requests r join customer_profiles cp on cp.user_id = r.customer_id
                where r.status <> 'DRAFT' and (r.created_at at time zone :tz)::date between :from and :to""" + rf
                + " group by 1 order by 2 desc", p, rs -> { types.put(rs.getString(1), rs.getLong(2)); });
        long typeTotal = types.values().stream().mapToLong(Long::longValue).sum();
        List<Share> customerTypes = types.entrySet().stream().map(e -> new Share(e.getKey(),
                e.getKey().charAt(0) + e.getKey().substring(1).toLowerCase(), e.getValue(), percent(e.getValue(), typeTotal))).toList();
        long activeCustomers = count("""
                select count(distinct r.customer_id) from collection_requests r where r.status <> 'DRAFT'
                and (r.created_at at time zone :tz)::date between :from and :to""" + rf, p);
        long repeat = count("""
                select count(distinct r.customer_id) from collection_requests r where r.status <> 'DRAFT'
                and (r.created_at at time zone :tz)::date between :from and :to""" + rf + " " + """
                 and exists (select 1 from collection_requests o where o.customer_id = r.customer_id and o.id <> r.id
                   and o.status <> 'DRAFT' and o.created_at > r.created_at and o.created_at <= r.created_at + interval '60 days')""", p);

        return new Analytics(f, vol, cats, failReasons, failedTotal, new Heat(days, slots, heat, max), accuracy,
                customerTypes, activeCustomers, percent(repeat, activeCustomers), collectorPerformance(from, to));
    }

    static int percent(long part, long whole) {
        return whole == 0 ? 0 : (int) Math.round(part * 100.0 / whole);
    }

    public List<MonthValue> monthly(YearMonth last) {
        return monthlyKg(last, null);
    }

    List<String> monthsBetween(LocalDate from, LocalDate to) {
        List<String> out = new ArrayList<>();
        for (YearMonth m = YearMonth.from(from); !m.isAfter(YearMonth.from(to)); m = m.plusMonths(1)) out.add(m.toString());
        return out;
    }
}
