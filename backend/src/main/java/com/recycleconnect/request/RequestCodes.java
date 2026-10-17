package com.recycleconnect.request;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.recycleconnect.common.BusinessClock;

/** Request codes like RC-26-00001 and complaint codes like CMP-0001, from database sequences (safe under load). */
@Component
public class RequestCodes {

    private final JdbcTemplate jdbc;
    private final BusinessClock clock;

    public RequestCodes(JdbcTemplate jdbc, BusinessClock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public String nextRequestCode() {
        long n = jdbc.queryForObject("select nextval('request_code_seq')", Long.class);
        return "RC-%02d-%05d".formatted(clock.today().getYear() % 100, n);
    }

    public String nextComplaintCode() {
        long n = jdbc.queryForObject("select nextval('complaint_code_seq')", Long.class);
        return "CMP-%04d".formatted(n);
    }
}
