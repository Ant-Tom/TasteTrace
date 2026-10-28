package com.tastetrace.review;

/**
 * Published when a review is created or edited, so cached ratings can be refreshed.
 */
public record ReviewChangedEvent(Long establishmentId) {
}
