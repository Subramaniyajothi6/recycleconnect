package com.recycleconnect.admin;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.catalog.NotAcceptedItem;
import com.recycleconnect.catalog.NotAcceptedItemRepository;
import com.recycleconnect.catalog.WasteCategory;
import com.recycleconnect.catalog.WasteCategoryRepository;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.security.CurrentUser;
import com.recycleconnect.settings.SettingsService;
import com.recycleconnect.user.User;
import com.recycleconnect.zone.ZoneRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Waste categories, the not-accepted list (brief §5, §17), zones and settings. Every change is audited. */
@RestController
@RequestMapping("/api/admin")
public class AdminCatalogController {

    public record CategoryInput(
            @Pattern(regexp = "[a-z][a-z0-9-]{1,30}", message = "Use lower-case letters, like paper") String code,
            @NotBlank(message = "Enter a name") @Size(max = 60) String name,
            @NotNull(message = "Pick a unit") WasteCategory.Unit unit,
            @Size(max = 200) String accepts,
            @Size(max = 400) String warning,
            @NotBlank @Pattern(regexp = "#[0-9A-Fa-f]{6}", message = "Use a colour like #2F6FDE") String color,
            boolean active,
            @Min(0) @Max(999) int sortOrder) {
    }

    public record CategoryRow(Long id, String code, String name, String unit, String accepts, String warning,
            String color, boolean active, int sortOrder, long requests30Days) {
    }

    public record TextInput(@NotBlank(message = "Enter the item") @Size(max = 120) String text) {
    }

    public record ZoneInput(@NotBlank @Size(max = 60) String name, @NotBlank @Size(max = 10) String code, Double lat,
            Double lng) {
    }

    private final WasteCategoryRepository categories;
    private final NotAcceptedItemRepository notAccepted;
    private final ZoneRepository zones;
    private final SettingsService settings;
    private final AuditService audit;
    private final JdbcTemplate jdbc;

    public AdminCatalogController(WasteCategoryRepository categories, NotAcceptedItemRepository notAccepted,
            ZoneRepository zones, SettingsService settings, AuditService audit, JdbcTemplate jdbc) {
        this.categories = categories;
        this.notAccepted = notAccepted;
        this.zones = zones;
        this.settings = settings;
        this.audit = audit;
        this.jdbc = jdbc;
    }

    @GetMapping("/categories")
    public List<CategoryRow> categories() {
        Map<Long, Long> counts = new java.util.HashMap<>();
        jdbc.query("""
                select i.category_id, count(distinct i.request_id) from request_items i
                join collection_requests r on r.id = i.request_id
                where r.status <> 'DRAFT' and r.created_at >= now() - interval '30 days' group by i.category_id""",
                rs -> { counts.put(rs.getLong(1), rs.getLong(2)); });
        return categories.findAllByOrderBySortOrderAsc().stream().map(c -> new CategoryRow(c.getId(), c.getCode(),
                c.getName(), c.getUnit().name(), c.getAcceptsText(), c.getWarningText(), c.getColor(), c.isActive(),
                c.getSortOrder(), counts.getOrDefault(c.getId(), 0L))).toList();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CategoryRow create(@CurrentUser User me, @Valid @RequestBody CategoryInput in) {
        if (in.code() == null || in.code().isBlank()) throw ApiException.field("code", "Enter a short code, like paper.");
        if (categories.existsByCode(in.code())) throw ApiException.field("code", "That code is already used.");
        WasteCategory c = categories.save(new WasteCategory(in.code(), in.name().trim(), in.unit(), blank(in.accepts()),
                blank(in.warning()), in.color().toUpperCase(), in.active(), in.sortOrder()));
        audit.record(me, "CREATE_CATEGORY", "category", c.getCode(), Map.of("name", c.getName()));
        return new CategoryRow(c.getId(), c.getCode(), c.getName(), c.getUnit().name(), c.getAcceptsText(),
                c.getWarningText(), c.getColor(), c.isActive(), c.getSortOrder(), 0);
    }

    /** Changes apply to new requests only: existing requests keep their recorded unit. */
    @PutMapping("/categories/{id}")
    @Transactional
    public CategoryRow update(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody CategoryInput in) {
        WasteCategory c = categories.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that category."));
        boolean wasActive = c.isActive();
        c.update(in.name().trim(), in.unit(), blank(in.accepts()), blank(in.warning()), in.color().toUpperCase(),
                in.active(), in.sortOrder());
        audit.record(me, wasActive == in.active() ? "EDIT_CATEGORY" : in.active() ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY",
                "category", c.getCode(), Map.of("name", c.getName()));
        return new CategoryRow(c.getId(), c.getCode(), c.getName(), c.getUnit().name(), c.getAcceptsText(),
                c.getWarningText(), c.getColor(), c.isActive(), c.getSortOrder(), 0);
    }

    @GetMapping("/not-accepted")
    public List<NotAcceptedItem> notAccepted() {
        return notAccepted.findAllByOrderBySortOrderAsc();
    }

    @PostMapping("/not-accepted")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public NotAcceptedItem addNotAccepted(@CurrentUser User me, @Valid @RequestBody TextInput in) {
        int next = notAccepted.findAllByOrderBySortOrderAsc().stream().mapToInt(NotAcceptedItem::getSortOrder).max().orElse(0) + 1;
        NotAcceptedItem item = notAccepted.save(new NotAcceptedItem(in.text().trim(), next));
        audit.record(me, "ADD_NOT_ACCEPTED", "not_accepted", item.getId(), Map.of("text", item.getText()));
        return item;
    }

    @DeleteMapping("/not-accepted/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void removeNotAccepted(@CurrentUser User me, @PathVariable Long id) {
        notAccepted.findById(id).ifPresent(item -> {
            notAccepted.delete(item);
            audit.record(me, "REMOVE_NOT_ACCEPTED", "not_accepted", id, Map.of("text", item.getText()));
        });
    }

    public record ZoneRow(Long id, String name, String code, Double lat, Double lng, String city, String collectors) {
    }

    @GetMapping("/zones")
    @Transactional(readOnly = true)
    public List<ZoneRow> zones() {
        Map<Long, String> names = new java.util.HashMap<>();
        jdbc.query("""
                select cz.zone_id, string_agg(u.name, ', ' order by u.name) from collector_zones cz
                join users u on u.id = cz.collector_id where u.status = 'ACTIVE' group by cz.zone_id""",
                rs -> { names.put(rs.getLong(1), rs.getString(2)); });
        return zones.findAllByOrderByNameAsc().stream().map(z -> new ZoneRow(z.getId(), z.getName(), z.getCode(),
                z.getLat(), z.getLng(), z.getCity().getName(), names.get(z.getId()))).toList();
    }

    @PutMapping("/zones/{id}")
    @Transactional
    public void updateZone(@CurrentUser User me, @PathVariable Long id, @Valid @RequestBody ZoneInput in) {
        var z = zones.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that area."));
        z.update(in.name().trim(), in.code().trim().toUpperCase(), in.lat(), in.lng());
        audit.record(me, "EDIT_ZONE", "zone", z.getCode(), Map.of("name", z.getName()));
    }

    @GetMapping("/settings")
    public Map<String, String> settings() {
        return settings.raw();
    }

    @PutMapping("/settings")
    public Map<String, String> updateSettings(@CurrentUser User me, @RequestBody Map<String, String> changes) {
        return settings.update(me, changes);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
