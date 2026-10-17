package com.recycleconnect.complaint;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.events.ComplaintEvent;
import com.recycleconnect.request.CollectionRequest;
import com.recycleconnect.request.CollectionRequestRepository;
import com.recycleconnect.request.RequestCodes;
import com.recycleconnect.request.RequestDtos.ItemView;
import com.recycleconnect.request.RequestItem;
import com.recycleconnect.request.RequestStatus;
import com.recycleconnect.request.RequestViews;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Complaints and feedback (brief §23). */
@Service
public class ComplaintService {

    public record CreateInput(Long requestId, @NotNull(message = "Pick what went wrong") Complaint.Type type,
            @NotBlank(message = "Tell us what happened") @Size(max = 2000) String description) {
    }

    public record Correction(@NotNull Long categoryId, @NotNull @DecimalMin("0") @DecimalMax("10000") BigDecimal qty) {
    }

    public record ResolveInput(@NotNull(message = "Pick a resolution") Complaint.Resolution resolution,
            @NotBlank(message = "Write a reply to the customer") @Size(max = 2000) String reply,
            List<@Valid Correction> corrections) {
    }

    public record NoteInput(@NotBlank @Size(max = 2000) String note) {
    }

    public record Row(Long id, String code, String requestCode, Long requestId, String customer, String type,
            String typeLabel, String status, String assignedTo, Instant createdAt, Instant resolvedAt, String reply,
            String description) {
    }

    public record Activity(Instant at, String text) {
    }

    public record Detail(Row complaint, String note, String resolutionType, List<ItemView> items, String collector,
            boolean customerConfirmed, Instant collectedAt, long evidencePhotos, List<Activity> activity) {
    }

    public record AdminPage(List<Row> rows, Map<String, Long> counts) {
    }

    private final ComplaintRepository complaints;
    private final CollectionRequestRepository requests;
    private final UserRepository users;
    private final RequestCodes codes;
    private final AuditService audit;
    private final ApplicationEventPublisher events;
    private final JdbcTemplate jdbc;

    public ComplaintService(ComplaintRepository complaints, CollectionRequestRepository requests, UserRepository users,
            RequestCodes codes, AuditService audit, ApplicationEventPublisher events, JdbcTemplate jdbc) {
        this.complaints = complaints;
        this.requests = requests;
        this.users = users;
        this.codes = codes;
        this.audit = audit;
        this.events = events;
        this.jdbc = jdbc;
    }

    @Transactional
    public Row create(User customer, CreateInput in) {
        CollectionRequest r = null;
        if (in.requestId() != null) {
            r = requests.findByIdAndCustomerId(in.requestId(), customer.getId())
                    .orElseThrow(() -> ApiException.field("requestId", "Pick one of your requests."));
            if (r.getStatus() == RequestStatus.DRAFT) throw ApiException.field("requestId", "Pick a submitted request.");
        }
        Complaint c = complaints.save(new Complaint(codes.nextComplaintCode(), r == null ? null : r.getId(),
                customer.getId(), in.type(), in.description().trim()));
        audit.record(customer, "COMPLAINT_RAISED", "complaint", c.getCode(),
                Map.of("type", in.type().label(), "request", r == null ? "-" : r.getCode()));
        events.publishEvent(new ComplaintEvent(ComplaintEvent.Type.RAISED, c.getId(), c.getCode(), customer.getId(),
                customer.getId(), in.type().label() + (r == null ? "" : " on " + r.getCode())));
        return rows(List.of(c)).get(0);
    }

    @Transactional(readOnly = true)
    public List<Row> mine(User customer) {
        return rows(complaints.findByCustomerIdOrderByCreatedAtDesc(customer.getId()));
    }

