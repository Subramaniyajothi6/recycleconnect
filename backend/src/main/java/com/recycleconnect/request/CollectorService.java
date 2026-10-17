package com.recycleconnect.request;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.catalog.WasteCategory;
import com.recycleconnect.catalog.WasteCategoryRepository;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.files.FileStorage;
import com.recycleconnect.files.UploadValidator;
import com.recycleconnect.request.RequestDtos.ItemView;
import com.recycleconnect.request.RequestDtos.RecordInput;
import com.recycleconnect.request.RequestDtos.RecordItemInput;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.routing.RoutePlanner;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.CollectorProfile;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.CustomerProfileRepository;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;

/** The collector's work (brief §10–§12, §14, §19). Every method checks the pickup is assigned to this collector. */
@Service
public class CollectorService {

    static final int MAX_EVIDENCE_PHOTOS = 4;

    public record Stop(Long pickupId, Long requestId, String code, String customer, String customerType, String area,
            String address, Double lat, Double lng, LocalDate date, String slot, String pickupStatus,
            List<ItemView> items, BigDecimal estimatedKg, BigDecimal actualKg, String failReason, String notes) {
    }

    public record Counts(long today, long pending, long completed, long failed, BigDecimal kg) {
    }

    public record Today(LocalDate date, Counts counts, List<Stop> stops, List<Stop> needsAnswer, String zones) {
    }

    public record Day(LocalDate date, long count, BigDecimal estimatedKg, List<Stop> stops) {
    }

    public record Assigned(List<Stop> needsAnswer, List<Day> days) {
    }

    public record HistoryDay(LocalDate date, BigDecimal kg, List<Stop> stops) {
    }

    public record Stats(long completed, long failed, BigDecimal kg, int onTimePercent) {
    }

    public record History(String month, Stats stats, List<HistoryDay> days) {
    }

    private final PickupRepository pickups;
    private final CollectionRequestRepository requests;
    private final WasteCategoryRepository categories;
    private final PhotoRepository photos;
    private final UserRepository users;
    private final CustomerProfileRepository customers;
    private final CollectorProfileRepository profiles;
    private final RequestWorkflow workflow;
    private final RequestViews views;
    private final RoutePlanner planner;
    private final UploadValidator uploads;
    private final FileStorage storage;
    private final SettingsService settings;
    private final BusinessClock clock;
    private final AuditService audit;

    public CollectorService(PickupRepository pickups, CollectionRequestRepository requests,
            WasteCategoryRepository categories, PhotoRepository photos, UserRepository users,
            CustomerProfileRepository customers, CollectorProfileRepository profiles, RequestWorkflow workflow,
            RequestViews views, RoutePlanner planner, UploadValidator uploads, FileStorage storage,
            SettingsService settings, BusinessClock clock, AuditService audit) {
        this.pickups = pickups;
        this.requests = requests;
        this.categories = categories;
        this.photos = photos;
        this.users = users;
        this.customers = customers;
        this.profiles = profiles;
        this.workflow = workflow;
        this.views = views;
        this.planner = planner;
        this.uploads = uploads;
        this.storage = storage;
        this.settings = settings;
        this.clock = clock;
        this.audit = audit;
    }

    private Pickup mine(User collector, Long pickupId) {
        return pickups.findByIdAndCollectorId(pickupId, collector.getId())
                .orElseThrow(() -> ApiException.notFound("We couldn't find that pickup."));
    }

    private Pickup mineActive(User collector, Long pickupId) {
        Pickup p = mine(collector, pickupId);
        if (!p.isActive()) throw new ApiException(HttpStatus.CONFLICT, "This pickup was moved to someone else or cancelled.");
        return p;
    }

    private CollectionRequest requestOf(Pickup p) {
        return requests.findById(p.getRequestId()).orElseThrow();
    }

    // ---------- lists ----------

