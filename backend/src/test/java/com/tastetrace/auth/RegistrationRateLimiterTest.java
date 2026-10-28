package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationRateLimiterTest {

    @Test
    void allowsUpToTheLimitPerClient() {
        RegistrationRateLimiter limiter = new RegistrationRateLimiter(
                new AppProperties(null, new AppProperties.Registration(2), null, null, null)
        );

        assertThat(limiter.tryConsume("203.0.113.7")).isTrue();
        assertThat(limiter.tryConsume("203.0.113.7")).isTrue();
        assertThat(limiter.tryConsume("203.0.113.7")).isFalse();
        // Other clients have their own budget.
        assertThat(limiter.tryConsume("198.51.100.1")).isTrue();
    }
}
