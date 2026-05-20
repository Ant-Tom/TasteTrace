package com.tastetrace.review;

import com.tastetrace.config.AppProperties;
import com.tastetrace.establishments.Establishment;
import com.tastetrace.establishments.EstablishmentRepository;
import com.tastetrace.review.dto.CreateReviewRequest;
import com.tastetrace.review.dto.ReviewDto;
import com.tastetrace.review.dto.UpdateReviewRequest;
import com.tastetrace.user.User;
import com.tastetrace.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final EstablishmentRepository establishmentRepository;
    private final UserRepository userRepository;
    private final int editWindowHours;

    public ReviewService(
            ReviewRepository reviewRepository,
            EstablishmentRepository establishmentRepository,
            UserRepository userRepository,
            AppProperties appProperties
    ) {
        this.reviewRepository = reviewRepository;
        this.establishmentRepository = establishmentRepository;
        this.userRepository = userRepository;
        this.editWindowHours = appProperties.review().editWindowHours();
    }

    public List<ReviewDto> listByEstablishment(Long establishmentId, Long currentUserId) {
        ensureEstablishmentExists(establishmentId);
        return reviewRepository.findByEstablishmentIdOrderByCreatedAtDesc(establishmentId).stream()
                .map(review -> toDto(review, currentUserId))
                .toList();
    }

    @Transactional
    public ReviewDto create(Long establishmentId, Long userId, CreateReviewRequest request) {
        Establishment establishment = establishmentRepository.findById(establishmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Establishment not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Review review = new Review();
        review.setEstablishment(establishment);
        review.setUser(user);
        review.setRating(request.rating());
        review.setText(request.text().trim());
        reviewRepository.save(review);

        return toDto(review, userId);
    }

    @Transactional
    public ReviewDto update(Long reviewId, Long userId, UpdateReviewRequest request) {
        Review review = reviewRepository.findByIdAndUserId(reviewId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (!canEdit(review)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Review can only be edited within " + editWindowHours + " hours. Post a new review instead."
            );
        }

        review.setRating(request.rating());
        review.setText(request.text().trim());
        review.setUpdatedAt(Instant.now());
        return toDto(review, userId);
    }

    public boolean canEdit(Review review) {
        return review.getCreatedAt().plus(editWindowHours, ChronoUnit.HOURS).isAfter(Instant.now());
    }

    private void ensureEstablishmentExists(Long establishmentId) {
        if (!establishmentRepository.existsById(establishmentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Establishment not found");
        }
    }

    private ReviewDto toDto(Review review, Long currentUserId) {
        boolean owned = currentUserId != null && currentUserId.equals(review.getUser().getId());
        return new ReviewDto(
                review.getId(),
                review.getEstablishment().getId(),
                review.getUser().getId(),
                review.getUser().getDisplayName(),
                review.getRating(),
                review.getText(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                owned && canEdit(review),
                owned
        );
    }
}
