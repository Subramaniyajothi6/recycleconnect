package com.recycleconnect.request;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.recycleconnect.catalog.WasteCategory;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.request.RequestDtos.Actions;
import com.recycleconnect.request.RequestDtos.ConfirmationView;
import com.recycleconnect.request.RequestDtos.HistoryView;
import com.recycleconnect.request.RequestDtos.ItemView;
import com.recycleconnect.request.RequestDtos.PersonView;
import com.recycleconnect.request.RequestDtos.PhotoView;
import com.recycleconnect.request.RequestDtos.PickupView;
import com.recycleconnect.request.RequestDtos.RequestCard;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.RescheduleView;
import com.recycleconnect.request.RequestDtos.TimelineStep;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.CollectorProfile;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.CustomerProfileRepository;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.zone.ZoneRepository;

/**
 * Builds what a viewer sees of a request. Privacy (brief §26): phone numbers are full only for admins, and for
 * the customer and collector of a pickup that is in progress; everyone else sees them masked.
 */
@Component
public class RequestViews {

    private static final List<String[]> STEPS = List.of(
            new String[] { "SUBMITTED", "Request submitted" },
            new String[] { "ACCEPTED", "Accepted" },
            new String[] { "SCHEDULED", "Pickup scheduled" },
            new String[] { "ASSIGNED", "Collector assigned" },
            new String[] { "PICKUP_STARTED", "Pickup started" },
            new String[] { "COLLECTED", "Material collected" },
            new String[] { "COMPLETED", "Collection completed" });

    private final UserRepository users;
    private final CustomerProfileRepository customers;
    private final CollectorProfileRepository collectors;
    private final ZoneRepository zones;
    private final PickupRepository pickups;
    private final PhotoRepository photos;
    private final RescheduleRepository reschedules;
    private final StatusChangeRepository history;
    private final ConfirmationRepository confirmations;
    private final SettingsService settings;
    private final BusinessClock clock;

    public RequestViews(UserRepository users, CustomerProfileRepository customers,
            CollectorProfileRepository collectors, ZoneRepository zones, PickupRepository pickups,
            PhotoRepository photos, RescheduleRepository reschedules, StatusChangeRepository history,
            ConfirmationRepository confirmations, SettingsService settings, BusinessClock clock) {
        this.users = users;
        this.customers = customers;
        this.collectors = collectors;
        this.zones = zones;
        this.pickups = pickups;
        this.photos = photos;
        this.reschedules = reschedules;
        this.history = history;
        this.confirmations = confirmations;
        this.settings = settings;
        this.clock = clock;
    }

    public static String mask(String mobile) {
        if (mobile == null || mobile.length() != 10) return mobile;
        return "+91 " + mobile.substring(0, 2) + "••• ••" + mobile.substring(7);
    }

    public static String full(String mobile) {
        if (mobile == null || mobile.length() != 10) return mobile;
        return "+91 " + mobile.substring(0, 5) + " " + mobile.substring(5);
    }

    public static List<ItemView> items(CollectionRequest r) {
        return r.getItems().stream().map(RequestViews::item).toList();
    }

    static ItemView item(RequestItem i) {
        WasteCategory c = i.getCategory();
        return new ItemView(c.getId(), c.getCode(), c.getName(), c.getColor(), i.getUnit().name(),
                i.getEstimatedQty(), i.getActualQty(), i.getActualUnit() == null ? null : i.getActualUnit().name(),
                i.isAddedByCollector());
    }

    /** Total kilograms (pieces are not added in). */
    public static BigDecimal kg(Collection<RequestItem> items, boolean actual) {
        BigDecimal sum = BigDecimal.ZERO;
        for (RequestItem i : items) {
            BigDecimal q = actual ? i.getActualQty() : i.getEstimatedQty();
            WasteCategory.Unit u = actual ? i.getActualUnit() : i.getUnit();
            if (q != null && u == WasteCategory.Unit.KG) sum = sum.add(q);
        }
        return sum;
    }

