package com.recycleconnect.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.request.CollectorMatcher.Option;
import com.recycleconnect.request.RequestDtos.RequestCard;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.RescheduleInput;
import com.recycleconnect.request.RequestDtos.ScheduleInput;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;

/** Admin review, scheduling and assignment (brief §8–§10, §14–§16, §21). */
@Service
public class AdminRequestService {

    /** Admin list tabs, as in the design. */
    public enum Tab {
        REVIEW("SUBMITTED", "UNDER_REVIEW", "INFO_REQUESTED"),
        ACCEPTED("ACCEPTED"),
        SCHEDULED("SCHEDULED", "ASSIGNED"),
        IN_PROGRESS("PICKUP_STARTED"),
        /** Booked, assigned or started pickups whose time has passed (see {@link Overdue}); they leave SCHEDULED / IN_PROGRESS. */
        OVERDUE("SCHEDULED", "ASSIGNED", "PICKUP_STARTED"),
        AWAITING_CONFIRMATION("COLLECTED"),
        CLOSED("COMPLETED", "CANCELLED", "REJECTED", "FAILED");

        final List<String> statuses;

        Tab(String... statuses) {
            this.statuses = List.of(statuses);
        }
    }

    public record Filters(Tab tab, String status, String q, Long categoryId, Long zoneId, LocalDate from, LocalDate to,
            Long collectorId, BigDecimal minQty, BigDecimal maxQty, String customerType, String pickupStatus,
            int page, int size) {
    }

    public record Page(List<RequestCard> rows, long total, int page, int size, Map<String, Long> tabCounts) {
    }

    private final CollectionRequestRepository requests;
    private final PickupRepository pickups;
    private final RescheduleRepository reschedules;
    private final UserRepository users;
    private final RequestWorkflow workflow;
    private final RequestViews views;
    private final BookingCheck booking;
    private final CollectorMatcher matcher;
    private final NamedParameterJdbcTemplate jdbc;
    private final SettingsService settings;
    private final BusinessClock clock;

    public AdminRequestService(CollectionRequestRepository requests, PickupRepository pickups,
            RescheduleRepository reschedules, UserRepository users, RequestWorkflow workflow, RequestViews views,
            BookingCheck booking, CollectorMatcher matcher, NamedParameterJdbcTemplate jdbc, SettingsService settings,
            BusinessClock clock) {
        this.requests = requests;
        this.pickups = pickups;
        this.reschedules = reschedules;
        this.users = users;
        this.workflow = workflow;
        this.views = views;
        this.booking = booking;
        this.matcher = matcher;
        this.jdbc = jdbc;
        this.settings = settings;
        this.clock = clock;
    }

    CollectionRequest load(Long id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that request."));
    }

    // ---------- list and search (brief §21) ----------

