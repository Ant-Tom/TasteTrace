package com.tastetrace.auth;

import com.tastetrace.auth.dto.AuthResponse;
import com.tastetrace.auth.dto.LoginRequest;
import com.tastetrace.auth.dto.RegisterRequest;
import com.tastetrace.auth.dto.UserResponse;
import com.tastetrace.user.User;
import com.tastetrace.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RegistrationRateLimiter rateLimiter;
    private final LoginAttemptLimiter loginAttemptLimiter;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RegistrationRateLimiter rateLimiter,
            LoginAttemptLimiter loginAttemptLimiter,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
        this.loginAttemptLimiter = loginAttemptLimiter;
        this.refreshTokenService = refreshTokenService;
    }

    public AuthResponse register(RegisterRequest request, String clientIp) {
        if (request.website() != null && !request.website().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration rejected");
        }
        if (!rateLimiter.tryConsume(clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many registration attempts");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.email().trim().toLowerCase());
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request, String clientIp) {
        if (loginAttemptLimiter.isBlocked(request.email(), clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts, try again later");
        }

        User user = userRepository.findByEmailIgnoreCase(request.email().trim()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptLimiter.recordFailure(request.email(), clientIp);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        loginAttemptLimiter.recordSuccess(request.email(), clientIp);
        return buildAuthResponse(user);
    }

    /** One transaction: the old token is consumed only if the new pair is issued. */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public AuthResponse refresh(String refreshToken) {
        User user = refreshTokenService.consume(refreshToken);
        return buildAuthResponse(user);
    }

    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    public UserResponse getUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.createAccessToken(user.getId(), user.getEmail());
        String refreshToken = refreshTokenService.issue(user);
        return new AuthResponse(token, refreshToken, toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getCreatedAt());
    }
}
