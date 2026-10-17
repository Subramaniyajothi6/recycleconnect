package com.recycleconnect.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.auth.AuthDtos.AuthResponse;
import com.recycleconnect.auth.AuthDtos.LoginRequest;
import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.auth.AuthDtos.RegisterCollectorRequest;
import com.recycleconnect.auth.AuthDtos.RegisterCustomerRequest;
import com.recycleconnect.config.AppProperties;
import com.recycleconnect.security.ClientIp;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.servlet.http.HttpServletRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final AppProperties props;

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    private String ip(HttpServletRequest http) {
        return ClientIp.of(http, props.trustedProxySet());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return auth.login(req, ip(http));
    }

    @PostMapping("/register/customer")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerCustomer(@Valid @RequestBody RegisterCustomerRequest req, HttpServletRequest http) {
        return auth.registerCustomer(req, ip(http));
    }

    @PostMapping("/register/collector")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerCollector(@Valid @RequestBody RegisterCollectorRequest req, HttpServletRequest http) {
        return auth.registerCollector(req, ip(http));
    }

    @GetMapping("/me")
    public MeResponse me(@CurrentUser User user) {
        return auth.me(user.getId());
    }
}
