package com.recycleconnect.zone;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A service area (e.g. Anna Nagar, Z8) inside a city. Used to match collectors to pickups. */
@Entity
@Table(name = "zones")
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "city_id")
    private City city;

    private Double lat;
    private Double lng;

    protected Zone() {
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public City getCity() { return city; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }

    public void update(String name, String code, Double lat, Double lng) {
        this.name = name;
        this.code = code;
        this.lat = lat;
        this.lng = lng;
    }
}
