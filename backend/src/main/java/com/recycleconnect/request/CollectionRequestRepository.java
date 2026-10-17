package com.recycleconnect.request;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CollectionRequestRepository extends JpaRepository<CollectionRequest, Long> {

    Optional<CollectionRequest> findByIdAndCustomerId(Long id, Long customerId);

    List<CollectionRequest> findByCustomerIdOrderByUpdatedAtDesc(Long customerId);

    List<CollectionRequest> findByStatusAndUpdatedAtBefore(RequestStatus status, Instant before);

    @Query("select r from CollectionRequest r where r.status = com.recycleconnect.request.RequestStatus.ACCEPTED order by r.preferredDate, r.submittedAt")
    List<CollectionRequest> findWaitingForSlot();
}
