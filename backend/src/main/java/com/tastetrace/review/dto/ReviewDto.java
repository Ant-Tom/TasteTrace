package com.tastetrace.review.dto;

import java.time.Instant;

public record ReviewDto(
        Long id,
        Long establishmentId,
        Long userId,
        String authorName,
        short rating,
        String text,
        Instant createdAt,
        Instant updatedAt,
        boolean canEdit,
        boolean ownedByCurrentUser
) {
}