    public RequestDetail detail(CollectionRequest r, User viewer) {
        List<Pickup> all = pickups.findByRequestIdOrderByAssignedAtAsc(r.getId());
        Pickup active = all.stream().filter(Pickup::isActive).findFirst().orElse(null);
        if (viewer.getRole() == Role.COLLECTOR) {
            all = all.stream().filter(p -> p.getCollectorId().equals(viewer.getId())).toList();
            if (active != null && !active.getCollectorId().equals(viewer.getId())) active = null;
        }
        List<RequestRecords.Reschedule> rs = reschedules.findByRequestIdOrderByChangedAtAsc(r.getId());
        List<RequestRecords.StatusChange> hs = history.findByRequestIdOrderByAtAscIdAsc(r.getId());

        Set<Long> ids = new HashSet<>();
        ids.add(r.getCustomerId());
        all.forEach(p -> ids.add(p.getCollectorId()));
        rs.forEach(x -> ids.add(x.getChangedBy()));
        hs.forEach(h -> { if (h.getByUser() != null) ids.add(h.getByUser()); });
        if (r.getCancelledBy() != null) ids.add(r.getCancelledBy());
        Map<Long, User> people = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, CollectorProfile> vehicles = collectors.findAllById(
                all.stream().map(Pickup::getCollectorId).toList()).stream()
                .collect(Collectors.toMap(CollectorProfile::getUserId, Function.identity()));

        boolean inProgress = active != null && !active.getStatus().isFinished()
                && active.getStatus() != PickupStatus.ASSIGNED;
        boolean admin = viewer.getRole() == Role.ADMIN;
        User customer = people.get(r.getCustomerId());
        String customerType = customers.findById(r.getCustomerId()).map(p -> p.getCustomerType().name()).orElse(null);
        PersonView customerView = new PersonView(customer.getId(), customer.getName(),
                admin || (viewer.getRole() == Role.COLLECTOR && inProgress) || viewer.getId().equals(customer.getId())
                        ? full(customer.getMobile()) : mask(customer.getMobile()),
                customerType);

        Function<Pickup, PickupView> pickupView = p -> {
            User c = people.get(p.getCollectorId());
            CollectorProfile v = vehicles.get(p.getCollectorId());
            boolean showPhone = admin || viewer.getId().equals(p.getCollectorId())
                    || (p == null ? false : p.isActive() && inProgress);
            return new PickupView(p.getId(),
                    new PersonView(c.getId(), c.getName(), showPhone ? full(c.getMobile()) : mask(c.getMobile()),
                            v == null ? null : v.getVehicleNumber()),
                    p.getScheduledDate(), p.getSlot(), p.getStatus().name(), p.getAssignedAt(), p.getAcceptedAt(),
                    p.getStartedAt(), p.getArrivedAt(), p.getCollectedAt(), p.getCompletedAt(),
                    p.getFailReason() == null ? null : p.getFailReason().label(), p.getFailNote(),
                    admin || viewer.getRole() == Role.COLLECTOR ? p.getCollectorNotes() : null);
        };

        String zoneName = r.getZoneId() == null ? null : zones.findById(r.getZoneId()).map(z -> z.getName()).orElse(null);
        Function<Long, String> name = id -> id == null ? "System" : people.containsKey(id) ? people.get(id).getName() : "Someone";

        var conf = confirmations.findById(r.getId())
                .map(c -> new ConfirmationView(c.isConfirmed(), c.getFeedback(), c.getAt(), c.isAuto())).orElse(null);

        return new RequestDetail(r.getId(), r.getCode(), r.getStatus().name(), customerView, customerType,
                r.getAddressLabel(), r.addressText(), r.getAddressArea(), r.getLat(), r.getLng(), r.getZoneId(), zoneName,
                r.getPreferredDate(), r.getPreferredSlot(), r.getScheduledDate(), r.getScheduledSlot(), r.getNotes(), items(r),
                photos.findByRequestIdOrderByUploadedAtAsc(r.getId()).stream()
                        .map(ph -> new PhotoView(ph.getId(), ph.getKind().name(), ph.getUploadedAt())).toList(),
                active == null ? null : pickupView.apply(active),
                all.stream().filter(p -> !p.isActive()).map(pickupView).toList(),
                rs.stream().map(x -> new RescheduleView(x.getFromDate(), x.getFromSlot(), x.getToDate(), x.getToSlot(),
                        x.getReason(), viewer.getRole() == Role.CUSTOMER && !x.getChangedBy().equals(viewer.getId())
                                ? "RecycleConnect" : name.apply(x.getChangedBy()), x.getChangedAt())).toList(),
                timeline(r, hs, active, people),
                admin ? hs.stream().map(h -> new HistoryView(h.getFromStatus(), h.getToStatus(), name.apply(h.getByUser()),
                        h.getAt(), h.getNote())).toList() : List.of(),
                conf, r.getRejectReason(), r.getInfoRequest(), r.getCancelReason(),
                r.getCancelledBy() == null ? null : name.apply(r.getCancelledBy()), r.getCancelledAt(),
                r.getCreatedAt(), r.getSubmittedAt(), r.getCompletedAt(), r.getAddressId(),
                actions(r, viewer, active, conf != null), Overdue.is(r, clock.localNow()));
    }

