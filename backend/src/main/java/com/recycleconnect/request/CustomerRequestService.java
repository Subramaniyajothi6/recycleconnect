package com.recycleconnect.request;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.recycleconnect.catalog.WasteCategory;
import com.recycleconnect.catalog.WasteCategoryRepository;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.files.FileStorage;
import com.recycleconnect.files.UploadValidator;
import com.recycleconnect.request.RequestDtos.ConfirmInput;
import com.recycleconnect.request.RequestDtos.ItemInput;
import com.recycleconnect.request.RequestDtos.RequestCard;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.RequestInput;
import com.recycleconnect.user.Address;
import com.recycleconnect.user.AddressRepository;
import com.recycleconnect.user.User;
import com.recycleconnect.zone.ZoneRepository;

/** Everything a customer does with their own requests. Every method checks the request belongs to them. */
@Service
public class CustomerRequestService {

    static final int MAX_CUSTOMER_PHOTOS = 4;

    private final CollectionRequestRepository requests;
    private final WasteCategoryRepository categories;
    private final AddressRepository addresses;
    private final ZoneRepository zones;
    private final PickupRepository pickups;
    private final PhotoRepository photos;
    private final ConfirmationRepository confirmations;
    private final RequestWorkflow workflow;
    private final RequestViews views;
    private final RequestCodes codes;
    private final BookingCheck booking;
    private final UploadValidator uploads;
    private final FileStorage storage;
    private final BusinessClock clock;
    private final JdbcTemplate jdbc;

    public CustomerRequestService(CollectionRequestRepository requests, WasteCategoryRepository categories,
            AddressRepository addresses, ZoneRepository zones, PickupRepository pickups, PhotoRepository photos,
            ConfirmationRepository confirmations, RequestWorkflow workflow, RequestViews views, RequestCodes codes,
            BookingCheck booking, UploadValidator uploads, FileStorage storage, BusinessClock clock, JdbcTemplate jdbc) {
        this.requests = requests;
        this.categories = categories;
        this.addresses = addresses;
        this.zones = zones;
        this.pickups = pickups;
        this.photos = photos;
        this.confirmations = confirmations;
        this.workflow = workflow;
        this.views = views;
        this.codes = codes;
        this.booking = booking;
        this.uploads = uploads;
        this.storage = storage;
        this.clock = clock;
        this.jdbc = jdbc;
    }

    CollectionRequest own(User customer, Long id) {
        return requests.findByIdAndCustomerId(id, customer.getId())
                .orElseThrow(() -> ApiException.notFound("We couldn't find that request."));
    }

    @Transactional(readOnly = true)
    public List<RequestCard> list(User customer) {
        return views.cards(requests.findByCustomerIdOrderByUpdatedAtDesc(customer.getId()), false);
    }

    @Transactional(readOnly = true)
    public RequestDetail get(User customer, Long id) {
        return views.detail(own(customer, id), customer);
    }

    @Transactional
    public RequestDetail create(User customer, RequestInput in) {
        CollectionRequest r = new CollectionRequest(codes.nextRequestCode(), customer.getId());
        apply(r, customer, in);
        r = requests.save(r);
        if (in.submit()) submit(r, customer);
        return views.detail(r, customer);
    }

    @Transactional
    public RequestDetail update(User customer, Long id, RequestInput in) {
        CollectionRequest r = own(customer, id);
        if (!r.getStatus().isEditableByCustomer()) {
            throw new ApiException(HttpStatus.CONFLICT, "This request can't be changed any more. Cancel it and book a new one if you need to.");
        }
        apply(r, customer, in);
        r.touch();
        if (in.submit()) submit(r, customer);
        return views.detail(r, customer);
    }

    private void apply(CollectionRequest r, User customer, RequestInput in) {
        Address a = addresses.findById(in.addressId())
                .filter(x -> x.getUserId().equals(customer.getId()))
                .orElseThrow(() -> ApiException.field("addressId", "Pick one of your saved addresses."));
        Double lat = in.lat() != null && in.lng() != null ? in.lat() : a.getLat();
        Double lng = in.lat() != null && in.lng() != null ? in.lng() : a.getLng();
        Long zoneId = a.getArea() == null ? null
                : zones.findFirstByNameIgnoreCase(a.getArea().trim()).map(z -> z.getId()).orElse(null);
        r.setAddress(a.getId(), a.getLabel(), a.getLine1(), a.getArea(), a.getCity(), a.getDistrict(), a.getState(),
                a.getPin(), lat, lng, zoneId);
        r.setPreference(in.preferredDate(), blankToNull(in.preferredSlot()), blankToNull(in.notes()));
        setItems(r, in.items());
    }

