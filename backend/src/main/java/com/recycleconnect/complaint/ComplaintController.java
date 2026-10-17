package com.recycleconnect.complaint;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.complaint.ComplaintService.CreateInput;
import com.recycleconnect.complaint.ComplaintService.NoteInput;
import com.recycleconnect.complaint.ComplaintService.ResolveInput;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
public class ComplaintController {

    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @PostMapping("/api/customer/complaints")
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintService.Row create(@CurrentUser User me, @Valid @RequestBody CreateInput in) {
        return service.create(me, in);
    }

    @GetMapping("/api/customer/complaints")
    public List<ComplaintService.Row> mine(@CurrentUser User me) {
        return service.mine(me);
    }

    @GetMapping("/api/admin/complaints")
    public ComplaintService.AdminPage list(@RequestParam(required = false) Complaint.Status status,
            @RequestParam(required = false) Complaint.Type type, @RequestParam(required = false) String q) {
        return service.list(status, type, q);
    }

    @GetMapping("/api/admin/complaints/{id}")
    public ComplaintService.Detail detail(@PathVariable Long id) {
        return service.detail(id);
    }

    @PostMapping("/api/admin/complaints/{id}/review")
    public ComplaintService.Detail review(@CurrentUser User me, @PathVariable Long id) {
        return service.review(me, id);
    }

    @PostMapping("/api/admin/complaints/{id}/note")
    public ComplaintService.Detail note(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody NoteInput in) {
        return service.note(me, id, in.note());
    }

    @PostMapping("/api/admin/complaints/{id}/resolve")
    public ComplaintService.Detail resolve(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ResolveInput in) {
        return service.resolve(me, id, in);
    }
}
