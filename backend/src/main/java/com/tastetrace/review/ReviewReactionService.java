package com.tastetrace.review;

import com.tastetrace.review.dto.ReviewReactionStatsDto;
import com.tastetrace.user.User;
import com.tastetrace.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ReviewReactionService {

    private final ReviewRepository reviewRepository;
    private final ReviewReactionRepository reactionRepository;
    private final UserRepository userRepository;

    public ReviewReactionService(
            ReviewRepository reviewRepository,
            ReviewReactionRepository reactionRepository,
            UserRepository userRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.reactionRepository = reactionRepository;
        this.userRepository = userRepository;
    }

    public Map<Long, ReviewReactionStatsDto> statsForReviews(List<Long> reviewIds, Long currentUserId) {
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, long[]> counts = new HashMap<>();
        for (ReviewReactionRepository.VoteCountProjection row : reactionRepository.countByReviewIds(reviewIds)) {
            long[] pair = counts.computeIfAbsent(row.getReviewId(), id -> new long[2]);
            if (row.getVoteType() == VoteType.LIKE) {
                pair[0] = row.getCnt();
            } else {
                pair[1] = row.getCnt();
            }
        }
        Map<Long, VoteType> userVotes = new HashMap<>();
        if (currentUserId != null) {
            for (ReviewReaction reaction : reactionRepository.findByReviewIdInAndUserId(reviewIds, currentUserId)) {
                userVotes.put(reaction.getReview().getId(), reaction.getVoteType());
            }
        }
        Map<Long, ReviewReactionStatsDto> result = new HashMap<>();
        for (Long reviewId : reviewIds) {
            long[] pair = counts.getOrDefault(reviewId, new long[2]);
            result.put(reviewId, new ReviewReactionStatsDto(pair[0], pair[1], userVotes.get(reviewId)));
        }
        return result;
    }

    public ReviewReactionStatsDto statsForReview(Long reviewId, Long currentUserId) {
        return statsForReviews(List.of(reviewId), currentUserId).getOrDefault(
                reviewId,
                new ReviewReactionStatsDto(0, 0, null)
        );
    }

    @Transactional
    public ReviewReactionStatsDto setVote(Long reviewId, Long userId, VoteType vote) {
        Review review = reviewRepository.findByIdWithUser(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        if (review.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot vote on your own review");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<ReviewReaction> existing = reactionRepository.findByReviewIdAndUserId(reviewId, userId);
        if (existing.isPresent()) {
            ReviewReaction reaction = existing.get();
            if (reaction.getVoteType() == vote) {
                reactionRepository.delete(reaction);
            } else {
                reaction.setVoteType(vote);
            }
        } else {
            ReviewReaction reaction = new ReviewReaction();
            reaction.setReview(review);
            reaction.setUser(user);
            reaction.setVoteType(vote);
            reactionRepository.save(reaction);
        }
        return statsForReview(reviewId, userId);
    }
}
