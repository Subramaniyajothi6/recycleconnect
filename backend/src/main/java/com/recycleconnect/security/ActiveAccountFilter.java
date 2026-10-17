package com.recycleconnect.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Runs after the JWT is verified. Loads the user and refuses the request when:
 * the account no longer exists, its tokens were revoked (password change, block), it is turned off,
 * or it is a collector still waiting for approval (they may only use their own account pages).
 * This makes blocking a user take effect on their very next request.
 */
public class ActiveAccountFilter extends OncePerRequestFilter {

    public static final String ATTRIBUTE = "rc.currentUser";

    /** What a collector waiting for approval may still use. */
    private static final List<String> PENDING_ALLOWED = List.of(
            "/api/auth/me", "/api/account/", "/api/notifications", "/api/collector/id-proof");

    private final UserRepository users;

    public ActiveAccountFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            User user = users.findById(Long.valueOf(jwt.getToken().getSubject())).orElse(null);
            Number ver = jwt.getToken().getClaim("ver");
            if (user == null || ver == null || ver.intValue() != user.getTokenVersion()) {
                deny(res, HttpStatus.UNAUTHORIZED, "Your session has ended. Sign in again.");
                return;
            }
            if (user.getStatus() == UserStatus.BLOCKED || user.getStatus() == UserStatus.INACTIVE) {
                deny(res, HttpStatus.FORBIDDEN, "This account is turned off. Contact the RecycleConnect team.");
                return;
            }
            if (user.getStatus() == UserStatus.PENDING_APPROVAL
                    && PENDING_ALLOWED.stream().noneMatch(p -> req.getRequestURI().startsWith(p))) {
                deny(res, HttpStatus.FORBIDDEN, "Your account is waiting for approval.");
                return;
            }
            req.setAttribute(ATTRIBUTE, user);
        }
        chain.doFilter(req, res);
    }

    private static void deny(HttpServletResponse res, HttpStatus status, String message) throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write("{\"message\":\"" + message + "\",\"fields\":{}}");
    }
}
