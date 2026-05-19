package com.tastetrace.establishments;

public record EstablishmentDto(
        Long id,
        String name,
        String cuisine,
        String city,
        Double rating,
        Double latitude,
        Double longitude
) {
}
