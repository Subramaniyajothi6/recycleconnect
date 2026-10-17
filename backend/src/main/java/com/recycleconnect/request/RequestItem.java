package com.recycleconnect.request;

import java.math.BigDecimal;

import com.recycleconnect.catalog.WasteCategory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One material in a request: the customer's estimate and, after pickup, what the collector recorded (brief §12). */
@Entity
@Table(name = "request_items")
public class RequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private CollectionRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private WasteCategory category;

    @Column(name = "estimated_qty")
    private BigDecimal estimatedQty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WasteCategory.Unit unit;

    @Column(name = "actual_qty")
    private BigDecimal actualQty;

    @Enumerated(EnumType.STRING)
    @Column(name = "actual_unit")
    private WasteCategory.Unit actualUnit;

    @Column(name = "added_by_collector", nullable = false)
    private boolean addedByCollector;

    protected RequestItem() {
    }

    public static RequestItem estimate(CollectionRequest request, WasteCategory category, BigDecimal qty) {
        RequestItem i = new RequestItem();
        i.request = request;
        i.category = category;
        i.estimatedQty = qty;
        i.unit = category.getUnit();
        return i;
    }

    /** A material the customer didn't list but the collector found. */
    public static RequestItem foundAtPickup(CollectionRequest request, WasteCategory category) {
        RequestItem i = new RequestItem();
        i.request = request;
        i.category = category;
        i.unit = category.getUnit();
        i.addedByCollector = true;
        return i;
    }

    public void setEstimatedQty(BigDecimal qty) { this.estimatedQty = qty; }

    public void recordActual(BigDecimal qty, WasteCategory.Unit unit) {
        this.actualQty = qty;
        this.actualUnit = unit;
    }

    public Long getId() { return id; }
    public CollectionRequest getRequest() { return request; }
    public WasteCategory getCategory() { return category; }
    public BigDecimal getEstimatedQty() { return estimatedQty; }
    public WasteCategory.Unit getUnit() { return unit; }
    public BigDecimal getActualQty() { return actualQty; }
    public WasteCategory.Unit getActualUnit() { return actualUnit; }
    public boolean isAddedByCollector() { return addedByCollector; }
}
