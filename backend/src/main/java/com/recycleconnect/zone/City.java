package com.recycleconnect.zone;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A city the service runs in. One today (Chennai); more cities only need new rows and zones. */
@Entity
@Table(name = "cities")
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String timezone;

    private Double lat;
    private Double lng;

    @Column(nullable = false)
    private boolean active;

    protected City() {
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getState() { return state; }
    public String getTimezone() { return timezone; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public boolean isActive() { return active; }
}
