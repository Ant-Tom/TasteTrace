package com.tastetrace.review.dto;

import com.tastetrace.review.VoteType;

public record ReviewReactionStatsDto(
        long likeCount,
        long dislikeCount,
        VoteType currentUserVote
) {
}
