package com.recycleconnect.catalog;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.settings.Rules;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.zone.ZoneRepository;

/** Public reference data used by the registration and new-request forms. Nothing here is personal. */
@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    public record CategoryDto(Long id, String code, String name, String unit, String accepts, String warning,
            String color) {
    }

    public record ZoneDto(Long id, String name, String code, Double lat, Double lng) {
    }

    public record BookingDay(LocalDate date, boolean open, List<String> slots) {
    }

    /** What a customer can book: open days in the horizon, with the slots still in the future. */
    public record BookingOptions(List<BookingDay> days, List<String> slots, List<String> workingDays, String openTime,
            String closeTime, String cancelCutoff, int horizonDays, boolean photoRequired, int maxUploadMb) {
    }

    private final WasteCategoryRepository categories;
    private final NotAcceptedItemRepository notAccepted;
    private final ZoneRepository zones;
    private final SettingsService settings;
    private final BusinessClock clock;

    public CatalogController(WasteCategoryRepository categories, NotAcceptedItemRepository notAccepted,
            ZoneRepository zones, SettingsService settings, BusinessClock clock) {
        this.categories = categories;
        this.notAccepted = notAccepted;
        this.zones = zones;
        this.settings = settings;
        this.clock = clock;
    }

    @GetMapping("/categories")
    public List<CategoryDto> activeCategories() {
        return categories.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> new CategoryDto(c.getId(), c.getCode(), c.getName(), c.getUnit().name(),
                        c.getAcceptsText(), c.getWarningText(), c.getColor()))
                .toList();
    }

    @GetMapping("/not-accepted")
    public List<String> notAccepted() {
        return notAccepted.findAllByOrderBySortOrderAsc().stream().map(NotAcceptedItem::getText).toList();
    }

    @GetMapping("/zones")
    public List<ZoneDto> zones() {
        return zones.findAllByOrderByNameAsc().stream()
                .map(z -> new ZoneDto(z.getId(), z.getName(), z.getCode(), z.getLat(), z.getLng())).toList();
    }

    @GetMapping("/booking-options")
    public BookingOptions bookingOptions() {
        Rules r = settings.rules();
        LocalDate today = clock.today();
        LocalDateTime now = clock.localNow();
        List<BookingDay> days = new ArrayList<>();
        for (int i = 0; i <= r.bookingHorizonDays(); i++) {
            LocalDate d = today.plusDays(i);
            List<String> slots = r.isOpen(d)
                    ? r.slots().stream().filter(s -> d.atTime(Rules.slotStart(s)).isAfter(now)).toList()
                    : List.of();
            days.add(new BookingDay(d, r.isOpen(d) && !slots.isEmpty(), slots));
        }
        return new BookingOptions(days, r.slots(),
                r.workingDays().stream().sorted().map(Enum::name).toList(), r.openTime().toString(),
                r.closeTime().toString(), r.cancelCutoff().name(), r.bookingHorizonDays(), r.photoRequired(),
                r.maxUploadMb());
    }
}
