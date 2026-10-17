package com.recycleconnect.common;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** An error whose message is safe to show to the user as-is, optionally tied to form fields. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Map<String, String> fields;

    public ApiException(HttpStatus status, String message) {
        this(status, message, Map.of());
    }

    public ApiException(HttpStatus status, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.fields = Map.copyOf(fields);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getFields() {
        return fields;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    /** A single field is wrong, e.g. a mobile number that is already registered. */
    public static ApiException field(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, Map.of(field, message));
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }
}