    @Transactional(readOnly = true)
    public Page list(Filters f) {
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("nowLocal", clock.localNow()).addValue("today", clock.today());
        StringBuilder where = new StringBuilder(" where r.status <> 'DRAFT'");
        if (f.q() != null && !f.q().isBlank()) {
            String digits = f.q().replaceAll("\\D", "");
            where.append(digits.length() >= 4
                    ? " and (r.code ilike :q or u.name ilike :q or u.mobile like :qd)"
                    : " and (r.code ilike :q or u.name ilike :q)");
            p.addValue("q", "%" + likeEscape(f.q().trim()) + "%").addValue("qd", "%" + digits + "%");
        }
        if (f.status() != null && !f.status().isBlank()) {
            where.append(" and r.status = :status");
            p.addValue("status", f.status());
        }
        if (f.categoryId() != null) {
            where.append(" and exists (select 1 from request_items i where i.request_id = r.id and i.category_id = :cat)");
            p.addValue("cat", f.categoryId());
        }
        if (f.zoneId() != null) {
            where.append(" and r.zone_id = :zone");
            p.addValue("zone", f.zoneId());
        }
        if (f.from() != null) {
            where.append(" and coalesce(r.scheduled_date, r.preferred_date) >= :from");
            p.addValue("from", f.from());
        }
        if (f.to() != null) {
            where.append(" and coalesce(r.scheduled_date, r.preferred_date) <= :to");
            p.addValue("to", f.to());
        }
        if (f.collectorId() != null) {
            where.append(" and exists (select 1 from pickups k where k.request_id = r.id and k.active and k.collector_id = :col)");
            p.addValue("col", f.collectorId());
        }
        if (f.pickupStatus() != null && !f.pickupStatus().isBlank()) {
            where.append(" and exists (select 1 from pickups k where k.request_id = r.id and k.active and k.pickup_status = :ps)");
            p.addValue("ps", f.pickupStatus());
        }
        if (f.customerType() != null && !f.customerType().isBlank()) {
            where.append(" and cp.customer_type = :ctype");
            p.addValue("ctype", f.customerType());
        }
        String qtyExpr = "(select coalesce(sum(i.estimated_qty), 0) from request_items i where i.request_id = r.id)";
        if (f.minQty() != null) {
            where.append(" and ").append(qtyExpr).append(" >= :minq");
            p.addValue("minq", f.minQty());
        }
        if (f.maxQty() != null) {
            where.append(" and ").append(qtyExpr).append(" <= :maxq");
            p.addValue("maxq", f.maxQty());
        }
        String from = " from collection_requests r join users u on u.id = r.customer_id"
                + " left join customer_profiles cp on cp.user_id = r.customer_id";

        Map<String, Long> tabCounts = new LinkedHashMap<>();
        for (Tab t : Tab.values()) tabCounts.put(t.name(), 0L);
        jdbc.query("select r.status, count(*)" + from + where + " group by r.status", p, rs -> {
            String st = rs.getString(1);
            for (Tab t : Tab.values()) {
                if (t != Tab.OVERDUE && t.statuses.contains(st)) tabCounts.merge(t.name(), rs.getLong(2), Long::sum);
            }
        });
        // Overdue requests are listed only under Overdue, not also under Scheduled / In progress.
        jdbc.query("select r.status, count(*)" + from + where + " and" + Overdue.SQL + " group by r.status", p, rs -> {
            String st = rs.getString(1);
            long n = rs.getLong(2);
            tabCounts.merge(Tab.OVERDUE.name(), n, Long::sum);
            for (Tab t : List.of(Tab.SCHEDULED, Tab.IN_PROGRESS)) {
                if (t.statuses.contains(st)) tabCounts.merge(t.name(), -n, Long::sum);
            }
        });

        if (f.tab() != null) {
            where.append(" and r.status in (:tabStatuses)");
            p.addValue("tabStatuses", f.tab().statuses);
            if (f.tab() == Tab.OVERDUE) where.append(" and").append(Overdue.SQL);
            if (f.tab() == Tab.SCHEDULED || f.tab() == Tab.IN_PROGRESS) where.append(" and not").append(Overdue.SQL);
        }
        long total = jdbc.queryForObject("select count(*)" + from + where, p, Long.class);
        int size = Math.min(Math.max(f.size(), 1), 100);
        int page = Math.max(f.page(), 0);
        p.addValue("limit", size).addValue("offset", (long) page * size);
        String order = f.tab() == Tab.CLOSED ? " order by r.updated_at desc"
                : " order by coalesce(r.scheduled_date, r.preferred_date) nulls last, r.submitted_at";
        List<Long> ids = jdbc.queryForList("select r.id" + from + where + order + " limit :limit offset :offset", p, Long.class);
        Map<Long, CollectionRequest> byId = requests.findAllById(ids).stream()
                .collect(Collectors.toMap(CollectionRequest::getId, Function.identity()));
        List<CollectionRequest> ordered = ids.stream().map(byId::get).toList();
        return new Page(views.cards(ordered, true), total, page, size, tabCounts);
    }

    @Transactional(readOnly = true)
    public RequestDetail get(User admin, Long id) {
        return views.detail(load(id), admin);
    }

    // ---------- review (brief §8) ----------

