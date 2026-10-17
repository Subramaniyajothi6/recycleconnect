package com.recycleconnect.admin;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.request.CollectorController.AvailabilityInput;
import com.recycleconnect.request.RequestDtos.ReasonInput;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping("/customers")
    public AdminUserService.CustomerPage customers(@RequestParam(required = false) String q,
            @RequestParam(required = false) String type, @RequestParam(required = false) String status,
            @RequestParam(required = false) String area, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return service.customers(q, type, status, area, page, size);
    }

    @GetMapping("/customers/{id}")
    public MeResponse customer(@CurrentUser User me, @PathVariable Long id) {
        return service.customer(me, id);
    }

    @GetMapping("/collectors")
    public AdminUserService.Collectors collectors(@RequestParam(required = false) String q,
            @RequestParam(required = false) Long zoneId) {
        return service.collectors(q, zoneId);
    }

    @PostMapping("/collectors/{id}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void approve(@CurrentUser User me, @PathVariable Long id) {
        service.approve(me, id);
    }

    @PostMapping("/collectors/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        service.reject(me, id, in.reason());
    }

    @PutMapping("/collectors/{id}/availability")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void availability(@CurrentUser User me, @PathVariable Long id, @RequestBody AvailabilityInput in) {
        service.setAvailability(me, id, in.available());
    }

    @PutMapping("/collectors/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void edit(@CurrentUser User me, @PathVariable Long id, @RequestBody AdminUserService.CollectorEdit in) {
        service.editCollector(me, id, in);
    }

    @PostMapping("/users/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@CurrentUser User me, @PathVariable Long id, @RequestBody AdminUserService.StatusInput in) {
        service.setStatus(me, id, in.status(), in.reason());
    }
}
