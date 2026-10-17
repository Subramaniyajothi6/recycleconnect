package com.recycleconnect.audit;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.user.User;

/** Writes the append-only audit log (brief §26: maintain important action history). */
@Service
public class AuditService {

    private final AuditRepository repository;

    public AuditService(AuditRepository repository) {
        this.repository = repository;
    }

    /** Records an action in the caller's transaction, so it is rolled back if the action fails. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(User actor, String action, String entity, Object entityId, Map<String, Object> details) {
        save(actor, action, entity, entityId, details);
    }

    /** For read-only actions with no transaction of their own (e.g. exporting a report). */
    @Transactional
    public void recordStandalone(User actor, String action, String entity, Object entityId, Map<String, Object> details) {
        save(actor, action, entity, entityId, details);
    }

    private void save(User actor, String action, String entity, Object entityId, Map<String, Object> details) {
        repository.save(new AuditEntry(
                actor != null ? actor.getId() : null,
                actor != null ? actor.getRole().name() : "SYSTEM",
                action, entity, entityId != null ? entityId.toString() : null, details));
    }
}
