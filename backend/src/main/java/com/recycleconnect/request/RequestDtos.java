package com.recycleconnect.request;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.recycleconnect.catalog.WasteCategory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Bodies and views for collection requests. Validation messages are shown to users as-is. */
public final class RequestDtos {

    private RequestDtos() {
    }

    // ---------- inputs ----------

    public record ItemInput(
            @NotNull(message = "Pick a material") Long categoryId,
            @NotNull(message = "Enter a quantity")
            @DecimalMin(value = "0.1", message = "Enter more than 0")
            @DecimalMax(value = "10000", message = "That's more than we can collect in one pickup") BigDecimal qty) {
    }

    /** Create or update a request. With {@code submit = false} it is saved as a draft. */
    public record RequestInput(
            @NotEmpty(message = "Pick at least one material") @Size(max = 9) List<@Valid ItemInput> items,
            @NotNull(message = "Pick a pickup address") Long addressId,
            @DecimalMin("-90") @DecimalMax("90") Double lat,
            @DecimalMin("-180") @DecimalMax("180") Double lng,
            LocalDate preferredDate,
            String preferredSlot,
            @Size(max = 1000, message = "Keep notes under 1000 characters") String notes,
            boolean submit) {
    }

    public record ReasonInput(@NotBlank(message = "Give a reason") @Size(max = 500) String reason) {
    }

    public record ConfirmInput(boolean confirmed, @Size(max = 1000) String feedback) {
    }

    public record ScheduleInput(
            @NotNull(message = "Pick a date") LocalDate date,
            @NotBlank(message = "Pick a time slot") String slot,
            Long collectorId) {
    }

    public record AssignInput(@NotNull(message = "Pick a collector") Long collectorId) {
    }

    public record RescheduleInput(
            @NotNull(message = "Pick a date") LocalDate date,
            @NotBlank(message = "Pick a time slot") String slot,
            @NotBlank(message = "Say why the pickup is moving") @Size(max = 300) String reason) {
    }

    public record FailInput(@NotNull(message = "Pick a reason") FailReason reason, @Size(max = 500) String note) {
    }

    public record StepInput(@NotNull PickupStatus to) {
    }

    public record RecordItemInput(
            @NotNull Long categoryId,
            @NotNull(message = "Enter the quantity") @DecimalMin(value = "0", message = "Can't be negative")
            @DecimalMax("10000") BigDecimal qty,
            @NotNull WasteCategory.Unit unit) {
    }

    public record RecordInput(
            @NotEmpty(message = "Record at least one material") List<@Valid RecordItemInput> items,
            @Size(max = 1000) String notes) {
    }

    // ---------- views ----------

    public record ItemView(Long categoryId, String code, String name, String color, String unit,
            BigDecimal estimated, BigDecimal actual, String actualUnit, boolean addedByCollector) {
    }

    public record PhotoView(Long id, String kind, Instant uploadedAt) {
    }

    /** A person shown on a request. {@code mobile} is full only for those allowed to call them, else masked. */
    public record PersonView(Long id, String name, String mobile, String detail) {
    }

    public record PickupView(Long id, PersonView collector, LocalDate date, String slot, String status,
            Instant assignedAt, Instant acceptedAt, Instant startedAt, Instant arrivedAt, Instant collectedAt,
            Instant completedAt, String failReason, String failNote, String collectorNotes) {
    }

    public record RescheduleView(LocalDate fromDate, String fromSlot, LocalDate toDate, String toSlot, String reason,
            String by, Instant at) {
    }

    public record TimelineStep(String key, String label, boolean done, boolean current, Instant at, String detail) {
    }

    public record HistoryView(String from, String to, String by, Instant at, String note) {
    }

    public record ConfirmationView(boolean confirmed, String feedback, Instant at, boolean auto) {
    }

    public record Actions(boolean canEdit, boolean canSubmit, boolean canCancel, LocalDateTime cancelUntil,
            boolean canConfirm, boolean canComplain) {
    }

    public record RequestDetail(Long id, String code, String status, PersonView customer, String customerType,
            String addressLabel, String address, String area, Double lat, Double lng, Long zoneId, String zoneName,
            LocalDate preferredDate, String preferredSlot, LocalDate scheduledDate, String scheduledSlot, String notes,
            List<ItemView> items, List<PhotoView> photos,
            PickupView pickup, List<PickupView> pastPickups, List<RescheduleView> reschedules,
            List<TimelineStep> timeline, List<HistoryView> history, ConfirmationView confirmation, String rejectReason,
            String infoRequest, String cancelReason, String cancelledBy, Instant cancelledAt, Instant createdAt,
            Instant submittedAt, Instant completedAt, Long addressId, Actions actions, boolean overdue) {
    }

    /** A request in a list. */
    public record RequestCard(Long id, String code, String status, LocalDate date, String slot, boolean scheduled,
            List<ItemView> items, String collectorName, String customerName, String customerType, String area,
            BigDecimal estimatedTotal, BigDecimal actualTotal, String note, Instant createdAt, Instant updatedAt,
            String pickupStatus, boolean overdue) {
    }
}
