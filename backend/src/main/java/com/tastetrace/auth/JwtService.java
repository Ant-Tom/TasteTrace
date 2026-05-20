package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpirationMinutes;

    public JwtService(AppProperties appProperties) {
        byte[] secretBytes = appProperties.jwt().secret().getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(deriveKeyBytes(secretBytes));
        this.accessExpirationMinutes = appProperties.jwt().accessExpirationMinutes();
    }

    private static byte[] deriveKeyBytes(byte[] secretBytes) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(secretBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    public String createAccessToken(Long userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessExpirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserId(Claims claims) {
        return Long.parseLong(claims.getSubject());
    }
}
