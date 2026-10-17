package com.recycleconnect.request;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.recycleconnect.IntegrationTest;

/** The whole brief workflow through the API, plus the rules that guard each step. */
class WorkflowTests extends IntegrationTest {

    private String step(long pickupId, String token, String to) throws Exception {
        return postJson("/api/collector/pickups/" + pickupId + "/step", token, "{\"to\":\"" + to + "\"}")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void fullWorkflowFromListingToCompletion() throws Exception {
        String admin = adminToken();
        Session customer = newCustomer();
        Session collector = approvedCollector(admin);

        // Material listing -> collection request
        long id = submittedRequest(customer, TODAY);
        getJson("/api/customer/requests/" + id, customer.token())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.code").value(startsWith("RC-31-")))
                .andExpect(jsonPath("$.zoneName").value("Anna Nagar"))
                .andExpect(jsonPath("$.timeline[0].done").value(true))
                .andExpect(jsonPath("$.actions.canCancel").value(false)); // today is past the cut-off (6 pm yesterday)

        // Review -> acceptance -> scheduling + assignment
        postJson("/api/admin/requests/" + id + "/review", admin, null).andExpect(jsonPath("$.status").value("UNDER_REVIEW"));
        postJson("/api/admin/requests/" + id + "/accept", admin, null).andExpect(jsonPath("$.status").value("ACCEPTED"));
        getJson("/api/admin/requests/" + id + "/collector-options?date=" + TODAY, admin)
                .andExpect(jsonPath("$[?(@.id == " + collector.id() + ")].inZone").value(hasItem(true)));
        String scheduled = postJson("/api/admin/requests/" + id + "/schedule", admin,
                "{\"date\":\"" + TODAY + "\",\"slot\":\"10:00-12:00\",\"collectorId\":" + collector.id() + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.pickup.collector.name").value("Test Collector"))
                .andExpect(jsonPath("$.overdue").value(false)) // booked for later today
                .andReturn().getResponse().getContentAsString();
        long pickupId = ((Number) com.jayway.jsonpath.JsonPath.read(scheduled, "$.pickup.id")).longValue();

        // The customer sees the booking; the collector's phone is masked until the pickup is underway.
        getJson("/api/customer/requests/" + id, customer.token())
                .andExpect(jsonPath("$.scheduledDate").value(TODAY))
                .andExpect(jsonPath("$.pickup.collector.mobile").value(containsString("•")));

        // Collector workflow (brief §11)
        getJson("/api/collector/today", collector.token())
                .andExpect(jsonPath("$.counts.today").value(1))
                .andExpect(jsonPath("$.needsAnswer", hasSize(1)));
        step(pickupId, collector.token(), "ACCEPTED");
        step(pickupId, collector.token(), "ON_THE_WAY");
        getJson("/api/customer/requests/" + id, customer.token())
                .andExpect(jsonPath("$.status").value("PICKUP_STARTED"))
                .andExpect(jsonPath("$.pickup.collector.mobile").value(org.hamcrest.Matchers.not(containsString("•"))));
        step(pickupId, collector.token(), "ARRIVED");
        step(pickupId, collector.token(), "COLLECTION_STARTED");

        // Weight recording, including a material the customer didn't list (brief §12)
        postJson("/api/collector/pickups/" + pickupId + "/record", collector.token(), """
            {"items":[{"categoryId":%d,"qty":13.4,"unit":"KG"},{"categoryId":%d,"qty":3.6,"unit":"KG"},
                      {"categoryId":%d,"qty":2,"unit":"KG"}],"notes":"Bundled well"}"""
                .formatted(categoryId("paper"), categoryId("plastic"), categoryId("metal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COLLECTED"))
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[2].addedByCollector").value(true))
                .andExpect(jsonPath("$.items[0].estimated").value(12))
                .andExpect(jsonPath("$.items[0].actual").value(13.4));
        postJson("/api/collector/pickups/" + pickupId + "/complete", collector.token(), null)
                .andExpect(jsonPath("$.pickup.status").value("COMPLETED"));

        // Collection confirmation -> completion (brief §13)
        postJson("/api/customer/requests/" + id + "/confirm", customer.token(),
                "{\"confirmed\":true,\"feedback\":\"Quick and polite\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.timeline[6].done").value(true))
                .andExpect(jsonPath("$.confirmation.feedback").value("Quick and polite"))
                .andExpect(jsonPath("$.pickup.collector.mobile").value(containsString("•")));

        // History (brief §18) and notifications (brief §22)
        getJson("/api/customer/summary", customer.token())
                .andExpect(jsonPath("$.completed").value(1))
                .andExpect(jsonPath("$.kg").value(19.0));
        String inbox = getJson("/api/notifications", customer.token()).andReturn().getResponse().getContentAsString();
        List<String> kinds = com.jayway.jsonpath.JsonPath.read(inbox, "$.items[*].kind");
        org.assertj.core.api.Assertions.assertThat(kinds)
                .contains("submitted", "accepted", "scheduled", "assigned", "started", "collected", "completed");

        // Completed requests are read-only (brief §25)
        putJson("/api/customer/requests/" + id, customer.token(), """
            {"items":[{"categoryId":%d,"qty":1}],"addressId":%d,"submit":false}"""
                .formatted(categoryId("paper"), defaultAddress(customer)))
                .andExpect(status().isConflict());
        postJson("/api/admin/requests/" + id + "/accept", admin, null).andExpect(status().isConflict());
    }

    @Test
    void draftThenSubmitAndCancelBeforeCutoff() throws Exception {
        Session c = newCustomer();
        String draft = """
            {"items":[{"categoryId":%d,"qty":6}],"addressId":%d,"submit":false}"""
                .formatted(categoryId("textile"), defaultAddress(c));
        long id = ((Number) read(postJson("/api/customer/requests", c.token(), draft)
                .andExpect(jsonPath("$.status").value("DRAFT")), "$.id")).longValue();

        // Submitting needs a valid date and slot.
        String noDate = draft.replace("\"submit\":false", "\"submit\":true");
        putJson("/api/customer/requests/" + id, c.token(), noDate)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.preferredDate").exists());

        String sunday = draft.replace("\"submit\":false", "\"preferredDate\":\"" + SUNDAY + "\",\"preferredSlot\":\"10:00-12:00\",\"submit\":true");
        putJson("/api/customer/requests/" + id, c.token(), sunday)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.preferredDate").value(containsString("don't collect")));

        String badSlot = draft.replace("\"submit\":false", "\"preferredDate\":\"" + TOMORROW + "\",\"preferredSlot\":\"19:00-21:00\",\"submit\":true");
        putJson("/api/customer/requests/" + id, c.token(), badSlot)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.preferredSlot").exists());

        String farAway = draft.replace("\"submit\":false", "\"preferredDate\":\"2031-05-01\",\"preferredSlot\":\"10:00-12:00\",\"submit\":true");
        putJson("/api/customer/requests/" + id, c.token(), farAway)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.preferredDate").value(containsString("within")));

        String ok = draft.replace("\"submit\":false", "\"preferredDate\":\"" + TOMORROW + "\",\"preferredSlot\":\"10:00-12:00\",\"submit\":true");
        putJson("/api/customer/requests/" + id, c.token(), ok).andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.actions.canCancel").value(true));

        postJson("/api/customer/requests/" + id + "/cancel", c.token(), "{\"reason\":\"Travelling that week\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Travelling that week"))
                .andExpect(jsonPath("$.cancelledBy").value("Priya Raman"));
        postJson("/api/customer/requests/" + id + "/cancel", c.token(), "{\"reason\":\"again\"}")
                .andExpect(status().isConflict());
    }

    @Test
    void itemRulesAreEnforced() throws Exception {
        Session c = newCustomer();
        long paper = categoryId("paper");
        String dup = """
            {"items":[{"categoryId":%d,"qty":2},{"categoryId":%d,"qty":3}],"addressId":%d,"submit":false}"""
                .formatted(paper, paper, defaultAddress(c));
        postJson("/api/customer/requests", c.token(), dup).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.items").exists());
        String zero = """
            {"items":[{"categoryId":%d,"qty":0}],"addressId":%d,"submit":false}""".formatted(paper, defaultAddress(c));
        postJson("/api/customer/requests", c.token(), zero).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields['items[0].qty']").exists());
        String none = """
            {"items":[],"addressId":%d,"submit":false}""".formatted(defaultAddress(c));
        postJson("/api/customer/requests", c.token(), none).andExpect(status().isBadRequest());
        String unknown = """
            {"items":[{"categoryId":999999,"qty":2}],"addressId":%d,"submit":false}""".formatted(defaultAddress(c));
        postJson("/api/customer/requests", c.token(), unknown).andExpect(status().isBadRequest());
    }

    @Test
    void adminReviewOutcomes() throws Exception {
        String admin = adminToken();
        Session c = newCustomer();
        long rejected = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + rejected + "/reject", admin, "{\"reason\":\"\"}").andExpect(status().isBadRequest());
        postJson("/api/admin/requests/" + rejected + "/reject", admin, "{\"reason\":\"Outside our area this week\"}")
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectReason").value("Outside our area this week"));

        long info = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + info + "/request-info", admin, "{\"reason\":\"How many boxes?\"}")
                .andExpect(jsonPath("$.status").value("INFO_REQUESTED"));
        getJson("/api/customer/requests/" + info, c.token())
                .andExpect(jsonPath("$.infoRequest").value("How many boxes?"))
                .andExpect(jsonPath("$.actions.canEdit").value(true));
        String resubmit = """
            {"items":[{"categoryId":%d,"qty":20}],"addressId":%d,"preferredDate":"%s","preferredSlot":"12:00-14:00","submit":true}"""
                .formatted(categoryId("cardboard"), defaultAddress(c), TOMORROW);
        putJson("/api/customer/requests/" + info, c.token(), resubmit).andExpect(jsonPath("$.status").value("SUBMITTED"));

