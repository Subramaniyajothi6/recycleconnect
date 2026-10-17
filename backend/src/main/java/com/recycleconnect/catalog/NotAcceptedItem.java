package com.recycleconnect.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A material the service does not collect; shown to customers before they submit (brief §17). */
@Entity
@Table(name = "not_accepted_items")
public class NotAcceptedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String text;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected NotAcceptedItem() {
    }

    public NotAcceptedItem(String text, int sortOrder) {
        this.text = text;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public String getText() { return text; }
    public int getSortOrder() { return sortOrder; }
}
