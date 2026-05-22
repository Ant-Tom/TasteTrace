package com.tastetrace.review;

import com.tastetrace.auth.AuthUserPrincipal;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewPhotoController {

    private final ReviewPhotoService reviewPhotoService;

    public ReviewPhotoController(ReviewPhotoService reviewPhotoService) {
        this.reviewPhotoService = reviewPhotoService;
    }

    @PostMapping("/{reviewId}/photos")
    public List<String> upload(
            @PathVariable Long reviewId,
            @RequestParam("files") List<MultipartFile> files,
            @AuthenticationPrincipal AuthUserPrincipal principal
    ) {
        return reviewPhotoService.upload(reviewId, principal.userId(), files);
    }

    @GetMapping("/photos/{photoId}")
    public ResponseEntity<InputStreamResource> download(@PathVariable Long photoId) {
        ReviewPhotoService.PhotoContent content = reviewPhotoService.loadPhoto(photoId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(MediaType.parseMediaType(content.contentType()))
                .body(new InputStreamResource(content.stream()));
    }
}