    private List<TimelineStep> timeline(CollectionRequest r, List<RequestRecords.StatusChange> hs, Pickup active,
            Map<Long, User> people) {
        Map<String, Instant> reached = new HashMap<>();
        for (RequestRecords.StatusChange h : hs) reached.putIfAbsent(h.getToStatus(), h.getAt());
        List<TimelineStep> out = new ArrayList<>();
        boolean open = r.getStatus().isOpen();
        boolean currentSet = false;
        for (String[] s : STEPS) {
            Instant at = reached.get(s[0]);
            boolean done = at != null && stepIndex(r.getStatus()) >= stepIndex(RequestStatus.valueOf(s[0]));
            String detail = null;
            if (s[0].equals("SCHEDULED") && r.getScheduledDate() != null) detail = r.getScheduledDate() + " " + r.getScheduledSlot();
            if (s[0].equals("ASSIGNED") && active != null) detail = people.get(active.getCollectorId()).getName();
            if (s[0].equals("PICKUP_STARTED") && done && active != null) {
                detail = people.get(active.getCollectorId()).getName() + " is on the way";
            }
            if (s[0].equals("COLLECTED") && done) detail = kg(r.getItems(), true).stripTrailingZeros().toPlainString() + " kg recorded";
            boolean current = false;
            if (!done && open && !currentSet && r.getStatus() != RequestStatus.DRAFT) {
                current = true;
                currentSet = true;
            }
            out.add(new TimelineStep(s[0], s[1], done, current, done ? at : null, detail));
        }
        if (r.getStatus() == RequestStatus.CANCELLED || r.getStatus() == RequestStatus.REJECTED
                || r.getStatus() == RequestStatus.FAILED) {
            String label = switch (r.getStatus()) {
                case CANCELLED -> "Request cancelled";
                case REJECTED -> "Request rejected";
                default -> "Pickup failed";
            };
            String detail = switch (r.getStatus()) {
                case CANCELLED -> r.getCancelReason();
                case REJECTED -> r.getRejectReason();
                default -> active != null && active.getFailReason() != null ? active.getFailReason().label() : null;
            };
            out.removeIf(t -> !t.done());
            out.add(new TimelineStep(r.getStatus().name(), label, true, false, reached.get(r.getStatus().name()), detail));
        }
        return out;
    }

    /** Position on the happy path, so "done" means reached and not later undone (e.g. after a reschedule). */
    private static int stepIndex(RequestStatus s) {
        return switch (s) {
            case DRAFT -> -1;
            case SUBMITTED, UNDER_REVIEW, INFO_REQUESTED -> 0;
            case ACCEPTED -> 1;
            case SCHEDULED -> 2;
            case ASSIGNED -> 3;
            case PICKUP_STARTED -> 4;
            case COLLECTED -> 5;
            case COMPLETED -> 6;
            case CANCELLED, REJECTED, FAILED -> 7;
        };
    }

