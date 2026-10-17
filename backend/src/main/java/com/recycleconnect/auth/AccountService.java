package com.recycleconnect.auth;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.auth.AuthDtos.AddressInput;
import com.recycleconnect.auth.AuthDtos.AuthResponse;
import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.security.RateLimiter;
import com.recycleconnect.user.Address;
import com.recycleconnect.user.AddressRepository;
import com.recycleconnect.user.ContactPreference;
import com.recycleconnect.user.CustomerProfileRepository;
import com.recycleconnect.user.CustomerType;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The signed-in user's own account: password, preferences, profile and addresses. */
@Service
public class AccountService {

    public record PasswordInput(@NotBlank(message = "Enter your current password") String currentPassword,
            @NotBlank(message = "Create a new password")
            @Size(min = 8, max = 72, message = "Use 8 to 72 characters") String newPassword) {
    }

    public record PreferencesInput(boolean emailNotifications, boolean reminderEnabled,
            @Pattern(regexp = "en|ta", message = "Pick English or Tamil") String preferredLanguage) {
    }

    public record ProfileInput(@NotBlank(message = "Enter your name") @Size(max = 120) String name,
            @NotBlank(message = "Enter your email")
            @Email(regexp = ".+@.+\\..+", message = "Enter a full email address, like name@example.com")
            @Size(max = 160) String email,
            @NotNull CustomerType customerType, @NotNull ContactPreference preferredContact) {
    }

    private final UserRepository users;
    private final AddressRepository addresses;
    private final CustomerProfileRepository customers;
    private final PasswordEncoder passwords;
    private final AuthService auth;
    private final AuditService audit;
    private final RateLimiter limiter;

    public AccountService(UserRepository users, AddressRepository addresses, CustomerProfileRepository customers,
            PasswordEncoder passwords, AuthService auth, AuditService audit, RateLimiter limiter) {
        this.users = users;
        this.addresses = addresses;
        this.customers = customers;
        this.passwords = passwords;
        this.auth = auth;
        this.audit = audit;
        this.limiter = limiter;
    }

    private User fresh(User u) {
        return users.findById(u.getId()).orElseThrow();
    }

    /** Changes the password and signs out every other device; returns a new token for this one. */
    @Transactional
    public AuthResponse changePassword(User current, PasswordInput in) {
        String key = "password:" + current.getId();
        limiter.check(key, 5, Duration.ofMinutes(15), "Too many attempts. Wait 15 minutes and try again.");
        User u = fresh(current);
        if (!passwords.matches(in.currentPassword(), u.getPasswordHash())) {
            limiter.record(key);
            throw ApiException.field("currentPassword", "That's not your current password.");
        }
        if (passwords.matches(in.newPassword(), u.getPasswordHash())) {
            throw ApiException.field("newPassword", "Pick a password you haven't used here.");
        }
        u.changePassword(passwords.encode(in.newPassword()));
        users.flush();
        audit.record(u, "CHANGE_PASSWORD", "user", u.getId(), Map.of());
        return auth.withToken(u);
    }

    @Transactional
    public MeResponse preferences(User current, PreferencesInput in) {
        User u = fresh(current);
        u.setEmailNotifications(in.emailNotifications());
        u.setReminderEnabled(in.reminderEnabled());
        if (in.preferredLanguage() != null) u.setPreferredLanguage(in.preferredLanguage());
        return auth.view(u);
    }

    @Transactional
    public MeResponse updateCustomerProfile(User current, ProfileInput in) {
        User u = fresh(current);
        String email = in.email().trim().toLowerCase(Locale.ROOT);
        if (!email.equals(u.getEmail())) {
            auth.requireFreeEmail(email);
            u.setEmail(email);
        }
        u.setName(in.name().trim());
        customers.findById(u.getId()).orElseThrow().update(in.customerType(), in.preferredContact());
        audit.record(u, "UPDATE_PROFILE", "user", u.getId(), Map.of());
        return auth.view(u);
    }

    // ---------- addresses ----------

    @Transactional
    public MeResponse addAddress(User current, AddressInput in) {
        List<Address> mine = addresses.findByUserIdOrderByIsDefaultDescIdAsc(current.getId());
        if (mine.size() >= 10) throw ApiException.badRequest("You can save up to 10 addresses.");
        addresses.save(new Address(current.getId(), label(in), in.line1().trim(), in.area().trim(), in.city().trim(),
                in.district().trim(), in.state().trim(), in.pin(), in.lat(), in.lng(), mine.isEmpty()));
        return auth.view(fresh(current));
    }

    @Transactional
    public MeResponse updateAddress(User current, Long id, AddressInput in) {
        Address a = own(current, id);
        a.update(label(in), in.line1().trim(), in.area().trim(), in.city().trim(), in.district().trim(),
                in.state().trim(), in.pin(), in.lat(), in.lng());
        return auth.view(fresh(current));
    }

    @Transactional
    public MeResponse makeDefault(User current, Long id) {
        Address target = own(current, id);
        addresses.findByUserIdOrderByIsDefaultDescIdAsc(current.getId()).forEach(a -> a.setDefault(a.getId().equals(target.getId())));
        return auth.view(fresh(current));
    }

    @Transactional
    public MeResponse deleteAddress(User current, Long id) {
        Address a = own(current, id);
        if (a.isDefault()) throw new ApiException(HttpStatus.CONFLICT, "Make another address the default before removing this one.");
        addresses.delete(a);
        return auth.view(fresh(current));
    }

    private Address own(User current, Long id) {
        return addresses.findById(id).filter(a -> a.getUserId().equals(current.getId()))
                .orElseThrow(() -> ApiException.notFound("We couldn't find that address."));
    }

    private static String label(AddressInput in) {
        return in.label() == null || in.label().isBlank() ? "Address" : in.label().trim();
    }
}
