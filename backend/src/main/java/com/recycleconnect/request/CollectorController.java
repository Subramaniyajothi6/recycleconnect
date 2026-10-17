package com.recycleconnect.request;

import java.time.LocalDate;
import java.time.YearMonth;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.request.RequestDtos.FailInput;
import com.recycleconnect.request.RequestDtos.ReasonInput;
import com.recycleconnect.request.RequestDtos.RecordInput;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.StepInput;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/collector")
public class CollectorController {

    public record AvailabilityInput(boolean available) {
    }

    private final CollectorService service;
    private final BusinessClock clock;

    public CollectorController(CollectorService service, BusinessClock clock) {
        this.service = service;
        this.clock = clock;
    }

    @GetMapping("/today")
    public CollectorService.Today today(@CurrentUser User me,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status, @RequestParam(required = false) Long categoryId) {
        return service.today(me, date, status, categoryId);
    }

    @GetMapping("/assigned")
    public CollectorService.Assigned assigned(@CurrentUser User me) {
        return service.assigned(me);
    }

    @GetMapping("/history")
    public CollectorService.History history(@CurrentUser User me, @RequestParam(required = false) String month,
            @RequestParam(required = false) String status, @RequestParam(required = false) Long categoryId) {
        return service.history(me, month(month), status, categoryId);
    }

    @GetMapping("/stats")
    public CollectorService.Stats stats(@CurrentUser User me, @RequestParam(required = false) String month) {
        YearMonth m = month(month);
        return service.stats(me.getId(), m != null ? m : YearMonth.from(clock.today()));
    }

    private static YearMonth month(String s) {
        try {
            return s == null || s.isBlank() ? null : YearMonth.parse(s);
        } catch (java.time.format.DateTimeParseException e) {
            throw com.recycleconnect.common.ApiException.badRequest("Use a month like 2026-10.");
        }
    }

    @GetMapping("/pickups/{id}")
    public RequestDetail detail(@CurrentUser User me, @PathVariable Long id) {
        return service.detail(me, id);
    }

    @PostMapping("/pickups/{id}/step")
    public RequestDetail step(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody StepInput in) {
        return service.step(me, id, in.to());
    }

    @PostMapping("/pickups/{id}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        service.decline(me, id, in.reason());
    }

    @PostMapping("/pickups/{id}/record")
    public RequestDetail record(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody RecordInput in) {
        return service.record(me, id, in);
    }

    @PostMapping("/pickups/{id}/complete")
    public RequestDetail complete(@CurrentUser User me, @PathVariable Long id) {
        return service.complete(me, id);
    }

    @PostMapping("/pickups/{id}/fail")
    public RequestDetail fail(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody FailInput in) {
        return service.fail(me, id, in.reason(), in.note());
    }

    @PostMapping(path = "/pickups/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RequestDetail addPhoto(@CurrentUser User me, @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return service.addEvidence(me, id, file);
    }

    @PutMapping("/availability")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void availability(@CurrentUser User me, @RequestBody AvailabilityInput in) {
        service.setAvailable(me, in.available());
    }

    @PostMapping(path = "/id-proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void idProof(@CurrentUser User me, @RequestParam("file") MultipartFile file) {
        service.uploadIdProof(me, file);
    }
}