    @Transactional(readOnly = true)
    public Today today(User collector, LocalDate date, String status, Long categoryId) {
        LocalDate day = date != null ? date : clock.today();
        List<Pickup> list = pickups.findByCollectorIdAndScheduledDateAndActiveTrueOrderBySlotAsc(collector.getId(), day);
        List<Stop> all = stops(list);
        long completed = all.stream().filter(s -> s.pickupStatus().equals("COMPLETED") || s.pickupStatus().equals("COLLECTED")).count();
        long failed = all.stream().filter(s -> s.pickupStatus().equals("FAILED")).count();
        BigDecimal kg = all.stream().map(Stop::actualKg).reduce(BigDecimal.ZERO, BigDecimal::add);
        Counts counts = new Counts(all.size(), all.size() - completed - failed, completed, failed, kg);

        List<Stop> filtered = all.stream()
                .filter(s -> status == null || status.isBlank() || matchesStatus(s.pickupStatus(), status))
                .filter(s -> categoryId == null || s.items().stream().anyMatch(i -> i.categoryId().equals(categoryId)))
                .toList();
        // Route order: open stops in planned order, finished ones after.
        Map<Long, Stop> byId = filtered.stream().collect(Collectors.toMap(Stop::pickupId, Function.identity()));
        List<RoutePlanner.Stop> open = filtered.stream().filter(s -> !isDone(s.pickupStatus()))
                .map(s -> new RoutePlanner.Stop(s.pickupId(), s.slot(), s.lat(), s.lng())).toList();
        List<Stop> ordered = new ArrayList<>();
        planner.order(null, null, open).forEach(r -> ordered.add(byId.get(r.id())));
        filtered.stream().filter(s -> isDone(s.pickupStatus())).forEach(ordered::add);

        List<Stop> needs = stops(pickups.findUpcoming(collector.getId(), clock.today())).stream()
                .filter(s -> s.pickupStatus().equals("ASSIGNED")).toList();
        String zones = profiles.findById(collector.getId())
                .map(p -> p.getZones().stream().map(z -> z.getName()).sorted().collect(Collectors.joining(", "))).orElse("");
        return new Today(day, counts, ordered, needs, zones);
    }

    private static boolean isDone(String s) {
        return s.equals("COMPLETED") || s.equals("COLLECTED") || s.equals("FAILED");
    }

    private static boolean matchesStatus(String pickupStatus, String filter) {
        return switch (filter) {
            case "pending" -> !isDone(pickupStatus);
            case "completed" -> pickupStatus.equals("COMPLETED") || pickupStatus.equals("COLLECTED");
            case "failed" -> pickupStatus.equals("FAILED");
            default -> true;
        };
    }

    @Transactional(readOnly = true)
    public Assigned assigned(User collector) {
        List<Stop> upcoming = stops(pickups.findUpcoming(collector.getId(), clock.today()));
        Map<LocalDate, List<Stop>> byDay = new LinkedHashMap<>();
        upcoming.forEach(s -> byDay.computeIfAbsent(s.date(), k -> new ArrayList<>()).add(s));
        List<Day> days = byDay.entrySet().stream().map(e -> new Day(e.getKey(), e.getValue().size(),
                e.getValue().stream().map(Stop::estimatedKg).reduce(BigDecimal.ZERO, BigDecimal::add), e.getValue())).toList();
        return new Assigned(upcoming.stream().filter(s -> s.pickupStatus().equals("ASSIGNED")).toList(), days);
    }

