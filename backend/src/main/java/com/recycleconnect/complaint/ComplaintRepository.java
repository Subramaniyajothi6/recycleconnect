package com.recycleconnect.complaint;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<Complaint> findByIdAndCustomerId(Long id, Long customerId);

    List<Complaint> findByRequestId(Long requestId);

    long countByStatus(Complaint.Status status);
}
