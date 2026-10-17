package com.recycleconnect.auth;

import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.config.AppProperties;
import com.recycleconnect.user.Phones;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;

/**
 * Creates the first admin from ADMIN_* values in backend/.env, so no admin password is ever in git.
 * Does nothing if those values are missing or the account already exists.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppProperties props;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuditService audit;

    public AdminBootstrap(AppProperties props, UserRepository users, PasswordEncoder passwords, AuditService audit) {
        this.props = props;
        this.users = users;
        this.passwords = passwords;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Admin admin = props.admin();
        if (admin == null || isBlank(admin.email()) || isBlank(admin.password()) || isBlank(admin.mobile())) {
            log.warn("ADMIN_EMAIL / ADMIN_MOBILE / ADMIN_PASSWORD not set; skipping first-admin setup.");
            return;
        }
        String email = admin.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            return;
        }
        String mobile = Phones.normalize(admin.mobile());
        if (mobile == null || users.existsByMobile(mobile)) {
            throw new IllegalStateException("ADMIN_MOBILE must be a free 10-digit Indian mobile number.");
        }
        if (admin.password().length() < 12) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least 12 characters.");
        }
        User user = users.save(new User(Role.ADMIN, isBlank(admin.name()) ? "Admin" : admin.name().trim(),
                email, mobile, passwords.encode(admin.password()), UserStatus.ACTIVE));
        audit.record(null, "CREATE_FIRST_ADMIN", "user", user.getId(), Map.of("email", email));
        log.info("Created first admin account {}", email);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
