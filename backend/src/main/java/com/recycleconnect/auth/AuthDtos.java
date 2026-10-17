package com.recycleconnect.auth;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.recycleconnect.user.ContactPreference;
import com.recycleconnect.user.CustomerType;
import com.recycleconnect.user.IndianMobile;
import com.recycleconnect.user.VehicleType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request and response bodies for /api/auth. Messages are shown to users as-is. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Enter your mobile number or email") String identifier,
            @NotBlank(message = "Enter your password") String password) {
    }

    public record AddressInput(
            @Size(max = 40) String label,
            @NotBlank(message = "Enter house, building and street") @Size(max = 200) String line1,
            @NotBlank(message = "Enter the area") @Size(max = 80) String area,
            @NotBlank(message = "Enter the city") @Size(max = 80) String city,
            @NotBlank(message = "Enter the district") @Size(max = 80) String district,
            @NotBlank(message = "Choose the state") @Size(max = 80) String state,
            @NotBlank(message = "Enter the PIN code")
            @Pattern(regexp = "\\d{6}", message = "PIN code has 6 digits") String pin,
            @DecimalMin("-90") @DecimalMax("90") Double lat,
            @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }

    public record RegisterCustomerRequest(
            @NotBlank(message = "Enter your name") @Size(max = 120) String name,
            @NotNull(message = "Choose what you're registering as") CustomerType customerType,
            @NotBlank(message = "Enter your mobile number") @IndianMobile String mobile,
            @NotBlank(message = "Enter your email")
            @Email(regexp = ".+@.+\\..+", message = "Enter a full email address, like name@example.com")
            @Size(max = 160) String email,
            @NotNull(message = "Choose how we should contact you") ContactPreference preferredContact,
            @NotNull(message = "Enter your pickup address") @Valid AddressInput address,
            @NotBlank(message = "Create a password")
            @Size(min = 8, max = 72, message = "Use 8 to 72 characters") String password) {
    }

    public record RegisterCollectorRequest(
            @NotBlank(message = "Enter your name") @Size(max = 120) String name,
            @NotBlank(message = "Enter your mobile number") @IndianMobile String mobile,
            // Optional: an empty field is allowed.
            @Email(regexp = "|.+@.+\\..+", message = "Enter a full email address, like name@example.com")
            @Size(max = 160) String email,
            @NotNull(message = "Choose your vehicle type") VehicleType vehicleType,
            @NotBlank(message = "Enter the registration number") @Size(max = 20) String vehicleNumber,
            @NotEmpty(message = "Pick at least one area") Set<Long> zoneIds,
            @NotEmpty(message = "Pick at least one working day") Set<DayOfWeek> workingDays,
            @NotBlank(message = "Create a password")
            @Size(min = 8, max = 72, message = "Use 8 to 72 characters") String password) {
    }

    public record AddressView(Long id, String label, String line1, String area, String city, String district,
            String state, String pin, Double lat, Double lng, boolean isDefault) {
    }

    public record CustomerView(String customerType, String preferredContact, List<AddressView> addresses) {
    }

    public record ZoneView(Long id, String name, String code) {
    }

    public record CollectorView(String vehicleType, String vehicleNumber, boolean available,
            List<ZoneView> zones, List<DayOfWeek> workingDays, Instant approvedAt, boolean idProofUploaded) {
    }

    /** The signed-in user. Exactly one of customer / collector is set for those roles; both null for admins. */
    public record MeResponse(Long id, String role, String status, String name, String email, String mobile,
            String preferredLanguage, boolean emailNotifications, boolean reminderEnabled, Instant memberSince,
            CustomerView customer, CollectorView collector) {
    }

    public record AuthResponse(String token, Instant expiresAt, MeResponse user) {
    }
}
