package com.tastetrace.establishments;

import com.tastetrace.config.CacheConfig;
import com.tastetrace.review.ReviewChangedEvent;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class EstablishmentCacheInvalidator {

    /**
     * Runs only after the review transaction commits: evicting earlier would let a
     * concurrent request re-cache the old ratings before the new review is visible.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @CacheEvict(cacheNames = CacheConfig.ESTABLISHMENTS, allEntries = true)
    public void onReviewChanged(ReviewChangedEvent event) {
    }
}
