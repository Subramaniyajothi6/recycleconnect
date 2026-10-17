package com.recycleconnect.auth;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.auth.AccountService.PasswordInput;
import com.recycleconnect.auth.AccountService.PreferencesInput;
import com.recycleconnect.auth.AccountService.ProfileInput;
import com.recycleconnect.auth.AuthDtos.AddressInput;
import com.recycleconnect.auth.AuthDtos.AuthResponse;
import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.user.User;

import jakarta.validation.Valid;

@RestController
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    @PutMapping("/api/account/password")
    public AuthResponse password(@CurrentUser User me, @Valid @RequestBody PasswordInput in) {
        return service.changePassword(me, in);
    }

    @PutMapping("/api/account/preferences")
    public MeResponse preferences(@CurrentUser User me, @Valid @RequestBody PreferencesInput in) {
        return service.preferences(me, in);
    }

    @PutMapping("/api/customer/profile")
    public MeResponse profile(@CurrentUser User me, @Valid @RequestBody ProfileInput in) {
        return service.updateCustomerProfile(me, in);
    }

    @PostMapping("/api/customer/addresses")
    public MeResponse addAddress(@CurrentUser User me, @Valid @RequestBody AddressInput in) {
        return service.addAddress(me, in);
    }

    @PutMapping("/api/customer/addresses/{id}")
    public MeResponse updateAddress(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody AddressInput in) {
        return service.updateAddress(me, id, in);
    }

    @PostMapping("/api/customer/addresses/{id}/default")
    public MeResponse makeDefault(@CurrentUser User me, @PathVariable Long id) {
        return service.makeDefault(me, id);
    }

    @DeleteMapping("/api/customer/addresses/{id}")
    public MeResponse deleteAddress(@CurrentUser User me, @PathVariable Long id) {
        return service.deleteAddress(me, id);
    }
}
