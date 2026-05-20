package com.tastetrace.establishments;

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

    public List<EstablishmentDto> list() {
        Map<Long, RatingStats> statsById = loadRatingStats();
        return establishmentRepository.findAll().stream()
                .map(e -> toDto(e, statsById.getOrDefault(e.getId(), RatingStats.empty())))
                .toList();
    }

    public EstablishmentDto getById(Long id) {
        Establishment establishment = establishmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Establishment not found"));
        RatingStats stats = loadRatingStats().getOrDefault(id, RatingStats.empty());
        return toDto(establishment, stats);
    }

    private Map<Long, RatingStats> loadRatingStats() {
        Map<Long, RatingStats> map = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateAllEstablishments()) {
            Long id = (Long) row[0];
            double avg = row[1] != null ? ((Number) row[1]).doubleValue() : 0;
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0;
            map.put(id, new RatingStats(avg, (int) count));
        }
        return map;
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
                establishment.getLongitude()
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