    @Transactional(readOnly = true)
    public History history(User collector, YearMonth month, String status, Long categoryId) {
        YearMonth m = month != null ? month : YearMonth.from(clock.today());
        List<Pickup> list = pickups.findByCollectorIdAndScheduledDateBetweenOrderByScheduledDateDescSlotAsc(
                collector.getId(), m.atDay(1), m.atEndOfMonth()).stream()
                .filter(p -> p.getStatus().isFinished() || p.getStatus() == PickupStatus.COLLECTED).toList();
        List<Stop> all = stops(list).stream()
                .filter(s -> status == null || status.isBlank() || matchesStatus(s.pickupStatus(), status))
                .filter(s -> categoryId == null || s.items().stream().anyMatch(i -> i.categoryId().equals(categoryId)))
                .toList();
        Map<LocalDate, List<Stop>> byDay = new LinkedHashMap<>();
        all.forEach(s -> byDay.computeIfAbsent(s.date(), k -> new ArrayList<>()).add(s));
        List<HistoryDay> days = byDay.entrySet().stream().map(e -> new HistoryDay(e.getKey(),
                e.getValue().stream().map(Stop::actualKg).reduce(BigDecimal.ZERO, BigDecimal::add), e.getValue())).toList();
        return new History(m.toString(), stats(collector.getId(), m), days);
    }

    /** Month figures for the profile and history headers. On time = collected before the slot ended. */
    @Transactional(readOnly = true)
    public Stats stats(Long collectorId, YearMonth month) {
        List<Pickup> list = pickups.findByCollectorIdAndScheduledDateBetweenOrderByScheduledDateDescSlotAsc(
                collectorId, month.atDay(1), month.atEndOfMonth());
        long done = 0, failed = 0, onTime = 0;
        BigDecimal kg = BigDecimal.ZERO;
        Map<Long, CollectionRequest> reqs = requests.findAllById(list.stream().map(Pickup::getRequestId).toList()).stream()
                .collect(Collectors.toMap(CollectionRequest::getId, Function.identity()));
        for (Pickup p : list) {
            if (p.getStatus() == PickupStatus.FAILED) failed++;
            if (p.getStatus() == PickupStatus.COMPLETED || p.getStatus() == PickupStatus.COLLECTED) {
                done++;
                kg = kg.add(RequestViews.kg(reqs.get(p.getRequestId()).getItems(), true));
                Instant end = ZonedDateTime.of(p.getScheduledDate(), Rules.slotEnd(p.getSlot()), clock.zone()).toInstant();
                if (p.getCollectedAt() != null && !p.getCollectedAt().isAfter(end)) onTime++;
            }
        }
        return new Stats(done, failed, kg, done == 0 ? 100 : (int) Math.round(onTime * 100.0 / done));
    }

    private List<Stop> stops(List<Pickup> list) {
        if (list.isEmpty()) return List.of();
        Map<Long, CollectionRequest> reqs = requests.findAllById(list.stream().map(Pickup::getRequestId).toList()).stream()
                .collect(Collectors.toMap(CollectionRequest::getId, Function.identity()));
        List<Long> customerIds = reqs.values().stream().map(CollectionRequest::getCustomerId).distinct().toList();
        Map<Long, User> people = users.findAllById(customerIds).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, String> types = customers.findAllById(customerIds).stream()
                .collect(Collectors.toMap(c -> c.getUserId(), c -> c.getCustomerType().name()));
        return list.stream().map(p -> {
            CollectionRequest r = reqs.get(p.getRequestId());
            return new Stop(p.getId(), r.getId(), r.getCode(), people.get(r.getCustomerId()).getName(),
                    types.get(r.getCustomerId()), r.getAddressArea(), r.addressText(), r.getLat(), r.getLng(),
                    p.getScheduledDate(), p.getSlot(), p.getStatus().name(), RequestViews.items(r),
                    RequestViews.kg(r.getItems(), false), RequestViews.kg(r.getItems(), true),
                    p.getFailReason() == null ? null : p.getFailReason().label(), r.getNotes());
        }).toList();
    }

    @Transactional(readOnly = true)
    public RequestDetail detail(User collector, Long pickupId) {
        Pickup p = mine(collector, pickupId);
        return views.detail(requestOf(p), collector);
    }

    // ---------- steps (brief §11) ----------

