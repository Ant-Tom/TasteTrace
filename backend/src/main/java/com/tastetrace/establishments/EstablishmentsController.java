package com.tastetrace.establishments;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/establishments")
public class EstablishmentsController {

    @GetMapping
    public List<EstablishmentDto> list() {
        return List.of(
                new EstablishmentDto(1L, "Ромэйн", "Italian", "Казань", 4.7, 55.7938, 49.1221),
                new EstablishmentDto(2L, "Yokoso", "Japanese", "Казань", 4.5, 55.7901, 49.1130),
                new EstablishmentDto(3L, "Грузинские Истории", "Georgian", "Казань", 4.8, 55.7964, 49.1089),
                new EstablishmentDto(4L, "Burger Club", "Burgers", "Казань", 4.3, 55.7887, 49.1204)
        );
    }
}
