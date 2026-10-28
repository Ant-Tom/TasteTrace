package com.tastetrace.establishments;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
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

    /**
     * no-cache + ETag (see WebConfig): the browser keeps the list and revalidates it,
     * getting an empty 304 instead of the full payload when nothing changed.
     */
    @GetMapping
    public ResponseEntity<List<EstablishmentDto>> list() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(establishmentService.list());
    }

    @GetMapping("/{id}")
    public EstablishmentDto get(@PathVariable Long id) {
        return establishmentService.getById(id);
    }
}
