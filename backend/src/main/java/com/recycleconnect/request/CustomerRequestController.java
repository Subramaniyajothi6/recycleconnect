package com.recycleconnect.request;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
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

import com.recycleconnect.request.RequestDtos.ConfirmInput;
import com.recycleconnect.request.RequestDtos.ReasonInput;
import com.recycleconnect.request.RequestDtos.RequestCard;
import com.recycleconnect.request.RequestDtos.RequestDetail;
import com.recycleconnect.request.RequestDtos.RequestInput;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/customer")
public class CustomerRequestController {

    private final CustomerRequestService service;

    public CustomerRequestController(CustomerRequestService service) {
        this.service = service;
    }

    @GetMapping("/requests")
    public List<RequestCard> list(@CurrentUser User me) {
        return service.list(me);
    }

    @GetMapping("/requests/{id}")
    public RequestDetail get(@CurrentUser User me, @PathVariable Long id) {
        return service.get(me, id);
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public RequestDetail create(@CurrentUser User me, @Valid @RequestBody RequestInput in) {
        return service.create(me, in);
    }

    @PutMapping("/requests/{id}")
    public RequestDetail update(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody RequestInput in) {
        return service.update(me, id, in);
    }

    @DeleteMapping("/requests/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(@CurrentUser User me, @PathVariable Long id) {
        service.deleteDraft(me, id);
    }

    @PostMapping("/requests/{id}/cancel")
    public RequestDetail cancel(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ReasonInput in) {
        return service.cancel(me, id, in.reason());
    }

    @PostMapping("/requests/{id}/confirm")
    public RequestDetail confirm(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ConfirmInput in) {
        return service.confirm(me, id, in);
    }

    @PostMapping(path = "/requests/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RequestDetail addPhoto(@CurrentUser User me, @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return service.addPhoto(me, id, file);
    }

    @DeleteMapping("/requests/{id}/photos/{photoId}")
    public RequestDetail deletePhoto(@CurrentUser User me, @PathVariable Long id, @PathVariable Long photoId) {
        return service.deletePhoto(me, id, photoId);
    }

    @GetMapping("/summary")
    public CustomerRequestService.Summary summary(@CurrentUser User me) {
        return service.summary(me);
    }
}
