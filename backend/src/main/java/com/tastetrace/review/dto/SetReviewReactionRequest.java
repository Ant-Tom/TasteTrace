package com.tastetrace.review.dto;

import com.tastetrace.review.VoteType;
import jakarta.validation.constraints.NotNull;

public record SetReviewReactionRequest(@NotNull VoteType vote) {
}
