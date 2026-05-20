package com.tastetrace.review;

import com.tastetrace.auth.AuthUserPrincipal;
import com.tastetrace.review.dto.CreateReviewRequest;
import com.tastetrace.review.dto.ReviewDto;
import com.tastetrace.review.dto.UpdateReviewRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/establishments/{establishmentId}/reviews")
    public List<ReviewDto> list(
            @PathVariable Long establishmentId,
            @AuthenticationPrincipal AuthUserPrincipal principal
    ) {
        Long userId = principal != null ? principal.userId() : null;
        return reviewService.listByEstablishment(establishmentId, userId);
    }

    @PostMapping("/establishments/{establishmentId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewDto create(
            @PathVariable Long establishmentId,
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal AuthUserPrincipal principal
    ) {
        return reviewService.create(establishmentId, principal.userId(), request);
    }

    @PutMapping("/reviews/{reviewId}")
    public ReviewDto update(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateReviewRequest request,
            @AuthenticationPrincipal AuthUserPrincipal principal
    ) {
        return reviewService.update(reviewId, principal.userId(), request);
    }
}
