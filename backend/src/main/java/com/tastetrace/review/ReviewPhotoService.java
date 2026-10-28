package com.tastetrace.review;

import com.tastetrace.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
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

    private static final Logger log = LoggerFactory.getLogger(ReviewPhotoService.class);

    private static final int MAX_PHOTOS_PER_REVIEW = 6;
    private static final long MAX_FILE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final PhotoStorage storage;
    private final ReviewRepository reviewRepository;
    private final ReviewPhotoRepository reviewPhotoRepository;
    private final ImageThumbnailer thumbnailer;
    private final int editWindowHours;

    public ReviewPhotoService(
            PhotoStorage storage,
            ReviewRepository reviewRepository,
            ReviewPhotoRepository reviewPhotoRepository,
            ImageThumbnailer thumbnailer,
            AppProperties appProperties
    ) {
        this.storage = storage;
        this.reviewRepository = reviewRepository;
        this.reviewPhotoRepository = reviewPhotoRepository;
        this.thumbnailer = thumbnailer;
        this.editWindowHours = appProperties.review().editWindowHours();
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

    /** The preview lives at {@code <url>/thumb}. */
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
        ReviewPhoto photo = findPhoto(photoId);
        try {
            return new PhotoContent(storage.open(photo.getObjectKey()), photo.getContentType());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
    }

    /**
     * Serves the stored preview; photos uploaded before previews existed get one
     * generated on first request. If that fails, the original is served instead.
     */
    @Transactional
    public PhotoContent loadThumbnail(Long photoId) {
        ReviewPhoto photo = findPhoto(photoId);
        if (photo.getThumbObjectKey() != null) {
            try {
                return new PhotoContent(storage.open(photo.getThumbObjectKey()), ImageThumbnailer.CONTENT_TYPE);
            } catch (Exception e) {
                log.warn("Thumbnail {} is missing, regenerating", photo.getThumbObjectKey());
            }
        }

        byte[] original;
        try (InputStream stream = storage.open(photo.getObjectKey())) {
            original = stream.readAllBytes();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }

        byte[] thumbnail = storeThumbnail(photo, original);
        if (thumbnail == null) {
            return new PhotoContent(new ByteArrayInputStream(original), photo.getContentType());
        }
        return new PhotoContent(new ByteArrayInputStream(thumbnail), ImageThumbnailer.CONTENT_TYPE);
    }

    private ReviewPhoto findPhoto(Long photoId) {
        return reviewPhotoRepository.findById(photoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
    }

    private ReviewPhoto persistPhoto(Review review, MultipartFile file, int sortOrder) {
        String objectKey = "reviews/" + review.getId() + "/" + UUID.randomUUID();
        byte[] bytes;
        try {
            bytes = file.getBytes();
            storage.put(objectKey, bytes);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store photo");
        }

        ReviewPhoto photo = new ReviewPhoto();
        photo.setReview(review);
        photo.setObjectKey(objectKey);
        photo.setContentType(file.getContentType());
        photo.setSortOrder(sortOrder);
        storeThumbnail(photo, bytes);
        return reviewPhotoRepository.save(photo);
    }

    /** Returns the preview bytes, or null if the image could not be processed (the upload still succeeds). */
    private byte[] storeThumbnail(ReviewPhoto photo, byte[] original) {
        try {
            byte[] thumbnail = thumbnailer.createThumbnail(original);
            String thumbKey = photo.getObjectKey() + "-thumb.jpg";
            storage.put(thumbKey, thumbnail);
            photo.setThumbObjectKey(thumbKey);
            return thumbnail;
        } catch (Exception e) {
            log.warn("Could not create thumbnail for {}: {}", photo.getObjectKey(), e.getMessage());
            return null;
        }
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
