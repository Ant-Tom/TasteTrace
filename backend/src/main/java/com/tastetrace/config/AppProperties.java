package com.tastetrace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Registration registration,
        Review review,
        /** IPs of reverse proxies allowed to set X-Forwarded-For (e.g. Caddy/nginx in Docker). */
        List<String> trustedProxies
) {
    public record Jwt(String secret, long accessExpirationMinutes, long refreshExpirationDays) {
    }

    public record Registration(int rateLimitPerHour) {
    }

    public record Review(int editWindowHours) {
    }
}
