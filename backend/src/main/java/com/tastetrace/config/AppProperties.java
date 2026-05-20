package com.tastetrace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Registration registration,
        Review review
) {
    public record Jwt(String secret, long accessExpirationMinutes, long refreshExpirationDays) {
    }

    public record Registration(int rateLimitPerHour) {
    }

    public record Review(int editWindowHours) {
    }
}
