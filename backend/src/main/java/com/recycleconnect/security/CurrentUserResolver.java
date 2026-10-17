package com.recycleconnect.security;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.recycleconnect.common.ApiException;
import com.recycleconnect.user.User;

public class CurrentUserResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class) && parameter.getParameterType() == User.class;
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav, NativeWebRequest request,
            WebDataBinderFactory binderFactory) {
        Object user = request.getAttribute(ActiveAccountFilter.ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Sign in to continue.");
        }
        return user;
    }
}
