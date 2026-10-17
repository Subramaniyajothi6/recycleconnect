package com.recycleconnect.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.events.AccountEvent;
import com.recycleconnect.request.AdminRequestService;
import com.recycleconnect.request.CollectorService;
import com.recycleconnect.request.RequestViews;
import com.recycleconnect.user.CollectorProfile;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;
import com.recycleconnect.zone.Zone;
import com.recycleconnect.zone.ZoneRepository;

/** Admin management of customers and collectors (brief §2C: manage customers and collectors). */
@Service
public class AdminUserService {

    public record CustomerRow(Long id, String code, String name, String type, String area, String mobile, long requests,
            BigDecimal kg, LocalDate lastPickup, String status, Instant joined) {
    }

    public record CustomerPage(List<CustomerRow> rows, long total, int page, int size, Map<String, Long> byType,
            long activeLast30Days) {
    }

    public record CollectorCard(Long id, String code, String name, String zones, String vehicleType, String vehicleNumber,
            String status, boolean available, String activity, long todayLoad, int capacity, long doneThisMonth,
            int onTimePercent, String mobile, Instant registeredAt, boolean idProofUploaded, List<String> workingDays) {
    }

    public record Collectors(List<CollectorCard> pending, List<CollectorCard> all, long activeCount, long onLeaveCount) {
    }

    public record StatusInput(UserStatus status, String reason) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final UserRepository users;
    private final CollectorProfileRepository collectors;
    private final ZoneRepository zones;
    private final CollectorService collectorService;
    private final com.recycleconnect.auth.AuthService auth;
    private final com.recycleconnect.settings.SettingsService settings;
    private final AuditService audit;
    private final ApplicationEventPublisher events;
    private final BusinessClock clock;

    public AdminUserService(NamedParameterJdbcTemplate jdbc, UserRepository users, CollectorProfileRepository collectors,
            ZoneRepository zones, CollectorService collectorService, com.recycleconnect.auth.AuthService auth,
            com.recycleconnect.settings.SettingsService settings, AuditService audit, ApplicationEventPublisher events,
            BusinessClock clock) {
        this.jdbc = jdbc;
        this.users = users;
        this.collectors = collectors;
        this.zones = zones;
        this.collectorService = collectorService;
        this.auth = auth;
        this.settings = settings;
        this.audit = audit;
        this.events = events;
        this.clock = clock;
    }

    public static String customerCode(Long id) {
        return "CU-%05d".formatted(id);
    }

    public static String collectorCode(Long id) {
        return "COL-%03d".formatted(id);
    }

    // ---------- customers ----------