    Actions actions(CollectionRequest r, User viewer, Pickup active, boolean confirmed) {
        if (viewer.getRole() != Role.CUSTOMER) {
            return new Actions(false, false, false, null, false, false);
        }
        LocalDateTime until = cancelDeadline(r, active);
        boolean beforeCutoff = until == null || clock.localNow().isBefore(until);
        boolean canCancel = r.getStatus().isCancellableByCustomer() && beforeCutoff;
        return new Actions(r.getStatus().isEditableByCustomer(), r.getStatus().isEditableByCustomer(), canCancel,
                r.getStatus().isCancellableByCustomer() ? until : null,
                r.getStatus() == RequestStatus.COLLECTED && !confirmed,
                r.getStatus() == RequestStatus.COLLECTED || r.getStatus() == RequestStatus.COMPLETED
                        || r.getStatus() == RequestStatus.FAILED);
    }

    /** The customer's cancel cut-off: based on the booked pickup, or the preferred slot before booking. */
    public LocalDateTime cancelDeadline(CollectionRequest r, Pickup active) {
        Rules rules = settings.rules();
        if (active != null) return rules.cancelDeadline(active.getScheduledDate(), active.getSlot());
        if (r.getScheduledDate() != null && rules.isValidSlot(r.getScheduledSlot())) {
            return rules.cancelDeadline(r.getScheduledDate(), r.getScheduledSlot());
        }
        if (r.getPreferredDate() != null && r.getPreferredSlot() != null && rules.isValidSlot(r.getPreferredSlot())) {
            return rules.cancelDeadline(r.getPreferredDate(), r.getPreferredSlot());
        }
        return null;
    }

    /** Cards for lists. Loads the people and active pickups in two queries. */
    public List<RequestCard> cards(List<CollectionRequest> list, boolean forAdmin) {
        if (list.isEmpty()) return List.of();
        Map<Long, Pickup> activeByRequest = new HashMap<>();
        for (CollectionRequest r : list) {
            pickups.findByRequestIdAndActiveTrue(r.getId()).ifPresent(p -> activeByRequest.put(r.getId(), p));
        }
        Set<Long> ids = new HashSet<>();
        list.forEach(r -> ids.add(r.getCustomerId()));
        activeByRequest.values().forEach(p -> ids.add(p.getCollectorId()));
        Map<Long, User> people = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<Long, String> types = forAdmin
                ? customers.findAllById(list.stream().map(CollectionRequest::getCustomerId).toList()).stream()
                        .collect(Collectors.toMap(p -> p.getUserId(), p -> p.getCustomerType().name()))
                : Map.of();
        LocalDateTime now = clock.localNow();
        return list.stream().map(r -> {
            Pickup p = activeByRequest.get(r.getId());
            String collector = p == null ? null : people.get(p.getCollectorId()).getName();
            boolean booked = r.getScheduledDate() != null;
            return new RequestCard(r.getId(), r.getCode(), r.getStatus().name(),
                    booked ? r.getScheduledDate() : r.getPreferredDate(),
                    booked ? r.getScheduledSlot() : r.getPreferredSlot(), booked, items(r), collector,
                    people.get(r.getCustomerId()).getName(), types.get(r.getCustomerId()), r.getAddressArea(),
                    kg(r.getItems(), false), kg(r.getItems(), true), note(r, p, collector), r.getCreatedAt(),
                    r.getUpdatedAt(), p == null ? null : p.getStatus().name(), Overdue.is(r, now));
        }).toList();
    }

    private static String note(CollectionRequest r, Pickup p, String collector) {
        return switch (r.getStatus()) {
            case DRAFT -> "Draft, not submitted yet";
            case SUBMITTED, UNDER_REVIEW -> "Waiting for review";
            case INFO_REQUESTED -> "We need more information";
            case ACCEPTED -> "Accepted, waiting for a pickup slot";
            case SCHEDULED -> "Pickup booked, collector to be assigned";
            case ASSIGNED, PICKUP_STARTED -> collector + " will collect";
            case COLLECTED -> "Collected, please confirm";
            case COMPLETED -> kg(r.getItems(), true).stripTrailingZeros().toPlainString() + " kg collected";
            case CANCELLED -> "Cancelled" + (r.getCancelReason() != null ? ": " + r.getCancelReason() : "");
            case REJECTED -> "Rejected" + (r.getRejectReason() != null ? ": " + r.getRejectReason() : "");
            case FAILED -> p != null && p.getFailReason() != null ? "Failed: " + p.getFailReason().label() : "Pickup failed";
        };
    }
}
