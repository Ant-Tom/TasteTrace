package com.tastetrace.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Slows down password guessing: after too many failed logins for the same email from
 * the same IP, further attempts are refused for a while. Keyed by email + IP, so an
 * attacker cannot lock a real user out by failing logins from elsewhere.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 10;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Cache<String, AtomicInteger> failures = Caffeine.newBuilder()
            .expireAfterWrite(WINDOW)
            .maximumSize(100_000)
            .build();

    public boolean isBlocked(String email, String clientIp) {
        AtomicInteger count = failures.getIfPresent(key(email, clientIp));
        return count != null && count.get() >= MAX_FAILURES;
    }

    public void recordFailure(String email, String clientIp) {
        failures.get(key(email, clientIp), k -> new AtomicInteger()).incrementAndGet();
    }

    public void recordSuccess(String email, String clientIp) {
        failures.invalidate(key(email, clientIp));
    }

    private static String key(String email, String clientIp) {
        return email.trim().toLowerCase(Locale.ROOT) + "|" + clientIp;
    }
}
