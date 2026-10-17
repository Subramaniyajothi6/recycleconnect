package com.recycleconnect.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "waste_categories")
public class WasteCategory {

    public enum Unit { KG, PCS }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Unit unit;

    @Column(name = "accepts_text")
    private String acceptsText;

    @Column(name = "warning_text")
    private String warningText;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected WasteCategory() {
    }

    public WasteCategory(String code, String name, Unit unit, String acceptsText, String warningText, String color,
            boolean active, int sortOrder) {
        this.code = code;
        update(name, unit, acceptsText, warningText, color, active, sortOrder);
    }

    public void update(String name, Unit unit, String acceptsText, String warningText, String color, boolean active,
            int sortOrder) {
        this.name = name;
        this.unit = unit;
        this.acceptsText = acceptsText;
        this.warningText = warningText;
        this.color = color;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public Unit getUnit() { return unit; }
    public String getAcceptsText() { return acceptsText; }
    public String getWarningText() { return warningText; }
    public String getColor() { return color; }
    public boolean isActive() { return active; }
    public int getSortOrder() { return sortOrder; }
}
