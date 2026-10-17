package com.recycleconnect.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

/** Audit entries in plain words (no database). */
class AuditTextTests {

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    @Test
    void statusChangesReadAsWords() {
        assertThat(AuditText.details(map("from", "SCHEDULED", "to", "ASSIGNED", "date", "2026-10-09",
                "note", "Murugan Kannan", "slot", "14:00-16:00", "collector", "Murugan Kannan")))
                .isEqualTo("Scheduled → Collector assigned. Fri 9 Oct, 14:00 – 16:00. Collector: Murugan Kannan");
        assertThat(AuditText.details(map("from", "ACCEPTED", "to", "SCHEDULED", "date", "2026-10-09",
                "note", "2026-10-09 14:00-16:00", "slot", "14:00-16:00")))
                .isEqualTo("Accepted → Scheduled. Fri 9 Oct, 14:00 – 16:00");
        assertThat(AuditText.details(map("from", "COLLECTED", "to", "COMPLETED", "note", "Confirmed by customer")))
                .isEqualTo("Collected → Completed. Note: Confirmed by customer");
        // Reassigning keeps the status; say what changed instead of "Collector assigned → Collector assigned".
        assertThat(AuditText.details(map("from", "ASSIGNED", "to", "ASSIGNED", "date", "2026-10-08",
                "note", "Murugan Kannan", "slot", "16:00-18:00", "collector", "Murugan Kannan")))
                .isEqualTo("Collector changed to Murugan Kannan. Thu 8 Oct, 16:00 – 18:00");
        assertThat(AuditText.details(map("from", "SCHEDULED", "to", "SCHEDULED", "reason", "Collector is busy")))
                .isEqualTo("Reason: Collector is busy");
    }

    @Test
    void quantitiesAndCodesArePlain() {
        assertThat(AuditText.details(map("Paper", "13.40 -> 14", "resolution", "QUANTITY_CORRECTED")))
                .isEqualTo("Paper: 13.4 → 14. Resolution: quantity corrected");
        assertThat(AuditText.details(map("Paper", "13.4 KG", "Metal (added)", "2 KG")))
                .isEqualTo("Paper: 13.4 kg. Metal (added): 2 kg");
        assertThat(AuditText.details(map("kg", 19, "note", "19 kg recorded"))).isEqualTo("Collected: 19 kg. Note: 19 kg recorded");
        assertThat(AuditText.details(map("ip", "10.20.30.40"))).isEqualTo("IP address: 10.20.30.40");
        assertThat(AuditText.details(map("ip", "::1"))).isEqualTo("IP address: this computer");
        assertThat(AuditText.details(map("role", "COLLECTOR", "zones", List.of("Z7", "Z8")))).isEqualTo("Role: collector. Areas: Z7, Z8");
        assertThat(AuditText.details(map("value", "10.05"))).isEqualTo("value: 10.05");
        assertThat(AuditText.details(Map.of())).isEmpty();
    }

    @Test
    void actionCodesReadAsWords() {
        assertThat(AuditText.action("REQUEST_PICKUP_STARTED")).isEqualTo("Pickup started");
        assertThat(AuditText.action("APPROVE_COLLECTOR")).isEqualTo("Approve collector");
    }
}
