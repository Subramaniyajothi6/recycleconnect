package com.recycleconnect.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.auth.AuthDtos.AddressView;
import com.recycleconnect.auth.AuthDtos.AuthResponse;
import com.recycleconnect.auth.AuthDtos.CollectorView;
import com.recycleconnect.auth.AuthDtos.CustomerView;
import com.recycleconnect.auth.AuthDtos.LoginRequest;
import com.recycleconnect.auth.AuthDtos.MeResponse;
import com.recycleconnect.auth.AuthDtos.RegisterCollectorRequest;
import com.recycleconnect.auth.AuthDtos.RegisterCustomerRequest;
import com.recycleconnect.auth.AuthDtos.ZoneView;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.security.RateLimiter;
import com.recycleconnect.user.Address;
import com.recycleconnect.user.AddressRepository;
import com.recycleconnect.user.CollectorProfile;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.CustomerProfile;
import com.recycleconnect.user.CustomerProfileRepository;
import com.recycleconnect.user.Phones;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;
import com.recycleconnect.zone.Zone;
import com.recycleconnect.zone.ZoneRepository;

@Service
public class AuthService {

    static final String BAD_LOGIN = "That mobile number, email or password is wrong.";
    static final String ACCOUNT_OFF = "This account is turned off. Contact the RecycleConnect team.";
    static final String TOO_MANY_LOGINS = "Too many sign-in attempts. Wait 15 minutes and try again.";
    static final String TOO_MANY_SIGNUPS = "Too many new accounts from this network. Try again in an hour.";

    /** Failed sign-ins allowed per account, and attempts per network, in 15 minutes. */
    static final int MAX_FAILS_PER_ACCOUNT = 5;
    static final int MAX_ATTEMPTS_PER_IP = 30;
    static final int MAX_SIGNUPS_PER_IP = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    /** Compared against when the user doesn't exist, so a wrong login takes the same time either way. */
    private final String dummyHash;

    private final UserRepository users;
    private final CustomerProfileRepository customerProfiles;
    private final CollectorProfileRepository collectorProfiles;
    private final AddressRepository addresses;
    private final ZoneRepository zones;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuditService audit;
    private final RateLimiter limiter;

    public AuthService(UserRepository users, CustomerProfileRepository customerProfiles,
            CollectorProfileRepository collectorProfiles, AddressRepository addresses, ZoneRepository zones,
            PasswordEncoder passwords, TokenService tokens, AuditService audit, RateLimiter limiter) {
        this.users = users;
        this.customerProfiles = customerProfiles;
        this.collectorProfiles = collectorProfiles;
        this.addresses = addresses;
        this.zones = zones;
        this.passwords = passwords;
        this.tokens = tokens;
        this.audit = audit;
        this.limiter = limiter;
        this.dummyHash = passwords.encode("not-a-real-password");
    }