    /** Replaces the estimate lines. Each material once, active categories only (brief §25). */
    private void setItems(CollectionRequest r, List<ItemInput> items) {
        Set<Long> seen = new HashSet<>();
        Map<Long, BigDecimal> wanted = new LinkedHashMap<>();
        for (ItemInput i : items) {
            if (!seen.add(i.categoryId())) throw ApiException.field("items", "Each material can be listed only once.");
            wanted.put(i.categoryId(), i.qty());
        }
        Map<Long, WasteCategory> found = new LinkedHashMap<>();
        categories.findAllById(wanted.keySet()).forEach(c -> found.put(c.getId(), c));
        for (Long id : wanted.keySet()) {
            WasteCategory c = found.get(id);
            if (c == null || !c.isActive()) {
                throw ApiException.field("items", "One of the materials can't be booked right now. Remove it and try again.");
            }
        }
        r.getItems().removeIf(i -> !wanted.containsKey(i.getCategory().getId()));
        for (var e : wanted.entrySet()) {
            RequestItem existing = r.getItems().stream()
                    .filter(i -> i.getCategory().getId().equals(e.getKey())).findFirst().orElse(null);
            if (existing != null) existing.setEstimatedQty(e.getValue());
            else r.getItems().add(RequestItem.estimate(r, found.get(e.getKey()), e.getValue()));
        }
    }

    private void submit(CollectionRequest r, User customer) {
        booking.customerPreference(r.getPreferredDate(), r.getPreferredSlot());
        if (r.getItems().isEmpty()) throw ApiException.field("items", "Pick at least one material.");
        workflow.move(r, RequestStatus.SUBMITTED, customer, null, RequestEvent.Type.SUBMITTED, null, null);
        r.markSubmitted();
    }

    @Transactional
    public void deleteDraft(User customer, Long id) {
        CollectionRequest r = own(customer, id);
        if (r.getStatus() != RequestStatus.DRAFT) {
            throw new ApiException(HttpStatus.CONFLICT, "Only drafts can be deleted. Cancel the request instead.");
        }
        for (var p : photos.findByRequestIdOrderByUploadedAtAsc(r.getId())) {
            deleteQuietly(p.getPath());
            photos.delete(p);
        }
        requests.delete(r);
    }

