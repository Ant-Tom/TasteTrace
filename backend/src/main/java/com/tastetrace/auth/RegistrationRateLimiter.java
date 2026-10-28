package com.tastetrace.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.tastetrace.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Registrations per client IP within an hour. Kept in memory: the app runs as a single
 * instance, so a separate Redis just for this counter is not worth it. Counters reset on
 * restart, which is acceptable for an anti-spam limit.
 */
@Component
public class RegistrationRateLimiter {

    private final Cache<String, AtomicInteger> attempts = Caffeine.newBuilder()
            // The window starts with the first attempt: reads and increments do not extend it.
            .expireAfterWrite(Duration.ofHours(1))
            .maximumSize(100_000)
            .build();
    private final int limitPerHour;

    public RegistrationRateLimiter(AppProperties appProperties) {
        this.limitPerHour = appProperties.registration().rateLimitPerHour();
    }

    public boolean tryConsume(String clientKey) {
        return attempts.get(clientKey, key -> new AtomicInteger()).incrementAndGet() <= limitPerHour;
    }
}
