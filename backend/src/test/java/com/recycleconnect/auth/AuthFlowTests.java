package com.recycleconnect.auth;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.JsonPath;
import com.recycleconnect.IntegrationTest;

/** Runs against the dev database; each test's writes are rolled back. */
class AuthFlowTests extends IntegrationTest {

    private String registerToken(String json) throws Exception {
        String body = postJson("/api/auth/register/customer", null, json)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    @Test
    void customerRegistersThenSeesOwnProfile() throws Exception {
        String m = mobile();
        String token = registerToken(customerJson(m, "Priya." + m + "@Example.in"));

        getJson("/api/auth/me", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.mobile").value(m))
                .andExpect(jsonPath("$.email").value("priya." + m + "@example.in"))
                .andExpect(jsonPath("$.customer.customerType").value("HOUSEHOLD"))
                .andExpect(jsonPath("$.customer.addresses", hasSize(1)))
                .andExpect(jsonPath("$.customer.addresses[0].isDefault").value(true));
    }

    @Test
    void sameMobileCannotRegisterTwice() throws Exception {
        String m = mobile();
        registerToken(customerJson(m, "a" + m + "@example.in"));
        postJson("/api/auth/register/customer", null, customerJson("0" + m, "b" + m + "@example.in"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.mobile").exists());
    }

    @Test
    void invalidFieldsAreReportedPerField() throws Exception {
        String json = customerJson("12345", "priya.raman@example").replace("600040", "6000");
        postJson("/api/auth/register/customer", null, json)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").value("Enter a full email address, like name@example.com"))
                .andExpect(jsonPath("$.fields['address.pin']").value("PIN code has 6 digits"))
                .andExpect(jsonPath("$.fields.mobile").value("Enter a 10-digit mobile number, like 98400 12345"));
    }

    @Test
    void signInWithMobileOrEmail() throws Exception {
        String m = mobile();
        registerToken(customerJson(m, "c" + m + "@example.in"));

        String spaced = m.substring(0, 5) + " " + m.substring(5);
        postJson("/api/auth/login", null, "{\"identifier\":\"" + spaced + "\",\"password\":\"greenbins26\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
        postJson("/api/auth/login", null, "{\"identifier\":\"C" + m + "@EXAMPLE.in\",\"password\":\"greenbins26\"}")
                .andExpect(status().isOk());
        postJson("/api/auth/login", null, "{\"identifier\":\"" + m + "\",\"password\":\"wrong-password\"}")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(AuthService.BAD_LOGIN));
    }

    @Test
    void collectorRegistrationWaitsForApproval() throws Exception {
        String zones = getJson("/api/catalog/zones", null).andReturn().getResponse().getContentAsString();
        Integer zoneId = JsonPath.read(zones, "$[0].id");
        String json = """
            {"name":"Dinesh Kumar","mobile":"%s","email":"","vehicleType":"THREE_WHEELER",
             "vehicleNumber":"tn 22 aq 7310","zoneIds":[%d],"workingDays":["MONDAY","TUESDAY"],
             "password":"collect2026"}
            """.formatted(mobile(), zoneId);
        postJson("/api/auth/register/collector", null, json)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("COLLECTOR"))
                .andExpect(jsonPath("$.user.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.user.email").doesNotExist())
                .andExpect(jsonPath("$.user.collector.vehicleNumber").value("TN 22 AQ 7310"))
                .andExpect(jsonPath("$.user.collector.zones", hasSize(1)))
                .andExpect(jsonPath("$.user.collector.workingDays", hasSize(2)));
    }

    @Test
    void protectedRoutesNeedTheRightRole() throws Exception {
        getJson("/api/auth/me", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sign in to continue."));
        getJson("/api/auth/me", "not-a-token")
                .andExpect(status().isUnauthorized());

        String m = mobile();
        String token = registerToken(customerJson(m, "d" + m + "@example.in"));
        getJson("/api/admin/anything", token)
                .andExpect(status().isForbidden());
    }

    @Test
    void catalogIsPublic() throws Exception {
        getJson("/api/catalog/categories", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(9)))
                .andExpect(jsonPath("$[0].code").value("plastic"))
                .andExpect(jsonPath("$[6].warning").isString());
        getJson("/api/catalog/not-accepted", null).andExpect(jsonPath("$", hasSize(5)));
        getJson("/api/catalog/zones", null).andExpect(jsonPath("$", hasSize(7)));
    }
}