    @Transactional
    public RequestDetail startReview(User admin, Long id) {
        CollectionRequest r = load(id);
        if (r.getStatus() == RequestStatus.SUBMITTED) {
            workflow.move(r, RequestStatus.UNDER_REVIEW, admin, null, null, null, null);
        }
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail accept(User admin, Long id) {
        CollectionRequest r = load(id);
        workflow.move(r, RequestStatus.ACCEPTED, admin, null, RequestEvent.Type.ACCEPTED, null, null);
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail reject(User admin, Long id, String reason) {
        CollectionRequest r = load(id);
        r.setRejectReason(reason.trim());
        workflow.move(r, RequestStatus.REJECTED, admin, reason.trim(), RequestEvent.Type.REJECTED, null,
                Map.of("reason", reason.trim()));
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail requestInfo(User admin, Long id, String message) {
        CollectionRequest r = load(id);
        r.setInfoRequest(message.trim());
        workflow.move(r, RequestStatus.INFO_REQUESTED, admin, message.trim(), RequestEvent.Type.INFO_REQUESTED, null,
                Map.of("message", message.trim()));
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail cancel(User admin, Long id, String reason) {
        CollectionRequest r = load(id);
        Pickup active = pickups.findByRequestIdAndActiveTrue(r.getId()).orElse(null);
        Long collectorId = active == null ? null : active.getCollectorId();
        if (active != null) workflow.deactivate(active);
        r.markCancelled(admin.getId(), reason.trim());
        workflow.move(r, RequestStatus.CANCELLED, admin, reason.trim(), RequestEvent.Type.CANCELLED, collectorId,
                Map.of("reason", reason.trim(), "by", "admin"));
        return views.detail(r, admin);
    }

    // ---------- scheduling and assignment (brief §9, §10, §16) ----------

    /** Books an accepted (or failed) request into a date and slot, optionally assigning a collector at once. */
    @Transactional
    public RequestDetail schedule(User admin, Long id, ScheduleInput in) {
        CollectionRequest r = load(id);
        if (r.getStatus() != RequestStatus.ACCEPTED && r.getStatus() != RequestStatus.FAILED) {
            throw new ApiException(HttpStatus.CONFLICT, r.getStatus() == RequestStatus.SCHEDULED
                    || r.getStatus() == RequestStatus.ASSIGNED
                    ? "This pickup is already booked. Use Reschedule to move it."
                    : "Accept the request before booking a pickup.");
        }
        booking.adminBooking(in.date(), in.slot());
        if (in.collectorId() != null) matcher.requireEligible(in.collectorId(), in.date(), r.getZoneId());
        if (r.getStatus() == RequestStatus.FAILED) {
            pickups.findByRequestIdAndActiveTrue(r.getId()).ifPresent(workflow::deactivate);
            pickups.flush(); // the old row must be inactive before the new active one is inserted
            reschedules.save(new RequestRecords.Reschedule(r.getId(), r.getScheduledDate(), r.getScheduledSlot(),
                    in.date(), in.slot(), "New booking after a failed pickup", admin.getId()));
        }
        r.setSchedule(in.date(), in.slot());
        workflow.move(r, RequestStatus.SCHEDULED, admin, in.date() + " " + in.slot(), RequestEvent.Type.SCHEDULED, null,
                Map.of("date", in.date().toString(), "slot", in.slot()));
        if (in.collectorId() != null) assignInternal(admin, r, in.collectorId());
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail assign(User admin, Long id, Long collectorId) {
        CollectionRequest r = load(id);
        if (r.getStatus() != RequestStatus.SCHEDULED && r.getStatus() != RequestStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.CONFLICT, "Book a date and slot before assigning a collector.");
        }
        Pickup current = pickups.findByRequestIdAndActiveTrue(r.getId()).orElse(null);
        if (current != null && current.getCollectorId().equals(collectorId)) {
            throw ApiException.field("collectorId", "This collector already has the pickup.");
        }
        if (current != null && current.getStatus().isUnderway()) {
            throw new ApiException(HttpStatus.CONFLICT, "The collector is already on the way. Ask them to mark it failed first.");
        }
        matcher.requireEligible(collectorId, r.getScheduledDate(), r.getZoneId());
        if (current != null) {
            workflow.deactivate(current);
            pickups.flush();
            workflow.publish(RequestEvent.Type.UNASSIGNED, r, current.getCollectorId(), admin, null);
        }
        assignInternal(admin, r, collectorId);
        return views.detail(r, admin);
    }

    private void assignInternal(User admin, CollectionRequest r, Long collectorId) {
        pickups.saveAndFlush(new Pickup(r.getId(), collectorId, r.getScheduledDate(), r.getScheduledSlot(), admin.getId()));
        String name = users.findById(collectorId).map(User::getName).orElse("");
        workflow.move(r, RequestStatus.ASSIGNED, admin, name, RequestEvent.Type.ASSIGNED, collectorId,
                Map.of("collector", name, "date", r.getScheduledDate().toString(), "slot", r.getScheduledSlot()));
    }

    @Transactional
    public RequestDetail reschedule(User admin, Long id, RescheduleInput in) {
        CollectionRequest r = load(id);
        if (r.getStatus() != RequestStatus.SCHEDULED && r.getStatus() != RequestStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.CONFLICT, r.getStatus() == RequestStatus.FAILED
                    ? "Use Book again to give a failed pickup a new slot."
                    : "Only booked pickups can be rescheduled.");
        }
        booking.adminBooking(in.date(), in.slot());
        if (in.date().equals(r.getScheduledDate()) && in.slot().equals(r.getScheduledSlot())) {
            throw ApiException.field("date", "Pick a different date or slot.");
        }
        Pickup active = pickups.findByRequestIdAndActiveTrue(r.getId()).orElse(null);
        if (active != null) {
            if (active.getStatus().isUnderway()) {
                throw new ApiException(HttpStatus.CONFLICT, "The collector is already on the way, so it can't be moved now.");
            }
            if (!in.date().equals(active.getScheduledDate())) {
                matcher.requireEligible(active.getCollectorId(), in.date(), r.getZoneId());
            }
        }
        LocalDate fromDate = r.getScheduledDate();
        String fromSlot = r.getScheduledSlot();
        reschedules.save(new RequestRecords.Reschedule(r.getId(), fromDate, fromSlot, in.date(), in.slot(),
                in.reason().trim(), admin.getId()));
        r.setSchedule(in.date(), in.slot());
        if (active != null) workflow.reschedulePickup(active, in.date(), in.slot());
        r.touch();
        Map<String, String> d = new LinkedHashMap<>();
        d.put("fromDate", String.valueOf(fromDate));
        d.put("fromSlot", String.valueOf(fromSlot));
        d.put("date", in.date().toString());
        d.put("slot", in.slot());
        d.put("reason", in.reason().trim());
        workflow.publish(RequestEvent.Type.RESCHEDULED, r, active == null ? null : active.getCollectorId(), admin, d);
        return views.detail(r, admin);
    }

    @Transactional
    public RequestDetail fail(User admin, Long id, FailReason reason, String note) {
        CollectionRequest r = load(id);
        Pickup active = pickups.findByRequestIdAndActiveTrue(r.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "Only a pickup with a collector can be marked failed."));
        workflow.failPickup(active, reason, blank(note), admin, r.getCode());
        workflow.move(r, RequestStatus.FAILED, admin, reason.label(), RequestEvent.Type.FAILED, active.getCollectorId(),
                Map.of("reason", reason.label()));
        return views.detail(r, admin);
    }

    @Transactional(readOnly = true)
    public List<Option> collectorOptions(Long requestId, LocalDate date) {
        CollectionRequest r = load(requestId);
        LocalDate d = date != null ? date : r.getScheduledDate() != null ? r.getScheduledDate() : r.getPreferredDate();
        if (d == null) d = clock.today();
        return matcher.options(d, r.getZoneId());
    }

    // ---------- scheduling board (design a-schedule) ----------

    public record BoardCell(Long requestId, String code, String customer, String mainCategory, BigDecimal kg,
            String pickupStatus) {
    }

    public record BoardRow(Long collectorId, String name, String zones, long load, int capacity, boolean onLeave,
            boolean worksToday, Map<String, List<BoardCell>> slots) {
    }

    public record WaitItem(RequestCard request, Option suggestion) {
    }

    public record RescheduleRow(String code, String customer, LocalDate fromDate, String fromSlot, LocalDate toDate,
            String toSlot, String reason, String by, java.time.Instant at) {
    }

    public record Board(LocalDate date, List<String> slots, boolean open, List<BoardRow> rows, List<WaitItem> waiting,
            List<RescheduleRow> recent) {
    }

    @Transactional(readOnly = true)
    public Board board(LocalDate date) {
        var rules = settings.rules();
        List<Option> options = matcher.options(date, null);
        List<Pickup> day = pickups.findByScheduledDateAndActiveTrue(date);
        Map<Long, CollectionRequest> reqs = requests.findAllById(day.stream().map(Pickup::getRequestId).toList()).stream()
                .collect(Collectors.toMap(CollectionRequest::getId, Function.identity()));
        Map<Long, User> people = users.findAllById(reqs.values().stream().map(CollectionRequest::getCustomerId).toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<BoardRow> rows = new ArrayList<>();
        for (Option o : options) {
            Map<String, List<BoardCell>> slots = new LinkedHashMap<>();
            rules.slots().forEach(s -> slots.put(s, new ArrayList<>()));
            for (Pickup p : day) {
                if (!p.getCollectorId().equals(o.id())) continue;
                CollectionRequest r = reqs.get(p.getRequestId());
                RequestItem main = r.getItems().stream().max((a, b) -> nz(a.getEstimatedQty()).compareTo(nz(b.getEstimatedQty())))
                        .orElse(null);
                slots.computeIfAbsent(p.getSlot(), k -> new ArrayList<>()).add(new BoardCell(r.getId(), r.getCode(),
                        people.get(r.getCustomerId()).getName(), main == null ? null : main.getCategory().getCode(),
                        RequestViews.kg(r.getItems(), false), p.getStatus().name()));
            }
            rows.add(new BoardRow(o.id(), o.name(), o.zones(), o.load(), o.capacity(), "On leave".equals(o.reason()),
                    o.reason() == null || !o.reason().startsWith("Doesn't work"), slots));
        }
        List<CollectionRequest> waitingReqs = requests.findWaitingForSlot();
        List<RequestCard> cards = views.cards(waitingReqs, true);
        List<WaitItem> waiting = new ArrayList<>();
        for (int i = 0; i < waitingReqs.size(); i++) {
            CollectionRequest r = waitingReqs.get(i);
            LocalDate want = r.getPreferredDate() != null && !r.getPreferredDate().isBefore(clock.today()) ? r.getPreferredDate() : date;
            waiting.add(new WaitItem(cards.get(i), matcher.best(want, r.getZoneId())));
        }
        var recentRaw = reschedules.findAllByOrderByChangedAtDesc(PageRequest.of(0, 10));
        Map<Long, CollectionRequest> rr = requests.findAllById(recentRaw.stream().map(RequestRecords.Reschedule::getRequestId).toList())
                .stream().collect(Collectors.toMap(CollectionRequest::getId, Function.identity()));
        Map<Long, User> names = new HashMap<>();
        users.findAllById(recentRaw.stream().map(RequestRecords.Reschedule::getChangedBy).toList()).forEach(u -> names.put(u.getId(), u));
        users.findAllById(rr.values().stream().map(CollectionRequest::getCustomerId).toList()).forEach(u -> names.put(u.getId(), u));
        List<RescheduleRow> recent = recentRaw.stream().filter(x -> rr.containsKey(x.getRequestId())).map(x -> {
            CollectionRequest r = rr.get(x.getRequestId());
            return new RescheduleRow(r.getCode(), names.get(r.getCustomerId()).getName(), x.getFromDate(), x.getFromSlot(),
                    x.getToDate(), x.getToSlot(), x.getReason(), names.containsKey(x.getChangedBy()) ? names.get(x.getChangedBy()).getName() : "",
                    x.getChangedAt());
        }).toList();
        return new Board(date, rules.slots(), rules.isOpen(date), rows, waiting, recent);
    }

    private static BigDecimal nz(BigDecimal b) {
        return b == null ? BigDecimal.ZERO : b;
    }

    /** Search text is matched literally: % and _ typed by the admin are not wildcards. */
    public static String likeEscape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
