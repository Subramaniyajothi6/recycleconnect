package com.recycleconnect;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * Base for API tests. Runs against the dev database; every test's writes are rolled back.
 * Time is frozen at Monday 3 March 2031, 07:00 in Chennai, so booking and cut-off rules are predictable.
 * Each test gets its own client IP so rate limits from one test don't affect another.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(IntegrationTest.FixedClock.class)
public abstract class IntegrationTest {

    /** Monday 3 March 2031, 07:00 IST. */
    public static final Instant NOW = Instant.parse("2031-03-03T01:30:00Z");
    public static final String TODAY = "2031-03-03";
    public static final String TOMORROW = "2031-03-04";
    public static final String SUNDAY = "2031-03-09";

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    private jakarta.persistence.EntityManager em;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    protected final String ip = "10.%d.%d.%d".formatted(rnd(250), rnd(250), rnd(250));

    protected static int rnd(int bound) {
        return ThreadLocalRandom.current().nextInt(1, bound);
    }

    /** A random valid mobile so tests never collide with real accounts. */
    protected static String mobile() {
        return "7" + String.format("%09d", ThreadLocalRandom.current().nextInt(1_000_000_000));
    }

    /** Flushes pending JPA writes first, as the end of a real request's transaction would. */
    protected <B extends AbstractMockHttpServletRequestBuilder<B>> B as(B b, String token) {
        em.flush();
        b.header("X-Forwarded-For", ip);
        return token == null ? b : b.header("Authorization", "Bearer " + token);
    }

    protected ResultActions getJson(String path, String token) throws Exception {
        return mvc.perform(as(get(path), token));
    }

    protected ResultActions postJson(String path, String token, String json) throws Exception {
        return mvc.perform(as(post(path), token).contentType(MediaType.APPLICATION_JSON).content(json == null ? "{}" : json));
    }

    protected ResultActions putJson(String path, String token, String json) throws Exception {
        return mvc.perform(as(put(path), token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    protected static <T> T read(ResultActions r, String path) throws Exception {
        return JsonPath.read(r.andReturn().getResponse().getContentAsString(), path);
    }

    public record Session(String token, long id) {
    }

    protected Session register(String json) throws Exception {
        ResultActions r = postJson("/api/auth/register/customer", null, json);
        return new Session(read(r, "$.token"), ((Number) read(r, "$.user.id")).longValue());
    }

    protected static String customerJson(String mobile, String email) {
        return """
            {"name":"Priya Raman","customerType":"HOUSEHOLD","mobile":"+91 %s","email":"%s",
             "preferredContact":"PHONE","password":"greenbins26",
             "address":{"line1":"Flat 4B, Lotus Apartments, 2nd Avenue","area":"Anna Nagar","city":"Chennai",
                        "district":"Chennai","state":"Tamil Nadu","pin":"600040","lat":13.085,"lng":80.21}}
            """.formatted(mobile, email);
    }

    protected Session newCustomer() throws Exception {
        String m = mobile();
        return register(customerJson(m, "c" + m + "@example.in"));
    }

    protected long defaultAddress(Session c) throws Exception {
        return ((Number) read(getJson("/api/auth/me", c.token()), "$.customer.addresses[0].id")).longValue();
    }

    protected String adminToken() throws Exception {
        return read(postJson("/api/auth/login", null,
                "{\"identifier\":\"" + adminEmail + "\",\"password\":\"" + adminPassword + "\"}"), "$.token");
    }

    protected long zoneId(String name) throws Exception {
        String body = getJson("/api/catalog/zones", null).andReturn().getResponse().getContentAsString();
        Integer id = ((net.minidev.json.JSONArray) JsonPath.read(body, "$[?(@.name == '" + name + "')].id")).stream()
                .map(o -> (Integer) o).findFirst().orElseThrow();
        return id;
    }

    protected long categoryId(String code) throws Exception {
        String body = getJson("/api/catalog/categories", null).andReturn().getResponse().getContentAsString();
        return ((net.minidev.json.JSONArray) JsonPath.read(body, "$[?(@.code == '" + code + "')].id")).stream()
                .map(o -> ((Number) o).longValue()).findFirst().orElseThrow();
    }

    /** Registers a collector covering Anna Nagar, Mon–Sat, and approves them. */
    protected Session approvedCollector(String admin) throws Exception {
        ResultActions r = postJson("/api/auth/register/collector", null, """
            {"name":"Test Collector","mobile":"%s","vehicleType":"THREE_WHEELER","vehicleNumber":"TN 09 BX 4471",
             "zoneIds":[%d],"workingDays":["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"],
             "password":"collect2026"}""".formatted(mobile(), zoneId("Anna Nagar")));
        Session s = new Session(read(r, "$.token"), ((Number) read(r, "$.user.id")).longValue());
        postJson("/api/admin/collectors/" + s.id() + "/approve", admin, null);
        return s;
    }

    /** A request for paper and plastic, submitted for {@code date} 10:00-12:00. Returns its id. */
    protected long submittedRequest(Session c, String date) throws Exception {
        String json = """
            {"items":[{"categoryId":%d,"qty":12},{"categoryId":%d,"qty":4}],"addressId":%d,
             "preferredDate":"%s","preferredSlot":"10:00-12:00","notes":"Near the lift","submit":true}
            """.formatted(categoryId("paper"), categoryId("plastic"), defaultAddress(c), date);
        return ((Number) read(postJson("/api/customer/requests", c.token(), json), "$.id")).longValue();
    }
}
