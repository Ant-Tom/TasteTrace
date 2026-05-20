package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RegistrationRateLimiter {

    private final StringRedisTemplate redis;
    private final int limitPerHour;

    public RegistrationRateLimiter(StringRedisTemplate redis, AppProperties appProperties) {
        this.redis = redis;
        this.limitPerHour = appProperties.registration().rateLimitPerHour();
    }

    public boolean tryConsume(String clientKey) {
        String key = "register:rate:" + clientKey;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, Duration.ofHours(1));
        }
        return count != null && count <= limitPerHour;
    }
}
