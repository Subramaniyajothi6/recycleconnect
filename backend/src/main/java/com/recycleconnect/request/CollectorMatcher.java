package com.recycleconnect.request;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.recycleconnect.common.ApiException;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.CollectorProfile;
import com.recycleconnect.user.CollectorProfileRepository;
import com.recycleconnect.user.Role;
import com.recycleconnect.user.User;
import com.recycleconnect.user.UserRepository;
import com.recycleconnect.user.UserStatus;

/**
 * Who can take a pickup on a date (brief §25: only approved, available collectors under capacity), ranked with
 * collectors who cover the request's zone first, then the lightest day.
 */
@Component
public class CollectorMatcher {

    public record Option(Long id, String name, String zones, String vehicle, boolean inZone, long load, int capacity,
            boolean eligible, String reason) {
    }

    private final UserRepository users;
    private final CollectorProfileRepository profiles;
    private final PickupRepository pickups;
    private final SettingsService settings;

    public CollectorMatcher(UserRepository users, CollectorProfileRepository profiles, PickupRepository pickups,
            SettingsService settings) {
        this.users = users;
        this.profiles = profiles;
        this.pickups = pickups;
        this.settings = settings;
    }

    public List<Option> options(LocalDate date, Long zoneId) {
        int capacity = settings.rules().collectorDailyCapacity();
        List<User> collectors = users.findByRoleAndStatus(Role.COLLECTOR, UserStatus.ACTIVE);
        Map<Long, CollectorProfile> byId = profiles.findAllById(collectors.stream().map(User::getId).toList()).stream()
                .collect(Collectors.toMap(CollectorProfile::getUserId, Function.identity()));
        List<Option> out = new ArrayList<>();
        for (User u : collectors) {
            CollectorProfile p = byId.get(u.getId());
            if (p == null || p.getApprovedAt() == null) continue;
            long load = pickups.countLoad(u.getId(), date);
            boolean inZone = zoneId != null && p.getZones().stream().anyMatch(z -> z.getId().equals(zoneId));
            String reason = null;
            if (!p.isAvailable()) reason = "On leave";
            else if (!p.worksOn(date.getDayOfWeek())) reason = "Doesn't work on " + date.getDayOfWeek().name().charAt(0)
                    + date.getDayOfWeek().name().substring(1, 3).toLowerCase();
            else if (load >= capacity) reason = "Full: " + load + " of " + capacity;
            out.add(new Option(u.getId(), u.getName(),
                    p.getZones().stream().map(z -> z.getName()).sorted().collect(Collectors.joining(", ")),
                    p.getVehicleNumber(), inZone, load, capacity, reason == null, reason));
        }
        out.sort(Comparator.comparing(Option::eligible).reversed()
                .thenComparing(Comparator.comparing(Option::inZone).reversed())
                .thenComparingLong(Option::load)
                .thenComparing(Option::name));
        return out;
    }

    /** Throws a field error unless this collector can take one more pickup on the date. */
    public void requireEligible(Long collectorId, LocalDate date, Long zoneId) {
        Option o = options(date, zoneId).stream().filter(x -> x.id().equals(collectorId)).findFirst()
                .orElseThrow(() -> ApiException.field("collectorId", "Pick an approved, active collector."));
        if (!o.eligible()) throw ApiException.field("collectorId", o.name() + " can't take this pickup: " + o.reason() + ".");
    }

    /** The best option, or null when nobody can take it. */
    public Option best(LocalDate date, Long zoneId) {
        return options(date, zoneId).stream().filter(Option::eligible).findFirst().orElse(null);
    }
}
