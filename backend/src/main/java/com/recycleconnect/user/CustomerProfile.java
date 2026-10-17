package com.recycleconnect.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_type", nullable = false)
    private CustomerType customerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_contact", nullable = false)
    private ContactPreference preferredContact;

    protected CustomerProfile() {
    }

    public CustomerProfile(Long userId, CustomerType customerType, ContactPreference preferredContact) {
        this.userId = userId;
        this.customerType = customerType;
        this.preferredContact = preferredContact;
    }

    public Long getUserId() { return userId; }
    public CustomerType getCustomerType() { return customerType; }
    public ContactPreference getPreferredContact() { return preferredContact; }

    public void update(CustomerType type, ContactPreference contact) {
        this.customerType = type;
        this.preferredContact = contact;
    }
}
