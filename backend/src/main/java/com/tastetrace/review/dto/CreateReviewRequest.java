package com.tastetrace.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @Min(1) @Max(5) short rating,
        @NotBlank @Size(min = 10, max = 2000) String text
) {
}
