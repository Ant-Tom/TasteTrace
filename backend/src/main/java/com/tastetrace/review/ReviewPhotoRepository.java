package com.tastetrace.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewPhotoRepository extends JpaRepository<ReviewPhoto, Long> {

    List<ReviewPhoto> findByReviewIdOrderBySortOrderAscIdAsc(Long reviewId);

    int countByReviewId(Long reviewId);

    @Query("""
            SELECT p FROM ReviewPhoto p
            JOIN FETCH p.review
            WHERE p.review.id IN :reviewIds
            ORDER BY p.sortOrder ASC, p.id ASC
            """)
    List<ReviewPhoto> findByReviewIds(@Param("reviewIds") List<Long> reviewIds);
}
