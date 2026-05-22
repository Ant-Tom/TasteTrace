package com.tastetrace.review;

import com.tastetrace.auth.AuthUserPrincipal;
import com.tastetrace.review.dto.ReviewReactionStatsDto;
import com.tastetrace.review.dto.SetReviewReactionRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewReactionController {

    private final ReviewReactionService reactionService;

    public ReviewReactionController(ReviewReactionService reactionService) {
        this.reactionService = reactionService;
    }

    @PutMapping("/{reviewId}/reaction")
    public ReviewReactionStatsDto setReaction(
            @PathVariable Long reviewId,
            @Valid @RequestBody SetReviewReactionRequest request,
            @AuthenticationPrincipal AuthUserPrincipal principal
    ) {
        return reactionService.setVote(reviewId, principal.userId(), request.vote());
    }
}
