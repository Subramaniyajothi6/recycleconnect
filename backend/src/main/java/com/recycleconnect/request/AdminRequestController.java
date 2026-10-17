package com.recycleconnect.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.request.AdminRequestService.Filters;
import com.recycleconnect.request.AdminRequestService.Tab;
import com.recycleconnect.request.RequestDtos.AssignInput;
import com.recycleconnect.request.RequestDtos.FailInput;
import com.recycleconnect.request.RequestDtos.ReasonInput;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.RescheduleInput;
import com.recycleconnect.request.RequestDtos.ScheduleInput;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminRequestController {

    private final AdminRequestService service;

    public AdminRequestController(AdminRequestService service) {
        this.service = service;
    }

    @GetMapping("/requests")
    public AdminRequestService.Page list(
            @RequestParam(required = false) Tab tab, @RequestParam(required = false) String status,
            @RequestParam(required = false) String q, @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long collectorId, @RequestParam(required = false) BigDecimal minQty,
            @RequestParam(required = false) BigDecimal maxQty, @RequestParam(required = false) String customerType,
            @RequestParam(required = false) String pickupStatus,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return service.list(new Filters(tab, status, q, categoryId, zoneId, from, to, collectorId, minQty, maxQty,
                customerType, pickupStatus, page, size));
    }

    @GetMapping("/requests/{id}")
    public RequestDetail get(@CurrentUser User me, @PathVariable Long id) {
        return service.get(me, id);
    }

    @PostMapping("/requests/{id}/review")
    public RequestDetail startReview(@CurrentUser User me, @PathVariable Long id) {
        return service.startReview(me, id);
    }

    @PostMapping("/requests/{id}/accept")
    public RequestDetail accept(@CurrentUser User me, @PathVariable Long id) {
        return service.accept(me, id);
    }

    @PostMapping("/requests/{id}/reject")
    public RequestDetail reject(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        return service.reject(me, id, in.reason());
    }

    @PostMapping("/requests/{id}/request-info")
    public RequestDetail requestInfo(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        return service.requestInfo(me, id, in.reason());
    }

    @PostMapping("/requests/{id}/cancel")
    public RequestDetail cancel(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        return service.cancel(me, id, in.reason());
    }

    @PostMapping("/requests/{id}/schedule")
    public RequestDetail schedule(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ScheduleInput in) {
        return service.schedule(me, id, in);
    }

    @PostMapping("/requests/{id}/assign")
    public RequestDetail assign(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody AssignInput in) {
        return service.assign(me, id, in.collectorId());
    }

    @PostMapping("/requests/{id}/reschedule")
    public RequestDetail reschedule(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody RescheduleInput in) {
        return service.reschedule(me, id, in);
    }

    @PostMapping("/requests/{id}/fail")
    public RequestDetail fail(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody FailInput in) {
        return service.fail(me, id, in.reason(), in.note());
    }

    @GetMapping("/requests/{id}/collector-options")
    public List<CollectorMatcher.Option> options(@PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.collectorOptions(id, date);
    }

    @GetMapping("/schedule")
    public AdminRequestService.Board board(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.board(date);
    }
}
