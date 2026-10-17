package com.recycleconnect.notification;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

/** Every signed-in user reads only their own notifications. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public NotificationService.Inbox inbox(@CurrentUser User me, @RequestParam(defaultValue = "50") int limit) {
        return service.inbox(me, limit);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@CurrentUser User me, @PathVariable Long id) {
        service.markRead(me, id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll(@CurrentUser User me) {
        service.markAllRead(me);
    }
}