    @Transactional(readOnly = true)
    public CustomerPage customers(String q, String type, String status, String area, int page, int size) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" where u.role = 'CUSTOMER'");
        if (q != null && !q.isBlank()) {
            String digits = q.replaceAll("\\D", "");
            where.append(" and (u.name ilike :q or u.email ilike :q");
            if (digits.length() >= 4) where.append(" or u.mobile like :qd");
            if (q.trim().toUpperCase().startsWith("CU-") && digits.length() > 0) where.append(" or u.id = :qid");
            where.append(")");
            p.addValue("q", "%" + AdminRequestService.likeEscape(q.trim()) + "%").addValue("qd", "%" + digits + "%")
                    .addValue("qid", digits.isEmpty() ? -1L : Long.parseLong(digits.length() > 12 ? digits.substring(0, 12) : digits));
        }
        if (type != null && !type.isBlank()) {
            where.append(" and cp.customer_type = :type");
            p.addValue("type", type);
        }
        if (status != null && !status.isBlank()) {
            where.append(" and u.status = :status");
            p.addValue("status", status);
        }
        if (area != null && !area.isBlank()) {
            where.append(" and a.area ilike :area");
            p.addValue("area", area.trim());
        }
        String from = """
                 from users u join customer_profiles cp on cp.user_id = u.id
                 left join addresses a on a.user_id = u.id and a.is_default""";
        long total = jdbc.queryForObject("select count(*)" + from + where, p, Long.class);
        int sz = Math.min(Math.max(size, 1), 100);
        p.addValue("limit", sz).addValue("offset", (long) Math.max(page, 0) * sz);
        List<CustomerRow> rows = jdbc.query("""
                select u.id, u.name, cp.customer_type, a.area, u.mobile, u.status, u.created_at,
                  (select count(*) from collection_requests r where r.customer_id = u.id and r.status <> 'DRAFT') reqs,
                  (select coalesce(sum(i.actual_qty), 0) from request_items i join collection_requests r on r.id = i.request_id
                     where r.customer_id = u.id and r.status = 'COMPLETED' and coalesce(i.actual_unit, i.unit) = 'KG') kg,
                  (select max(p.scheduled_date) from pickups p join collection_requests r on r.id = p.request_id
                     where r.customer_id = u.id and p.pickup_status in ('COLLECTED', 'COMPLETED')) last_pickup
                """ + from + where + " order by u.created_at desc limit :limit offset :offset", p,
                (rs, n) -> new CustomerRow(rs.getLong("id"), customerCode(rs.getLong("id")), rs.getString("name"),
                        rs.getString("customer_type"), rs.getString("area"), RequestViews.mask(rs.getString("mobile")),
                        rs.getLong("reqs"), rs.getBigDecimal("kg"),
                        rs.getDate("last_pickup") == null ? null : rs.getDate("last_pickup").toLocalDate(),
                        rs.getString("status"), rs.getTimestamp("created_at").toInstant()));
        Map<String, Long> byType = new LinkedHashMap<>();
        jdbc.query("select customer_type, count(*) from customer_profiles group by customer_type", Map.of(),
                rs -> { byType.put(rs.getString(1), rs.getLong(2)); });
        long active = jdbc.queryForObject("""
                select count(distinct r.customer_id) from collection_requests r
                where r.status <> 'DRAFT' and r.updated_at >= now() - interval '30 days'""", Map.of(), Long.class);
        return new CustomerPage(rows, total, page, sz, byType, active);
    }

    /** Full customer record, including contact details. Opening it is written to the audit log. */
    @Transactional
    public MeResponse customer(User admin, Long id) {
        User u = users.findById(id).filter(x -> x.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("We couldn't find that customer."));
        audit.record(admin, "VIEW_CUSTOMER", "user", u.getId(), Map.of());
        return auth.me(u.getId());
    }

    // ---------- collectors ----------

    @Transactional(readOnly = true)
    public Collectors collectors(String q, Long zoneId) {
        int capacity = settings.rules().collectorDailyCapacity();
        LocalDate today = clock.today();
        YearMonth month = YearMonth.from(today);
        List<User> list = users.findByRole(Role.COLLECTOR);
        Map<Long, CollectorProfile> profiles = new LinkedHashMap<>();
        collectors.findAllById(list.stream().map(User::getId).toList()).forEach(p -> profiles.put(p.getUserId(), p));
        Map<Long, String> underway = new LinkedHashMap<>();
        jdbc.query("""
                select collector_id from pickups where active and scheduled_date = :d
                  and pickup_status in ('ON_THE_WAY', 'ARRIVED', 'COLLECTION_STARTED')""",
                Map.of("d", today), rs -> { underway.put(rs.getLong(1), "On route"); });
        Map<Long, Long> loads = new LinkedHashMap<>();
        jdbc.query("""
                select collector_id, count(*) from pickups where active and scheduled_date = :d and pickup_status <> 'FAILED'
                group by collector_id""", Map.of("d", today), rs -> { loads.put(rs.getLong(1), rs.getLong(2)); });
        List<CollectorCard> pending = new ArrayList<>();
        List<CollectorCard> all = new ArrayList<>();
        long active = 0, onLeave = 0;
        for (User u : list) {
            CollectorProfile p = profiles.get(u.getId());
            if (p == null) continue;
            if (zoneId != null && p.getZones().stream().noneMatch(z -> z.getId().equals(zoneId))) continue;
            if (q != null && !q.isBlank()) {
                String needle = q.trim().toLowerCase();
                String hay = (u.getName() + " " + p.getVehicleNumber() + " "
                        + p.getZones().stream().map(Zone::getName).reduce("", (a, b) -> a + " " + b)).toLowerCase();
                if (!hay.contains(needle)) continue;
            }
            boolean pend = u.getStatus() == UserStatus.PENDING_APPROVAL;
            String activity = pend ? "Waiting for approval"
                    : u.getStatus() != UserStatus.ACTIVE ? (u.getStatus() == UserStatus.BLOCKED ? "Blocked" : "Inactive")
                    : !p.isAvailable() ? "On leave"
                    : underway.containsKey(u.getId()) ? "On route" : "Available";
            CollectorService.Stats stats = pend ? new CollectorService.Stats(0, 0, BigDecimal.ZERO, 100)
                    : collectorService.stats(u.getId(), month);
            CollectorCard card = new CollectorCard(u.getId(), collectorCode(u.getId()), u.getName(),
                    p.getZones().stream().map(Zone::getName).sorted().reduce((a, b) -> a + ", " + b).orElse(""),
                    p.getVehicleType() == null ? null : p.getVehicleType().name(), p.getVehicleNumber(),
                    u.getStatus().name(), p.isAvailable(), activity, loads.getOrDefault(u.getId(), 0L), capacity,
                    stats.completed(), stats.onTimePercent(), RequestViews.full(u.getMobile()), u.getCreatedAt(),
                    p.getIdProofPath() != null, p.getWorkingDays().stream().sorted().map(Enum::name).toList());
            if (pend) pending.add(card);
            else all.add(card);
            if (!pend && u.getStatus() == UserStatus.ACTIVE) {
                if (p.isAvailable()) active++;
                else onLeave++;
            }
        }
        all.sort((a, b) -> Long.compare(b.todayLoad(), a.todayLoad()));
        return new Collectors(pending, all, active, onLeave);
    }

    @Transactional
    public void approve(User admin, Long id) {
        User u = collectorUser(id);
        if (u.getStatus() != UserStatus.PENDING_APPROVAL) {
            throw new ApiException(HttpStatus.CONFLICT, "This collector isn't waiting for approval.");
        }
        CollectorProfile p = collectors.findById(id).orElseThrow();
        u.setStatus(UserStatus.ACTIVE);
        p.approve(admin.getId(), clock.now());
        audit.record(admin, "APPROVE_COLLECTOR", "user", collectorCode(id), Map.of("name", u.getName()));
        events.publishEvent(new AccountEvent(AccountEvent.Type.COLLECTOR_APPROVED, id, admin.getId(), null));
    }

    @Transactional
    public void reject(User admin, Long id, String reason) {
        User u = collectorUser(id);
        if (u.getStatus() != UserStatus.PENDING_APPROVAL) {
            throw new ApiException(HttpStatus.CONFLICT, "This collector isn't waiting for approval.");
        }
        u.setStatus(UserStatus.INACTIVE);
        u.revokeTokens();
        audit.record(admin, "REJECT_COLLECTOR", "user", collectorCode(id), Map.of("name", u.getName(), "reason", reason));
        events.publishEvent(new AccountEvent(AccountEvent.Type.COLLECTOR_REJECTED, id, admin.getId(),
                "We couldn't approve your collector registration. Reason: " + reason));
    }

    /** Activate, deactivate or block a customer or collector. Turning an account off signs it out everywhere. */
    @Transactional
    public void setStatus(User admin, Long id, UserStatus status, String reason) {
        if (status == null || status == UserStatus.PENDING_APPROVAL) throw ApiException.field("status", "Pick Active, Inactive or Blocked.");
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that account."));
        if (u.getRole() == Role.ADMIN) throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts can't be changed here.");
        if (u.getStatus() == UserStatus.PENDING_APPROVAL) throw new ApiException(HttpStatus.CONFLICT, "Approve or reject the collector first.");
        UserStatus from = u.getStatus();
        if (from == status) return;
        u.setStatus(status);
        if (status != UserStatus.ACTIVE) u.revokeTokens();
        audit.record(admin, "SET_USER_STATUS", "user", u.getRole() == Role.CUSTOMER ? customerCode(id) : collectorCode(id),
                Map.of("name", u.getName(), "from", from.name(), "to", status.name(), "reason", reason == null ? "" : reason));
    }

    @Transactional
    public void setAvailability(User admin, Long id, boolean available) {
        collectorUser(id);
        CollectorProfile p = collectors.findById(id).orElseThrow();
        p.setAvailable(available);
        audit.record(admin, available ? "COLLECTOR_AVAILABLE" : "COLLECTOR_ON_LEAVE", "user", collectorCode(id), Map.of());
    }

    public record CollectorEdit(com.recycleconnect.user.VehicleType vehicleType, String vehicleNumber,
            Set<java.time.DayOfWeek> workingDays, Set<Long> zoneIds) {
    }

    @Transactional
    public void editCollector(User admin, Long id, CollectorEdit in) {
        collectorUser(id);
        if (in.zoneIds() == null || in.zoneIds().isEmpty()) throw ApiException.field("zoneIds", "Pick at least one area.");
        if (in.workingDays() == null || in.workingDays().isEmpty()) throw ApiException.field("workingDays", "Pick at least one working day.");
        if (in.vehicleNumber() == null || in.vehicleNumber().isBlank()) throw ApiException.field("vehicleNumber", "Enter the registration number.");
        var picked = new java.util.HashSet<>(zones.findAllById(in.zoneIds()));
        if (picked.size() != in.zoneIds().size()) throw ApiException.field("zoneIds", "One of the areas no longer exists.");
        collectors.findById(id).orElseThrow().update(in.vehicleType(), in.vehicleNumber().trim().toUpperCase(),
                in.workingDays(), picked);
        audit.record(admin, "EDIT_COLLECTOR", "user", collectorCode(id), Map.of());
    }

    private User collectorUser(Long id) {
        return users.findById(id).filter(u -> u.getRole() == Role.COLLECTOR)
                .orElseThrow(() -> ApiException.notFound("We couldn't find that collector."));
    }
}
