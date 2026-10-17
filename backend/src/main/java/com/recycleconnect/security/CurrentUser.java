package com.recycleconnect.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Injects the signed-in {@link com.recycleconnect.user.User} into a controller method. The user was loaded and
 * checked (active, token not revoked) by {@link ActiveAccountFilter} for this request.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}
