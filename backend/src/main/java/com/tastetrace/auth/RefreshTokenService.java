package com.tastetrace.auth;

import com.tastetrace.config.AppProperties;
import com.tastetrace.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Opaque, single-use refresh tokens. Only a SHA-256 hash is stored, so a database leak
 * does not leak usable tokens. Every refresh rotates the token; presenting an already
 * rotated token means it was stolen (or replayed), and all of the user's sessions are revoked.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    /** Two browser tabs may refresh with the same token at once; that is not treated as theft. */
    private static final Duration REUSE_GRACE = Duration.ofSeconds(30);

    private final RefreshTokenRepository repository;
    private final long refreshExpirationDays;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository, AppProperties appProperties) {
        this.repository = repository;
        this.refreshExpirationDays = appProperties.jwt().refreshExpirationDays();
    }

    @Transactional
    public String issue(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(Instant.now().plus(refreshExpirationDays, ChronoUnit.DAYS));
        repository.save(token);
        return rawToken;
    }

    /** Consumes the token and returns its owner; the caller issues a new pair. */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public User consume(String rawToken) {
        Instant now = Instant.now();
        RefreshToken token = repository.findByTokenHashWithUser(hash(rawToken))
                .orElseThrow(RefreshTokenService::invalid);

        if (token.isRevoked()) {
            if (token.getRevokedAt().plus(REUSE_GRACE).isBefore(now)) {
                log.warn("Refresh token reuse detected for user {}, revoking all sessions", token.getUser().getId());
                repository.revokeAllForUser(token.getUser().getId(), now);
            }
            throw invalid();
        }
        if (token.isExpired(now)) {
            throw invalid();
        }

        token.setRevokedAt(now);
        return token.getUser();
    }

    @Transactional
    public void revoke(String rawToken) {
        repository.findByTokenHashWithUser(hash(rawToken))
                .filter(token -> !token.isRevoked())
                .ifPresent(token -> token.setRevokedAt(Instant.now()));
    }

    @Scheduled(cron = "0 17 4 * * *")
    @Transactional
    public void deleteExpired() {
        int deleted = repository.deleteExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Deleted {} expired refresh tokens", deleted);
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
