package com.tastetrace.review.dto;

import com.tastetrace.review.VoteType;

import java.time.Instant;
import java.util.List;

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
        boolean ownedByCurrentUser,
        List<String> photoUrls,
        long likeCount,
        long dislikeCount,
        VoteType currentUserVote
) {
}
