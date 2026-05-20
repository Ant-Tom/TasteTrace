package com.tastetrace.establishments;

public record EstablishmentDto(
        Long id,
        String name,
        String cuisine,
        String city,
        double rating,
        int reviewCount,
        double latitude,
        double longitude
) {
}
