package com.tastetrace.establishments;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/establishments")
public class EstablishmentsController {

    private final EstablishmentService establishmentService;

    public EstablishmentsController(EstablishmentService establishmentService) {
        this.establishmentService = establishmentService;
    }

    @GetMapping
    public List<EstablishmentDto> list() {
        return establishmentService.list();
    }

    @GetMapping("/{id}")
    public EstablishmentDto get(@PathVariable Long id) {
        return establishmentService.getById(id);
    }
}