    @Transactional
    public RequestDetail step(User collector, Long pickupId, PickupStatus to) {
        Pickup p = mineActive(collector, pickupId);
        CollectionRequest r = requestOf(p);
        if (to != PickupStatus.ACCEPTED && to != PickupStatus.ON_THE_WAY && to != PickupStatus.ARRIVED
                && to != PickupStatus.COLLECTION_STARTED) {
            throw ApiException.badRequest("Use Save quantities, Mark completed or Can't complete for that step.");
        }
        if (to == PickupStatus.ON_THE_WAY && !p.getScheduledDate().equals(clock.today())) {
            throw new ApiException(HttpStatus.CONFLICT, "You can start the trip only on the pickup day.");
        }
        workflow.movePickup(p, to, collector, r.getCode());
        if (to == PickupStatus.ACCEPTED) {
            workflow.publish(RequestEvent.Type.PICKUP_ACCEPTED, r, collector.getId(), collector, null);
        }
        if (to == PickupStatus.ON_THE_WAY) {
            workflow.move(r, RequestStatus.PICKUP_STARTED, collector, null, RequestEvent.Type.PICKUP_STARTED,
                    collector.getId(), Map.of("collector", collector.getName()));
        }
        return views.detail(r, collector);
    }

    /** "Ask to reassign": hands a not-yet-accepted pickup back to the office. */
    @Transactional
    public void decline(User collector, Long pickupId, String reason) {
        Pickup p = mineActive(collector, pickupId);
        if (p.getStatus() != PickupStatus.ASSIGNED) {
            throw new ApiException(HttpStatus.CONFLICT, "You've already accepted this pickup. Call the office to hand it back.");
        }
        CollectionRequest r = requestOf(p);
        workflow.deactivate(p);
        workflow.move(r, RequestStatus.SCHEDULED, collector, "Collector asked to reassign: " + reason,
                RequestEvent.Type.UNASSIGNED, collector.getId(), Map.of("declined", "true", "reason", reason));
    }

    /** Records actual quantities (brief §12) and marks the pickup collected. */
    @Transactional
    public RequestDetail record(User collector, Long pickupId, RecordInput in) {
        Pickup p = mineActive(collector, pickupId);
        CollectionRequest r = requestOf(p);
        if (p.getStatus() != PickupStatus.COLLECTION_STARTED && p.getStatus() != PickupStatus.ARRIVED) {
            throw new ApiException(HttpStatus.CONFLICT, "Start the collection before recording quantities.");
        }
        if (p.getStatus() == PickupStatus.ARRIVED) workflow.movePickup(p, PickupStatus.COLLECTION_STARTED, collector, r.getCode());
        if (settings.rules().photoRequired()
                && photos.countByRequestIdAndKind(r.getId(), RequestRecords.Photo.Kind.EVIDENCE) == 0) {
            throw ApiException.field("photo", "Add a photo of the material before saving.");
        }
        Map<Long, RecordItemInput> byCategory = new LinkedHashMap<>();
        for (RecordItemInput i : in.items()) {
            if (byCategory.put(i.categoryId(), i) != null) throw ApiException.field("items", "Each material can be recorded only once.");
        }
        Map<String, Object> recorded = new LinkedHashMap<>();
        for (RequestItem item : r.getItems()) {
            RecordItemInput i = byCategory.remove(item.getCategory().getId());
            item.recordActual(i == null ? BigDecimal.ZERO : i.qty(), i == null ? item.getUnit() : i.unit());
            recorded.put(item.getCategory().getName(), item.getActualQty() + " " + item.getActualUnit());
        }
        for (RecordItemInput i : byCategory.values()) {
            WasteCategory c = categories.findById(i.categoryId())
                    .orElseThrow(() -> ApiException.field("items", "One of the materials doesn't exist."));
            RequestItem extra = RequestItem.foundAtPickup(r, c);
            extra.recordActual(i.qty(), i.unit());
            r.getItems().add(extra);
            recorded.put(c.getName() + " (added)", i.qty() + " " + i.unit());
        }
        if (RequestViews.kg(r.getItems(), true).signum() == 0
                && r.getItems().stream().allMatch(i -> i.getActualQty() == null || i.getActualQty().signum() == 0)) {
            throw ApiException.field("items", "Nothing was recorded. If there was nothing to collect, mark the pickup failed.");
        }
        p.setCollectorNotes(in.notes() == null || in.notes().isBlank() ? null : in.notes().trim());
        workflow.movePickup(p, PickupStatus.COLLECTED, collector, r.getCode());
        audit.record(collector, "RECORD_QUANTITY", "request", r.getCode(), recorded);
        String kg = RequestViews.kg(r.getItems(), true).stripTrailingZeros().toPlainString();
        workflow.move(r, RequestStatus.COLLECTED, collector, kg + " kg recorded", RequestEvent.Type.COLLECTED,
                collector.getId(), Map.of("kg", kg));
        return views.detail(r, collector);
    }

