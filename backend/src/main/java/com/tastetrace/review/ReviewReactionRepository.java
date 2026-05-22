package com.tastetrace.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewReactionRepository extends JpaRepository<ReviewReaction, Long> {

    Optional<ReviewReaction> findByReviewIdAndUserId(Long reviewId, Long userId);

    @Query("""
            SELECT r.review.id AS reviewId, r.voteType AS voteType, COUNT(r) AS cnt
            FROM ReviewReaction r
            WHERE r.review.id IN :reviewIds
            GROUP BY r.review.id, r.voteType
            """)
    List<VoteCountProjection> countByReviewIds(@Param("reviewIds") List<Long> reviewIds);

    @Query("""
            SELECT rr FROM ReviewReaction rr
            JOIN FETCH rr.review
            WHERE rr.review.id IN :reviewIds AND rr.user.id = :userId
            """)
    List<ReviewReaction> findByReviewIdInAndUserId(
            @Param("reviewIds") List<Long> reviewIds,
            @Param("userId") Long userId
    );

    interface VoteCountProjection {
        Long getReviewId();

        VoteType getVoteType();

        long getCnt();
    }
}
