package com.recycleconnect.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Every error leaves the API as {@code {"message": "...", "fields": {...}}} so the frontend can show it
 * next to the right input.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorBody(String message, Map<String, String> fields) {
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> handleApi(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new ErrorBody(e.getMessage(), e.getFields()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> handleInvalid(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new ErrorBody("Check the highlighted fields.", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorBody> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new ErrorBody("The request could not be read.", Map.of()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorBody> handleDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorBody("You don't have access to this.", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorBody> handleOther(Exception e) {
        // Spring MVC's own errors (unknown path, wrong method, missing parameter) keep their status.
        if (e instanceof ErrorResponse er) {
            String detail = er.getBody().getDetail();
            return ResponseEntity.status(er.getStatusCode())
                    .body(new ErrorBody(detail != null ? detail : "Request failed.", Map.of()));
        }
        log.error("Unhandled error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody("Something went wrong on our side. Try again.", Map.of()));
    }
}
