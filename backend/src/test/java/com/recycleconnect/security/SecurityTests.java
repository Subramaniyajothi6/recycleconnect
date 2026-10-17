package com.recycleconnect.security;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.recycleconnect.IntegrationTest;

/** Access control, account lifecycle, rate limits and upload checks (brief §26). */
class SecurityTests extends IntegrationTest {

    @Test
    void customersSeeOnlyTheirOwnRequests() throws Exception {
        Session a = newCustomer();
        Session b = newCustomer();
        long id = submittedRequest(a, TOMORROW);
        getJson("/api/customer/requests/" + id, b.token()).andExpect(status().isNotFound());
        postJson("/api/customer/requests/" + id + "/cancel", b.token(), "{\"reason\":\"x\"}").andExpect(status().isNotFound());
        // Using someone else's saved address is refused.
        String json = """
            {"items":[{"categoryId":%d,"qty":2}],"addressId":%d,"submit":false}""".formatted(categoryId("paper"), defaultAddress(a));
        postJson("/api/customer/requests", b.token(), json).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.addressId").exists());
    }

    @Test
    void rolesAreSeparated() throws Exception {
        Session c = newCustomer();
        getJson("/api/admin/requests", c.token()).andExpect(status().isForbidden());
        getJson("/api/collector/today", c.token()).andExpect(status().isForbidden());
        getJson("/api/admin/dashboard", null).andExpect(status().isUnauthorized());
        getJson("/api/customer/requests", "not-a-token").andExpect(status().isUnauthorized());
        String admin = adminToken();
        getJson("/api/customer/requests", admin).andExpect(status().isForbidden());
    }

    @Test
    void pendingCollectorCanOnlyUseTheirAccount() throws Exception {
        var r = postJson("/api/auth/register/collector", null, """
            {"name":"Dinesh Kumar","mobile":"%s","vehicleType":"THREE_WHEELER","vehicleNumber":"TN 22 AQ 7310",
             "zoneIds":[%d],"workingDays":["MONDAY"],"password":"collect2026"}""".formatted(mobile(), zoneId("Adyar")));
        String token = read(r, "$.token");
        getJson("/api/auth/me", token).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));
        getJson("/api/notifications", token).andExpect(status().isOk());
        getJson("/api/collector/today", token).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(containsString("waiting for approval")));
        mvc.perform(as(multipart("/api/collector/id-proof").file(new MockMultipartFile("file", "id.pdf",
                "application/pdf", "%PDF-1.4 test".getBytes())), token)).andExpect(status().isNoContent());
    }

    @Test
    void blockingAnAccountTakesEffectImmediately() throws Exception {
        String admin = adminToken();
        Session c = newCustomer();
        String mobile = read(getJson("/api/auth/me", c.token()), "$.mobile");
        getJson("/api/customer/requests", c.token()).andExpect(status().isOk());
        postJson("/api/admin/users/" + c.id() + "/status", admin, "{\"status\":\"BLOCKED\",\"reason\":\"Abuse\"}")
                .andExpect(status().isNoContent());
        getJson("/api/customer/requests", c.token()).andExpect(status().isUnauthorized());
        postJson("/api/auth/login", null, "{\"identifier\":\"" + mobile + "\",\"password\":\"greenbins26\"}")
                .andExpect(status().isForbidden());
        // Admins can't be changed through this endpoint.
        long adminId = ((Number) read(getJson("/api/auth/me", admin), "$.id")).longValue();
        postJson("/api/admin/users/" + adminId + "/status", admin, "{\"status\":\"BLOCKED\"}").andExpect(status().isForbidden());
    }

    @Test
    void passwordChangeSignsOutOtherSessions() throws Exception {
        Session c = newCustomer();
        putJson("/api/account/password", c.token(), "{\"currentPassword\":\"wrong-one\",\"newPassword\":\"newpass2026\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.currentPassword").exists());
        String fresh = read(putJson("/api/account/password", c.token(),
                "{\"currentPassword\":\"greenbins26\",\"newPassword\":\"newpass2026\"}").andExpect(status().isOk()), "$.token");
        getJson("/api/auth/me", c.token()).andExpect(status().isUnauthorized());
        getJson("/api/auth/me", fresh).andExpect(status().isOk());
    }

    @Test
    void repeatedWrongPasswordsAreSlowedDown() throws Exception {
        Session c = newCustomer();
        String mobile = read(getJson("/api/auth/me", c.token()), "$.mobile");
        for (int i = 0; i < 5; i++) {
            postJson("/api/auth/login", null, "{\"identifier\":\"" + mobile + "\",\"password\":\"wrong-" + i + "\"}")
                    .andExpect(status().isUnauthorized());
        }
        postJson("/api/auth/login", null, "{\"identifier\":\"" + mobile + "\",\"password\":\"greenbins26\"}")
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void uploadsAreCheckedByContent() throws Exception {
        Session c = newCustomer();
        String json = """
            {"items":[{"categoryId":%d,"qty":2}],"addressId":%d,"submit":false}""".formatted(categoryId("paper"), defaultAddress(c));
        long id = ((Number) read(postJson("/api/customer/requests", c.token(), json), "$.id")).longValue();
        // A script renamed to .png is refused.
        mvc.perform(as(multipart("/api/customer/requests/" + id + "/photos").file(new MockMultipartFile("file", "x.png",
                "image/png", "<script>alert(1)</script>".getBytes())), c.token()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.file").exists());
        byte[] png = { (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 0 };
        String body = mvc.perform(as(multipart("/api/customer/requests/" + id + "/photos")
                .file(new MockMultipartFile("file", "a.png", "image/png", png)), c.token()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long photoId = ((Number) com.jayway.jsonpath.JsonPath.read(body, "$.photos[0].id")).longValue();
        // Served to the owner with safe headers; hidden from others.
        mvc.perform(as(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/files/photos/" + photoId), c.token()))
                .andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options", "nosniff"));
        Session other = newCustomer();
        mvc.perform(as(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/files/photos/" + photoId), other.token()))
                .andExpect(status().isNotFound());
    }

    @Test
    void securityHeadersAreSet() throws Exception {
        getJson("/api/catalog/categories", null)
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")));
    }
}
