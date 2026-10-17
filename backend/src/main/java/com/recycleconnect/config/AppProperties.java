package com.recycleconnect.config;

import java.util.List;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, String frontendOrigin, Admin admin, List<String> trustedProxies, String uploadDir,
        Mail mail) {

    public record Jwt(String secret, int expiryHours) {
    }

    /** First admin account, created at startup if it doesn't exist. Values come from backend/.env. */
    public record Admin(String name, String email, String mobile, String password) {
    }

    /** Optional email. When {@code host} is blank, emails are only logged (no paid service needed). */
    public record Mail(String host, String from) {
    }

    public Set<String> trustedProxySet() {
        return trustedProxies == null ? Set.of() : Set.copyOf(trustedProxies);
    }
}