        // Can't schedule before accepting; can't book outside working days.
        postJson("/api/admin/requests/" + info + "/schedule", admin, "{\"date\":\"" + TOMORROW + "\",\"slot\":\"10:00-12:00\"}")
                .andExpect(status().isConflict());
        postJson("/api/admin/requests/" + info + "/accept", admin, null).andExpect(status().isOk());
        postJson("/api/admin/requests/" + info + "/schedule", admin, "{\"date\":\"" + SUNDAY + "\",\"slot\":\"10:00-12:00\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.date").exists());
        postJson("/api/admin/requests/" + info + "/schedule", admin, "{\"date\":\"" + TOMORROW + "\",\"slot\":\"10:00-12:00\"}")
                .andExpect(jsonPath("$.status").value("SCHEDULED"));

        // Admin search and tabs (brief §21)
        getJson("/api/admin/requests?tab=SCHEDULED&q=" + c.id(), admin).andExpect(status().isOk());
        getJson("/api/admin/requests?tab=CLOSED&status=REJECTED&categoryId=" + categoryId("paper"), admin)
                .andExpect(jsonPath("$.total").value(greaterThan(0)));
    }

    @Test
    void rescheduleFailAndRebook() throws Exception {
        String admin = adminToken();
        Session c = newCustomer();
        Session k = approvedCollector(admin);
        long id = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + id + "/accept", admin, null);
        postJson("/api/admin/requests/" + id + "/schedule", admin,
                "{\"date\":\"" + TOMORROW + "\",\"slot\":\"10:00-12:00\",\"collectorId\":" + k.id() + "}");

        postJson("/api/admin/requests/" + id + "/reschedule", admin,
                "{\"date\":\"" + TODAY + "\",\"slot\":\"14:00-16:00\",\"reason\":\"Customer asked to move it\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reschedules", hasSize(1)))
                .andExpect(jsonPath("$.reschedules[0].fromDate").value(TOMORROW))
                .andExpect(jsonPath("$.reschedules[0].reason").value("Customer asked to move it"))
                .andExpect(jsonPath("$.pickup.date").value(TODAY));

        long pickupId = ((Number) read(getJson("/api/admin/requests/" + id, admin), "$.pickup.id")).longValue();
        // A different collector can't touch it.
        Session other = approvedCollector(admin);
        postJson("/api/collector/pickups/" + pickupId + "/step", other.token(), "{\"to\":\"ACCEPTED\"}")
                .andExpect(status().isNotFound());

        step(pickupId, k.token(), "ACCEPTED");
        postJson("/api/collector/pickups/" + pickupId + "/fail", k.token(), "{\"reason\":\"CUSTOMER_UNAVAILABLE\",\"note\":\"Called twice\"}")
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.pickup.failReason").value("Customer unavailable"));

        // Failed pickups stay in history and can be booked again (brief §14, §16).
        postJson("/api/admin/requests/" + id + "/schedule", admin,
                "{\"date\":\"" + TOMORROW + "\",\"slot\":\"08:00-10:00\",\"collectorId\":" + other.id() + "}")
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.pastPickups", hasSize(1)))
                .andExpect(jsonPath("$.pastPickups[0].status").value("FAILED"));
    }

    @Test
    void collectorCapacityAndAvailabilityAreRespected() throws Exception {
        String admin = adminToken();
        Session k = approvedCollector(admin);
        putJson("/api/collector/availability", k.token(), "{\"available\":false}").andExpect(status().isNoContent());
        Session c = newCustomer();
        long id = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + id + "/accept", admin, null);
        postJson("/api/admin/requests/" + id + "/schedule", admin,
                "{\"date\":\"" + TOMORROW + "\",\"slot\":\"10:00-12:00\",\"collectorId\":" + k.id() + "}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.collectorId").value(containsString("On leave")));
    }

    @Test
    void collectorCanDeclineBeforeAccepting() throws Exception {
        String admin = adminToken();
        Session k = approvedCollector(admin);
        Session c = newCustomer();
        long id = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + id + "/accept", admin, null);
        long pickupId = ((Number) read(postJson("/api/admin/requests/" + id + "/schedule", admin,
                "{\"date\":\"" + TOMORROW + "\",\"slot\":\"10:00-12:00\",\"collectorId\":" + k.id() + "}"), "$.pickup.id")).longValue();
        postJson("/api/collector/pickups/" + pickupId + "/decline", k.token(), "{\"reason\":\"Vehicle in repair\"}")
                .andExpect(status().isNoContent());
        getJson("/api/admin/requests/" + id, admin)
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.pickup").doesNotExist());
        // Starting the trip is allowed only on the pickup day.
        long id2 = submittedRequest(c, TOMORROW);
        postJson("/api/admin/requests/" + id2 + "/accept", admin, null);
        long p2 = ((Number) read(postJson("/api/admin/requests/" + id2 + "/schedule", admin,
                "{\"date\":\"" + TOMORROW + "\",\"slot\":\"12:00-14:00\",\"collectorId\":" + k.id() + "}"), "$.pickup.id")).longValue();
        step(p2, k.token(), "ACCEPTED");
        postJson("/api/collector/pickups/" + p2 + "/step", k.token(), "{\"to\":\"ON_THE_WAY\"}").andExpect(status().isConflict());
        // Steps can't be skipped.
        postJson("/api/collector/pickups/" + p2 + "/step", k.token(), "{\"to\":\"COLLECTION_STARTED\"}").andExpect(status().isConflict());
    }

    @Test
    void complaintsFlow() throws Exception {
        String admin = adminToken();
        Session c = newCustomer();
        long id = submittedRequest(c, TOMORROW);
        String created = postJson("/api/customer/complaints", c.token(),
                "{\"requestId\":" + id + ",\"type\":\"PICKUP_DELAYED\",\"description\":\"Nobody came\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(startsWith("CMP-")))
                .andReturn().getResponse().getContentAsString();
        long complaintId = ((Number) com.jayway.jsonpath.JsonPath.read(created, "$.id")).longValue();
        postJson("/api/admin/complaints/" + complaintId + "/review", admin, null)
                .andExpect(jsonPath("$.complaint.status").value("IN_REVIEW"));
        postJson("/api/admin/complaints/" + complaintId + "/resolve", admin,
                "{\"resolution\":\"EXPLAINED\",\"reply\":\"Sorry, the vehicle broke down.\"}")
                .andExpect(jsonPath("$.complaint.status").value("RESOLVED"))
                .andExpect(jsonPath("$.activity", hasSize(3)));
        getJson("/api/customer/complaints", c.token())
                .andExpect(jsonPath("$[0].reply").value("Sorry, the vehicle broke down."));
        // Another customer can't file against this request.
        Session other = newCustomer();
        postJson("/api/customer/complaints", other.token(),
                "{\"requestId\":" + id + ",\"type\":\"OTHER\",\"description\":\"x\"}").andExpect(status().isBadRequest());
    }

    @Test
    void adminInsightsAndExports() throws Exception {
        String admin = adminToken();
        getJson("/api/admin/dashboard", admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.kpis.totalCustomers").exists())
                .andExpect(jsonPath("$.kpis.overdue").isNumber())
                .andExpect(jsonPath("$.monthlyKg", hasSize(6)));
        getJson("/api/admin/analytics", admin).andExpect(status().isOk()).andExpect(jsonPath("$.heat.slots", hasSize(5)));
        for (String type : List.of("COLLECTION_VOLUME", "WASTE_CATEGORIES", "CUSTOMER_ACTIVITY", "COLLECTOR_ACTIVITY",
                "PICKUP_COMPLETION", "FAILED_PICKUPS", "LOCATION_WISE")) {
            getJson("/api/admin/reports/" + type + "?from=2028-06-01&to=2031-03-03", admin)
                    .andExpect(status().isOk()).andExpect(jsonPath("$.columns").isArray());
        }
        mvc.perform(as(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/admin/reports/LOCATION_WISE/export?format=xlsx"), admin))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Content-Disposition", containsString(".xlsx")));
        mvc.perform(as(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/admin/audit/export"), admin)).andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Content-Disposition", containsString(".xlsx")));
        mvc.perform(as(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/admin/audit/export?format=csv"), admin)).andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Content-Disposition", containsString(".csv")));
        getJson("/api/admin/audit?action=EXPORT_REPORT", admin).andExpect(jsonPath("$.total").value(greaterThan(0)))
                .andExpect(jsonPath("$.rows[0].summary").isString());
        getJson("/api/admin/schedule?date=" + TOMORROW, admin).andExpect(jsonPath("$.slots", hasSize(5)));
        getJson("/api/admin/customers?type=HOUSEHOLD", admin).andExpect(jsonPath("$.rows[0].mobile").value(containsString("•")));
        getJson("/api/admin/collectors", admin).andExpect(status().isOk());
        getJson("/api/admin/requests?tab=OVERDUE", admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.tabCounts.OVERDUE").isNumber())
                .andExpect(jsonPath("$.rows[*].overdue").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(true))));
        // An overdue request is listed only under Overdue.
        getJson("/api/admin/requests?tab=SCHEDULED", admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[*].overdue").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(false))));
    }
}