    @Transactional
    public RequestDetail cancel(User customer, Long id, String reason) {
        CollectionRequest r = own(customer, id);
        if (!r.getStatus().isCancellableByCustomer()) {
            throw new ApiException(HttpStatus.CONFLICT, "This request can no longer be cancelled.");
        }
        Pickup active = pickups.findByRequestIdAndActiveTrue(r.getId()).orElse(null);
        LocalDateTime until = views.cancelDeadline(r, active);
        if (until != null && !clock.localNow().isBefore(until)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "It's past the cancellation cut-off for this pickup. Contact us if you can't be there.");
        }
        Long collectorId = active == null ? null : active.getCollectorId();
        if (active != null) workflow.deactivate(active);
        r.markCancelled(customer.getId(), reason.trim());
        workflow.move(r, RequestStatus.CANCELLED, customer, reason.trim(), RequestEvent.Type.CANCELLED, collectorId,
                Map.of("reason", reason.trim(), "by", "customer"));
        return views.detail(r, customer);
    }

    @Transactional
    public RequestDetail confirm(User customer, Long id, ConfirmInput in) {
        CollectionRequest r = own(customer, id);
        if (r.getStatus() != RequestStatus.COLLECTED) {
            throw new ApiException(HttpStatus.CONFLICT, "There's nothing to confirm on this request yet.");
        }
        if (!in.confirmed()) {
            throw ApiException.badRequest("If something is wrong, report an issue instead.");
        }
        confirmations.save(new RequestRecords.Confirmation(r.getId(), true, blankToNull(in.feedback()), customer.getId(), false));
        Long collectorId = pickups.findByRequestIdAndActiveTrue(r.getId()).map(Pickup::getCollectorId).orElse(null);
        workflow.move(r, RequestStatus.COMPLETED, customer, "Confirmed by customer", RequestEvent.Type.COMPLETED,
                collectorId, null);
        r.markCompleted();
        return views.detail(r, customer);
    }

    @Transactional
    public RequestDetail addPhoto(User customer, Long id, MultipartFile file) {
        CollectionRequest r = own(customer, id);
        if (!(r.getStatus().isEditableByCustomer() || r.getStatus().isInReview())) {
            throw new ApiException(HttpStatus.CONFLICT, "Photos can be added only before the request is accepted.");
        }
        if (photos.countByRequestIdAndKind(r.getId(), RequestRecords.Photo.Kind.CUSTOMER) >= MAX_CUSTOMER_PHOTOS) {
            throw ApiException.field("file", "You can add up to " + MAX_CUSTOMER_PHOTOS + " photos.");
        }
        UploadValidator.Checked c = uploads.check(file, UploadValidator.IMAGES, "file");
        String key = store(c);
        photos.save(new RequestRecords.Photo(r.getId(), RequestRecords.Photo.Kind.CUSTOMER, key, c.contentType(),
                c.bytes().length, customer.getId()));
        r.touch();
        return views.detail(r, customer);
    }

    @Transactional
    public RequestDetail deletePhoto(User customer, Long id, Long photoId) {
        CollectionRequest r = own(customer, id);
        var p = photos.findById(photoId).filter(x -> x.getRequestId().equals(r.getId())
                && x.getKind() == RequestRecords.Photo.Kind.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("We couldn't find that photo."));
        if (!r.getStatus().isEditableByCustomer()) {
            throw new ApiException(HttpStatus.CONFLICT, "Photos can be removed only from drafts.");
        }
        deleteQuietly(p.getPath());
        photos.delete(p);
        return views.detail(r, customer);
    }

    private String store(UploadValidator.Checked c) {
        try {
            return storage.save(c.bytes(), c.extension());
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "The photo could not be saved. Try again.");
        }
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (IOException ignored) {
            // the database row goes either way; an orphaned file is harmless
        }
    }

    // ---------- history and dashboard (brief §18) ----------

    public record CategoryTotal(String code, String name, String color, String unit, BigDecimal qty) {
    }

    public record MonthTotal(String month, BigDecimal kg) {
    }

    public record Summary(long total, long completed, long cancelled, long failed, long active, long drafts,
            BigDecimal kg, List<CategoryTotal> byCategory, List<MonthTotal> months, LocalDate since) {
    }

    @Transactional(readOnly = true)
    public Summary summary(User customer) {
        Long id = customer.getId();
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query("select status, count(*) from collection_requests where customer_id = ? group by status",
                rs -> { counts.put(rs.getString(1), rs.getLong(2)); }, id);
        long total = counts.entrySet().stream().filter(e -> !e.getKey().equals("DRAFT")).mapToLong(Map.Entry::getValue).sum();
        long active = counts.entrySet().stream()
                .filter(e -> RequestStatus.valueOf(e.getKey()).isOpen() && !e.getKey().equals("DRAFT"))
                .mapToLong(Map.Entry::getValue).sum();
        List<CategoryTotal> byCat = jdbc.query("""
                select c.code, c.name, c.color, coalesce(i.actual_unit, i.unit) u, sum(i.actual_qty) q
                from request_items i join collection_requests r on r.id = i.request_id
                join waste_categories c on c.id = i.category_id
                where r.customer_id = ? and r.status = 'COMPLETED' and i.actual_qty is not null
                group by c.code, c.name, c.color, c.sort_order, u order by q desc""",
                (rs, n) -> new CategoryTotal(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getBigDecimal(5)), id);
        BigDecimal kg = byCat.stream().filter(c -> c.unit().equals("KG")).map(CategoryTotal::qty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        YearMonth now = YearMonth.from(clock.today());
        for (int i = 5; i >= 0; i--) byMonth.put(now.minusMonths(i).toString(), BigDecimal.ZERO);
        jdbc.query("""
                select to_char(r.completed_at at time zone ?, 'YYYY-MM') m, sum(i.actual_qty)
                from request_items i join collection_requests r on r.id = i.request_id
                where r.customer_id = ? and r.status = 'COMPLETED' and coalesce(i.actual_unit, i.unit) = 'KG'
                  and r.completed_at >= ? group by m""",
                rs -> {
                    String m = rs.getString(1);
                    BigDecimal kgInMonth = rs.getBigDecimal(2);
                    byMonth.computeIfPresent(m, (k, v) -> kgInMonth);
                },
                clock.zone().getId(), id, java.sql.Timestamp.from(now.minusMonths(5).atDay(1)
                        .atStartOfDay(clock.zone()).toInstant()));
        List<MonthTotal> months = new ArrayList<>();
        byMonth.forEach((m, v) -> months.add(new MonthTotal(m, v)));
        return new Summary(total, counts.getOrDefault("COMPLETED", 0L), counts.getOrDefault("CANCELLED", 0L),
                counts.getOrDefault("FAILED", 0L), active, counts.getOrDefault("DRAFT", 0L), kg, byCat, months,
                LocalDate.ofInstant(customer.getCreatedAt(), clock.zone()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
