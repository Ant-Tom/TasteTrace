package com.tastetrace.establishments;

import com.tastetrace.config.CacheConfig;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EstablishmentService {

    private final EstablishmentRepository establishmentRepository;
    private final com.tastetrace.review.ReviewRepository reviewRepository;

    public EstablishmentService(
            EstablishmentRepository establishmentRepository,
            com.tastetrace.review.ReviewRepository reviewRepository
    ) {
        this.establishmentRepository = establishmentRepository;
        this.reviewRepository = reviewRepository;
    }

    /**
     * The full list changes only when reviews change, so it is cached and evicted
     * after a review transaction commits (see {@link com.tastetrace.review.ReviewChangedEvent}).
     */
    @Cacheable(CacheConfig.ESTABLISHMENTS)
    public List<EstablishmentDto> list() {
        Map<Long, RatingStats> statsById = loadRatingStats();
        return establishmentRepository.findAll().stream()
                .map(e -> toDto(e, statsById.getOrDefault(e.getId(), RatingStats.empty())))
                .toList();
    }

    public EstablishmentDto getById(Long id) {
        Establishment establishment = establishmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Establishment not found"));
        return toDto(establishment, loadRatingStats(id));
    }

    private Map<Long, RatingStats> loadRatingStats() {
        Map<Long, RatingStats> map = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateAllEstablishments()) {
            Long id = (Long) row[0];
            map.put(id, toStats(row[1], row[2]));
        }
        return map;
    }

    private RatingStats loadRatingStats(Long establishmentId) {
        List<Object[]> rows = reviewRepository.aggregateByEstablishment(establishmentId);
        if (rows.isEmpty()) {
            return RatingStats.empty();
        }
        return toStats(rows.get(0)[0], rows.get(0)[1]);
    }

    private RatingStats toStats(Object average, Object count) {
        double avg = average != null ? ((Number) average).doubleValue() : 0;
        long total = count != null ? ((Number) count).longValue() : 0;
        return new RatingStats(avg, (int) total);
    }

    private EstablishmentDto toDto(Establishment establishment, RatingStats stats) {
        double rating = stats.count() > 0 ? round(stats.average()) : 0;
        return new EstablishmentDto(
                establishment.getId(),
                establishment.getName(),
                establishment.getCuisine(),
                establishment.getCity(),
                rating,
                stats.count(),
                establishment.getLatitude(),
                establishment.getLongitude(),
                establishment.getAddress()
        );
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record RatingStats(double average, int count) {
        static RatingStats empty() {
            return new RatingStats(0, 0);
        }
    }
}
