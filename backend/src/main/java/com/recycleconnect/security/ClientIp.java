package com.recycleconnect.security;

import java.util.Set;

import jakarta.servlet.http.HttpServletRequest;

/**
 * The caller's IP. X-Forwarded-For is trusted only when the request comes from a trusted proxy
 * (by default the Next.js server on the same machine), so clients can't fake their IP to dodge limits.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest req, Set<String> trustedProxies) {
        String remote = req.getRemoteAddr();
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank() && trustedProxies.contains(remote)) {
            return forwarded.split(",")[0].trim();
        }
        return remote;
    }
}
