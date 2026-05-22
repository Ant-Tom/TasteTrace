package com.tastetrace.review;

import com.tastetrace.config.AppProperties;
import com.tastetrace.config.MinioProperties;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReviewPhotoService {

    private static final int MAX_PHOTOS_PER_REVIEW = 6;
    private static final long MAX_FILE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final ReviewRepository reviewRepository;
    private final ReviewPhotoRepository reviewPhotoRepository;
    private final int editWindowHours;

    public ReviewPhotoService(
            MinioClient minioClient,
            MinioProperties minioProperties,
            ReviewRepository reviewRepository,
            ReviewPhotoRepository reviewPhotoRepository,
            AppProperties appProperties
    ) {
        this.minioClient = minioClient;
        this.minioProperties = minioProperties;
        this.reviewRepository = reviewRepository;
        this.reviewPhotoRepository = reviewPhotoRepository;
        this.editWindowHours = appProperties.review().editWindowHours();
    }

    @PostConstruct
    void ensureBucket() {
        try {
            String bucket = minioProperties.bucketReviews();
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize MinIO bucket", e);
        }
    }

    public Map<Long, List<String>> photoUrlsByReviewIds(List<Long> reviewIds) {
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        return reviewPhotoRepository.findByReviewIds(reviewIds).stream()
                .collect(Collectors.groupingBy(
                        photo -> photo.getReview().getId(),
                        Collectors.mapping(photo -> photoUrl(photo.getId()), Collectors.toList())
                ));
    }

    public List<String> photoUrlsForReview(Long reviewId) {
        return reviewPhotoRepository.findByReviewIdOrderBySortOrderAscIdAsc(reviewId).stream()
                .map(photo -> photoUrl(photo.getId()))
                .toList();
    }

    public String photoUrl(Long photoId) {
        return "/api/reviews/photos/" + photoId;
    }

    @Transactional
    public List<String> upload(Long reviewId, Long userId, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return photoUrlsForReview(reviewId);
        }
        Review review = reviewRepository.findByIdAndUserId(reviewId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        if (!canEdit(review)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Photos can only be added within the review edit window"
            );
        }

        int existing = reviewPhotoRepository.countByReviewId(reviewId);
        if (existing + files.size() > MAX_PHOTOS_PER_REVIEW) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Maximum " + MAX_PHOTOS_PER_REVIEW + " photos per review"
            );
        }

        List<ReviewPhoto> saved = new ArrayList<>();
        int sortOrder = existing;
        for (MultipartFile file : files) {
            validateFile(file);
            ReviewPhoto photo = persistPhoto(review, file, sortOrder++);
            saved.add(photo);
        }
        return saved.stream().map(p -> photoUrl(p.getId())).toList();
    }

    public PhotoContent loadPhoto(Long photoId) {
        ReviewPhoto photo = reviewPhotoRepository.findById(photoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        try {
            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.bucketReviews())
                            .object(photo.getObjectKey())
                            .build()
            );
            return new PhotoContent(stream, photo.getContentType());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
    }

    private ReviewPhoto persistPhoto(Review review, MultipartFile file, int sortOrder) {
        String objectKey = "reviews/" + review.getId() + "/" + UUID.randomUUID();
        try (InputStream input = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.bucketReviews())
                            .object(objectKey)
                            .stream(input, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store photo");
        }

        ReviewPhoto photo = new ReviewPhoto();
        photo.setReview(review);
        photo.setObjectKey(objectKey);
        photo.setContentType(file.getContentType());
        photo.setSortOrder(sortOrder);
        return reviewPhotoRepository.save(photo);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large (max 5 MB)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG and WebP images are allowed");
        }
    }

    private boolean canEdit(Review review) {
        return review.getCreatedAt().plus(editWindowHours, ChronoUnit.HOURS).isAfter(Instant.now());
    }

    public record PhotoContent(InputStream stream, String contentType) {
    }
}
