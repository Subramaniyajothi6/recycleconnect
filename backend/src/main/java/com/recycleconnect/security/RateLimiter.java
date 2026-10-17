package com.recycleconnect.security;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.recycleconnect.common.ApiException;

/**
 * Sliding-window limits kept in memory, e.g. "5 failed sign-ins per account per 15 minutes".
 * Enough for one backend instance; with several, move the counters to a shared store (docs/EXTENDING.md).
 */
@Component
public class RateLimiter {

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final java.time.Clock clock;

    public RateLimiter(java.time.Clock clock) {
        this.clock = clock;
    }

    /** Throws 429 if {@code key} already has {@code max} hits in the window. Does not record a hit. */
    public void check(String key, int max, Duration window, String message) {
        Deque<Instant> q = hits.get(key);
        if (q == null) return;
        synchronized (q) {
            prune(q, window);
            if (q.size() >= max) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    public void record(String key) {
        Deque<Instant> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(clock.instant());
        }
    }

    /** Check then record, for limits that count every attempt. */
    public void hit(String key, int max, Duration window, String message) {
        check(key, max, window, message);
        record(key);
    }

    public void reset(String key) {
        hits.remove(key);
    }

    private void prune(Deque<Instant> q, Duration window) {
        Instant cutoff = clock.instant().minus(window);
        while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
    }

    /** Drops counters nobody has touched for a day so memory stays small. */
    @Scheduled(fixedDelay = 3_600_000)
    void sweep() {
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue(), Duration.ofDays(1));
                return e.getValue().isEmpty();
            }
        });
    }
}
