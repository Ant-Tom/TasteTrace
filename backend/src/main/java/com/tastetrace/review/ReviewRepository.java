package com.tastetrace.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.establishment
            WHERE r.establishment.id = :establishmentId
            ORDER BY r.createdAt DESC
            """)
    List<Review> findByEstablishmentIdOrderByCreatedAtDesc(Long establishmentId);

    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            SELECT AVG(r.rating), COUNT(r)
            FROM Review r
            WHERE r.establishment.id = :establishmentId
            """)
    List<Object[]> aggregateByEstablishment(@Param("establishmentId") Long establishmentId);

    @Query("""
            SELECT e.id, COALESCE(AVG(r.rating), 0), COUNT(r)
            FROM Establishment e
            LEFT JOIN Review r ON r.establishment.id = e.id
            GROUP BY e.id
            """)
    List<Object[]> aggregateAllEstablishments();

    Optional<Review> findByIdAndUserId(Long id, Long userId);
}
