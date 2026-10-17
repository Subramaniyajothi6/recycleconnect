package com.recycleconnect.request;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.events.RequestEvent;
import com.recycleconnect.user.User;

/**
 * The only place request and pickup statuses change. Each change is checked against the state machine,
 * written to the status history and audit log, and published as a {@link RequestEvent}.
 */
@Component
@Transactional(propagation = Propagation.MANDATORY)
public class RequestWorkflow {

    private final StatusChangeRepository history;
    private final AuditService audit;
    private final ApplicationEventPublisher events;

    public RequestWorkflow(StatusChangeRepository history, AuditService audit, ApplicationEventPublisher events) {
        this.history = history;
        this.audit = audit;
        this.events = events;
    }

    /** Moves the request, records it, and publishes {@code event} (if not null). */
    public void move(CollectionRequest r, RequestStatus to, User actor, String note, RequestEvent.Type event,
            Long collectorId, Map<String, String> details) {
        RequestStatus from = r.getStatus();
        if (!from.canMoveTo(to)) {
            throw new ApiException(HttpStatus.CONFLICT, "This request is " + label(from)
                    + " and can't be changed that way. Reload to see its latest status.");
        }
        r.setStatus(to);
        history.save(new RequestRecords.StatusChange(r.getId(), from.name(), to.name(),
                actor != null ? actor.getId() : null, note));
        Map<String, Object> auditDetails = new LinkedHashMap<>();
        auditDetails.put("from", from.name());
        auditDetails.put("to", to.name());
        if (note != null) auditDetails.put("note", note);
        if (details != null) auditDetails.putAll(details);
        audit.record(actor, "REQUEST_" + to.name(), "request", r.getCode(), auditDetails);
        if (event != null) publish(event, r, collectorId, actor, details);
    }

    public void movePickup(Pickup p, PickupStatus to, User actor, String requestCode) {
        if (!p.getStatus().canMoveTo(to)) {
            throw new ApiException(HttpStatus.CONFLICT, "This pickup is already " + label(p.getStatus())
                    + ". Reload to see its latest step.");
        }
        PickupStatus from = p.getStatus();
        p.moveTo(to);
        audit.record(actor, "PICKUP_" + to.name(), "request", requestCode, Map.of("from", from.name(), "to", to.name()));
    }

    public void failPickup(Pickup p, FailReason reason, String note, User actor, String requestCode) {
        if (!p.getStatus().canMoveTo(PickupStatus.FAILED)) {
            throw new ApiException(HttpStatus.CONFLICT, "This pickup is already " + label(p.getStatus()) + ".");
        }
        p.fail(reason, note);
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("reason", reason.label());
        if (note != null) d.put("note", note);
        audit.record(actor, "PICKUP_FAILED", "request", requestCode, d);
    }

    public void deactivate(Pickup p) {
        p.deactivate();
    }

    public void reschedulePickup(Pickup p, LocalDate date, String slot) {
        p.reschedule(date, slot);
    }

    public void publish(RequestEvent.Type type, CollectionRequest r, Long collectorId, User actor,
            Map<String, String> details) {
        events.publishEvent(new RequestEvent(type, r.getId(), r.getCode(), r.getCustomerId(), collectorId,
                actor != null ? actor.getId() : null, details == null ? Map.of() : details));
    }

    static String label(Enum<?> status) {
        return status.name().toLowerCase().replace('_', ' ');
    }
}