    @Transactional(readOnly = true)
    public AdminPage list(Complaint.Status status, Complaint.Type type, String q) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Complaint.Status s : Complaint.Status.values()) counts.put(s.name(), complaints.countByStatus(s));
        List<Complaint> all = complaints.findAll(org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        List<Row> rows = rows(all.stream()
                .filter(c -> status == null || c.getStatus() == status)
                .filter(c -> type == null || c.getType() == type)
                .limit(500).toList());
        if (q != null && !q.isBlank()) {
            String needle = q.trim().toLowerCase();
            rows = rows.stream().filter(r -> r.code().toLowerCase().contains(needle)
                    || (r.requestCode() != null && r.requestCode().toLowerCase().contains(needle))
                    || r.customer().toLowerCase().contains(needle)).toList();
        }
        return new AdminPage(rows, counts);
    }

    private Complaint load(Long id) {
        return complaints.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that complaint."));
    }

    @Transactional(readOnly = true)
    public Detail detail(Long id) {
        Complaint c = load(id);
        CollectionRequest r = c.getRequestId() == null ? null : requests.findById(c.getRequestId()).orElse(null);
        String collector = null;
        Instant collectedAt = null;
        boolean confirmed = false;
        long photos = 0;
        if (r != null) {
            var pick = jdbc.query("""
                    select u.name, p.collected_at from pickups p join users u on u.id = p.collector_id
                    where p.request_id = ? order by p.active desc, p.assigned_at desc limit 1""",
                    (rs, n) -> new Object[] { rs.getString(1), rs.getTimestamp(2) }, r.getId());
            if (!pick.isEmpty()) {
                collector = (String) pick.get(0)[0];
                collectedAt = pick.get(0)[1] == null ? null : ((java.sql.Timestamp) pick.get(0)[1]).toInstant();
            }
            confirmed = Boolean.TRUE.equals(jdbc.query("select confirmed and not auto from customer_confirmations where request_id = ?",
                    rs -> rs.next() ? rs.getBoolean(1) : false, r.getId()));
            photos = jdbc.queryForObject("select count(*) from request_photos where request_id = ? and kind = 'EVIDENCE'",
                    Long.class, r.getId());
        }
        List<Activity> activity = jdbc.query("""
                select a.at, a.action, coalesce(u.name, 'System') from audit_log a left join users u on u.id = a.user_id
                where a.entity = 'complaint' and a.entity_id = ? order by a.at""",
                (rs, n) -> new Activity(rs.getTimestamp(1).toInstant(), describe(rs.getString(2), rs.getString(3))), c.getCode());
        return new Detail(rows(List.of(c)).get(0), c.getResolution(),
                c.getResolutionType() == null ? null : c.getResolutionType().name(),
                r == null ? List.of() : RequestViews.items(r), collector, confirmed, collectedAt, photos, activity);
    }

    private static String describe(String action, String who) {
        return switch (action) {
            case "COMPLAINT_RAISED" -> "Raised by " + who;
            case "COMPLAINT_REVIEW" -> who + " is reviewing it";
            case "COMPLAINT_NOTE" -> who + " added a note";
            case "COMPLAINT_RESOLVED" -> "Resolved by " + who;
            default -> action.toLowerCase().replace('_', ' ') + " by " + who;
        };
    }

    @Transactional
    public Detail review(User admin, Long id) {
        Complaint c = load(id);
        if (c.getStatus() == Complaint.Status.RESOLVED) throw new ApiException(HttpStatus.CONFLICT, "This complaint is already resolved.");
        boolean wasOpen = c.getStatus() == Complaint.Status.OPEN;
        c.review(admin.getId());
        audit.record(admin, "COMPLAINT_REVIEW", "complaint", c.getCode(), Map.of());
        if (wasOpen) {
            events.publishEvent(new ComplaintEvent(ComplaintEvent.Type.IN_REVIEW, c.getId(), c.getCode(), c.getCustomerId(),
                    admin.getId(), admin.getName() + " is looking into it. We'll reply within 2 working days."));
        }
        return detail(id);
    }

    @Transactional
    public Detail note(User admin, Long id, String note) {
        Complaint c = load(id);
        c.note(note.trim());
        audit.record(admin, "COMPLAINT_NOTE", "complaint", c.getCode(), Map.of());
        return detail(id);
    }

    @Transactional
    public Detail resolve(User admin, Long id, ResolveInput in) {
        Complaint c = load(id);
        if (c.getStatus() == Complaint.Status.RESOLVED) throw new ApiException(HttpStatus.CONFLICT, "This complaint is already resolved.");
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("resolution", in.resolution().name());
        if (in.resolution() == Complaint.Resolution.QUANTITY_CORRECTED) {
            if (c.getRequestId() == null || in.corrections() == null || in.corrections().isEmpty()) {
                throw ApiException.field("corrections", "Enter the corrected quantities.");
            }
            CollectionRequest r = requests.findById(c.getRequestId()).orElseThrow();
            for (Correction fix : in.corrections()) {
                RequestItem item = r.getItems().stream().filter(i -> i.getCategory().getId().equals(fix.categoryId()))
                        .findFirst().orElseThrow(() -> ApiException.field("corrections", "That material isn't on the request."));
                // Only real changes are logged, without trailing zeros ("13.4 → 14", not "13.40 -> 14").
                BigDecimal before = item.getActualQty();
                if (before == null || before.compareTo(fix.qty()) != 0) {
                    details.put(item.getCategory().getName(), plain(before) + " → " + plain(fix.qty()));
                }
                item.recordActual(fix.qty(), item.getActualUnit() != null ? item.getActualUnit() : item.getUnit());
            }
            audit.record(admin, "QUANTITY_CORRECTED", "request", r.getCode(), details);
        }
        c.resolve(admin.getId(), in.resolution(), in.reply().trim());
        audit.record(admin, "COMPLAINT_RESOLVED", "complaint", c.getCode(), details);
        events.publishEvent(new ComplaintEvent(ComplaintEvent.Type.RESOLVED, c.getId(), c.getCode(), c.getCustomerId(),
                admin.getId(), in.reply().trim()));
        return detail(id);
    }

    private List<Row> rows(List<Complaint> list) {
        if (list.isEmpty()) return List.of();
        Set<Long> userIds = new HashSet<>();
        list.forEach(c -> {
            userIds.add(c.getCustomerId());
            if (c.getAssignedTo() != null) userIds.add(c.getAssignedTo());
        });
        Map<Long, User> people = users.findAllById(userIds).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, String> reqCodes = requests.findAllById(list.stream().map(Complaint::getRequestId)
                .filter(java.util.Objects::nonNull).toList()).stream()
                .collect(Collectors.toMap(CollectionRequest::getId, CollectionRequest::getCode));
        return list.stream().map(c -> new Row(c.getId(), c.getCode(), reqCodes.get(c.getRequestId()), c.getRequestId(),
                people.get(c.getCustomerId()).getName(), c.getType().name(), c.getType().label(), c.getStatus().name(),
                c.getAssignedTo() == null ? null : people.get(c.getAssignedTo()).getName(), c.getCreatedAt(),
                c.getResolvedAt(), c.getReply(), c.getDescription())).toList();
    }

    private static String plain(BigDecimal v) {
        return v == null ? "none" : v.stripTrailingZeros().toPlainString();
    }
}
