package com.recycleconnect.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "addresses")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private String label;

    @Column(nullable = false)
    private String line1;

    private String area;

    @Column(nullable = false)
    private String city;

    private String district;
    private String state;
    private String pin;
    private Double lat;
    private Double lng;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    protected Address() {
    }

    public Address(Long userId, String label, String line1, String area, String city, String district, String state,
            String pin, Double lat, Double lng, boolean isDefault) {
        this.userId = userId;
        this.label = label;
        this.line1 = line1;
        this.area = area;
        this.city = city;
        this.district = district;
        this.state = state;
        this.pin = pin;
        this.lat = lat;
        this.lng = lng;
        this.isDefault = isDefault;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getLabel() { return label; }
    public String getLine1() { return line1; }
    public String getArea() { return area; }
    public String getCity() { return city; }
    public String getDistrict() { return district; }
    public String getState() { return state; }
    public String getPin() { return pin; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public boolean isDefault() { return isDefault; }

    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }

    public void update(String label, String line1, String area, String city, String district, String state, String pin,
            Double lat, Double lng) {
        this.label = label;
        this.line1 = line1;
        this.area = area;
        this.city = city;
        this.district = district;
        this.state = state;
        this.pin = pin;
        this.lat = lat;
        this.lng = lng;
    }
}