    @Transactional
    public AuthResponse login(LoginRequest req, String ip) {
        String accountKey = "login:account:" + req.identifier().trim().toLowerCase(Locale.ROOT).replaceAll("\\s", "");
        limiter.check(accountKey, MAX_FAILS_PER_ACCOUNT, WINDOW, TOO_MANY_LOGINS);
        limiter.hit("login:ip:" + ip, MAX_ATTEMPTS_PER_IP, WINDOW, TOO_MANY_LOGINS);

        Optional<User> found = findByIdentifier(req.identifier());
        boolean matches = passwords.matches(req.password(), found.map(User::getPasswordHash).orElse(dummyHash));
        if (found.isEmpty() || !matches) {
            limiter.record(accountKey);
            throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_LOGIN);
        }
        limiter.reset(accountKey);
        User user = found.get();
        if (user.getStatus() == UserStatus.BLOCKED || user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, ACCOUNT_OFF);
        }
        user.setLastLoginAt(Instant.now());
        audit.record(user, "SIGN_IN", "user", user.getId(), Map.of("ip", ip));
        return withToken(user);
    }

    private Optional<User> findByIdentifier(String identifier) {
        String id = identifier.trim();
        if (id.contains("@")) {
            return users.findByEmail(id.toLowerCase(Locale.ROOT));
        }
        String mobile = Phones.normalize(id);
        return mobile == null ? Optional.empty() : users.findByMobile(mobile);
    }

    @Transactional
    public AuthResponse registerCustomer(RegisterCustomerRequest req, String ip) {
        limiter.hit("signup:ip:" + ip, MAX_SIGNUPS_PER_IP, Duration.ofHours(1), TOO_MANY_SIGNUPS);
        String mobile = requireFreeMobile(req.mobile());
        String email = requireFreeEmail(req.email());

        User user = users.save(new User(Role.CUSTOMER, req.name().trim(), email, mobile,
                passwords.encode(req.password()), UserStatus.ACTIVE));
        customerProfiles.save(new CustomerProfile(user.getId(), req.customerType(), req.preferredContact()));
        var a = req.address();
        addresses.save(new Address(user.getId(), blankToNull(a.label()) == null ? "Home" : a.label().trim(),
                a.line1().trim(), a.area().trim(), a.city().trim(), a.district().trim(), a.state().trim(),
                a.pin(), a.lat(), a.lng(), true));

        audit.record(user, "REGISTER", "user", user.getId(),
                Map.of("role", "CUSTOMER", "customerType", req.customerType().name()));
        return withToken(user);
    }

    @Transactional
    public AuthResponse registerCollector(RegisterCollectorRequest req, String ip) {
        limiter.hit("signup:ip:" + ip, MAX_SIGNUPS_PER_IP, Duration.ofHours(1), TOO_MANY_SIGNUPS);
        String mobile = requireFreeMobile(req.mobile());
        String email = blankToNull(req.email()) == null ? null : requireFreeEmail(req.email());

        Set<Zone> picked = new HashSet<>(zones.findAllById(req.zoneIds()));
        if (picked.size() != req.zoneIds().size()) {
            throw ApiException.field("zoneIds", "One of the areas no longer exists. Reload and pick again.");
        }

        // Collectors wait for an admin before they get pickups (DECISIONS P5).
        User user = users.save(new User(Role.COLLECTOR, req.name().trim(), email, mobile,
                passwords.encode(req.password()), UserStatus.PENDING_APPROVAL));
        collectorProfiles.save(new CollectorProfile(user.getId(), req.vehicleType(),
                req.vehicleNumber().trim().toUpperCase(Locale.ROOT), req.workingDays(), picked));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("role", "COLLECTOR");
        details.put("zones", picked.stream().map(Zone::getCode).sorted().toList());
        audit.record(user, "REGISTER", "user", user.getId(), details);
        return withToken(user);
    }

    @Transactional(readOnly = true)
    public MeResponse me(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sign in to continue."));
        return view(user);
    }

    AuthResponse withToken(User user) {
        TokenService.IssuedToken t = tokens.issue(user);
        return new AuthResponse(t.token(), t.expiresAt(), view(user));
    }

    MeResponse view(User user) {
        CustomerView customer = null;
        CollectorView collector = null;
        if (user.getRole() == Role.CUSTOMER) {
            CustomerProfile p = customerProfiles.findById(user.getId()).orElseThrow();
            var list = addresses.findByUserIdOrderByIsDefaultDescIdAsc(user.getId()).stream()
                    .map(a -> new AddressView(a.getId(), a.getLabel(), a.getLine1(), a.getArea(), a.getCity(),
                            a.getDistrict(), a.getState(), a.getPin(), a.getLat(), a.getLng(), a.isDefault()))
                    .toList();
            customer = new CustomerView(p.getCustomerType().name(), p.getPreferredContact().name(), list);
        } else if (user.getRole() == Role.COLLECTOR) {
            CollectorProfile p = collectorProfiles.findById(user.getId()).orElseThrow();
            var zoneViews = p.getZones().stream()
                    .map(z -> new ZoneView(z.getId(), z.getName(), z.getCode()))
                    .sorted((x, y) -> x.name().compareTo(y.name())).toList();
            collector = new CollectorView(p.getVehicleType() != null ? p.getVehicleType().name() : null,
                    p.getVehicleNumber(), p.isAvailable(), zoneViews,
                    p.getWorkingDays().stream().sorted().toList(), p.getApprovedAt(), p.getIdProofPath() != null);
        }
        return new MeResponse(user.getId(), user.getRole().name(), user.getStatus().name(), user.getName(),
                user.getEmail(), user.getMobile(), user.getPreferredLanguage(), user.isEmailNotifications(),
                user.isReminderEnabled(), user.getCreatedAt(), customer, collector);
    }

    private String requireFreeMobile(String raw) {
        String mobile = Phones.normalize(raw);
        if (mobile == null) {
            throw ApiException.field("mobile", "Enter a 10-digit mobile number, like 98400 12345");
        }
        if (users.existsByMobile(mobile)) {
            throw ApiException.field("mobile", "This mobile number is already registered. Sign in instead.");
        }
        return mobile;
    }

    String requireFreeEmail(String raw) {
        String email = raw.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw ApiException.field("email", "This email is already registered. Sign in instead.");
        }
        return email;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
