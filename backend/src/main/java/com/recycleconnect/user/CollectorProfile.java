package com.recycleconnect.user;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import com.recycleconnect.zone.Zone;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "collector_profiles")
public class CollectorProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type")
    private VehicleType vehicleType;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @Column(name = "id_proof_path")
    private String idProofPath;

    @Column(name = "id_proof_type")
    private String idProofType;

    @Column(nullable = false)
    private boolean available = true;

    /** Comma-separated {@link DayOfWeek} short names, e.g. {@code MON,TUE}. */
    @Column(name = "working_days", nullable = false)
    private String workingDays;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @ManyToMany
    @JoinTable(name = "collector_zones",
            joinColumns = @JoinColumn(name = "collector_id"),
            inverseJoinColumns = @JoinColumn(name = "zone_id"))
    private Set<Zone> zones = new HashSet<>();

    protected CollectorProfile() {
    }

    public CollectorProfile(Long userId, VehicleType vehicleType, String vehicleNumber, Set<DayOfWeek> workingDays,
            Set<Zone> zones) {
        this.userId = userId;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.workingDays = workingDays.stream().sorted()
                .map(d -> d.name().substring(0, 3)).collect(Collectors.joining(","));
        this.zones = new HashSet<>(zones);
    }

    public Long getUserId() { return userId; }
    public VehicleType getVehicleType() { return vehicleType; }
    public String getVehicleNumber() { return vehicleNumber; }
    public boolean isAvailable() { return available; }
    public Set<Zone> getZones() { return zones; }
    public Instant getApprovedAt() { return approvedAt; }
    public Long getApprovedBy() { return approvedBy; }
    public String getIdProofPath() { return idProofPath; }
    public String getIdProofType() { return idProofType; }

    public void setAvailable(boolean available) { this.available = available; }

    public void approve(Long adminId, Instant at) {
        this.approvedBy = adminId;
        this.approvedAt = at;
    }

    public void setIdProof(String path, String contentType) {
        this.idProofPath = path;
        this.idProofType = contentType;
    }

    public void update(VehicleType vehicleType, String vehicleNumber, Set<DayOfWeek> days, Set<Zone> zones) {
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.workingDays = days.stream().sorted().map(d -> d.name().substring(0, 3)).collect(Collectors.joining(","));
        this.zones = new HashSet<>(zones);
    }

    public boolean worksOn(DayOfWeek day) {
        return getWorkingDays().contains(day);
    }

    public Set<DayOfWeek> getWorkingDays() {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        Arrays.stream(workingDays.split(",")).filter(s -> !s.isBlank()).forEach(s -> days.add(fromShort(s.trim())));
        return days;
    }

    private static DayOfWeek fromShort(String s) {
        for (DayOfWeek d : DayOfWeek.values()) {
            if (d.name().startsWith(s)) {
                return d;
            }
        }
        throw new IllegalStateException("Unknown day: " + s);
    }
}