    @Transactional
    public RequestDetail complete(User collector, Long pickupId) {
        Pickup p = mineActive(collector, pickupId);
        CollectionRequest r = requestOf(p);
        workflow.movePickup(p, PickupStatus.COMPLETED, collector, r.getCode());
        workflow.publish(RequestEvent.Type.PICKUP_COMPLETED, r, collector.getId(), collector, null);
        return views.detail(r, collector);
    }

    @Transactional
    public RequestDetail fail(User collector, Long pickupId, FailReason reason, String note) {
        Pickup p = mineActive(collector, pickupId);
        CollectionRequest r = requestOf(p);
        workflow.failPickup(p, reason, note == null || note.isBlank() ? null : note.trim(), collector, r.getCode());
        workflow.move(r, RequestStatus.FAILED, collector, reason.label(), RequestEvent.Type.FAILED, collector.getId(),
                Map.of("reason", reason.label()));
        return views.detail(r, collector);
    }

    @Transactional
    public RequestDetail addEvidence(User collector, Long pickupId, MultipartFile file) {
        Pickup p = mineActive(collector, pickupId);
        if (p.getStatus() != PickupStatus.ARRIVED && p.getStatus() != PickupStatus.COLLECTION_STARTED
                && p.getStatus() != PickupStatus.COLLECTED) {
            throw new ApiException(HttpStatus.CONFLICT, "Add photos when you're at the pickup.");
        }
        CollectionRequest r = requestOf(p);
        if (photos.countByRequestIdAndKind(r.getId(), RequestRecords.Photo.Kind.EVIDENCE) >= MAX_EVIDENCE_PHOTOS) {
            throw ApiException.field("file", "You can add up to " + MAX_EVIDENCE_PHOTOS + " photos.");
        }
        UploadValidator.Checked c = uploads.check(file, UploadValidator.IMAGES, "file");
        String key;
        try {
            key = storage.save(c.bytes(), c.extension());
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "The photo could not be saved. Try again.");
        }
        photos.save(new RequestRecords.Photo(r.getId(), RequestRecords.Photo.Kind.EVIDENCE, key, c.contentType(),
                c.bytes().length, collector.getId()));
        return views.detail(r, collector);
    }

    // ---------- account ----------

    @Transactional
    public void setAvailable(User collector, boolean available) {
        CollectorProfile p = profiles.findById(collector.getId()).orElseThrow();
        p.setAvailable(available);
        audit.record(collector, available ? "COLLECTOR_AVAILABLE" : "COLLECTOR_ON_LEAVE", "user", collector.getId(), Map.of());
    }

    @Transactional
    public void uploadIdProof(User collector, MultipartFile file) {
        CollectorProfile p = profiles.findById(collector.getId()).orElseThrow();
        UploadValidator.Checked c = uploads.check(file, UploadValidator.IMAGES_AND_PDF, "file");
        try {
            String old = p.getIdProofPath();
            p.setIdProof(storage.save(c.bytes(), c.extension()), c.contentType());
            if (old != null) storage.delete(old);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "The file could not be saved. Try again.");
        }
        audit.record(collector, "UPLOAD_ID_PROOF", "user", collector.getId(), Map.of());
    }
}
