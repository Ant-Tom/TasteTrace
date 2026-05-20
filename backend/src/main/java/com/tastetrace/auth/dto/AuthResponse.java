package com.tastetrace.auth.dto;

public record AuthResponse(
        String accessToken,
        UserResponse user
) {
}
