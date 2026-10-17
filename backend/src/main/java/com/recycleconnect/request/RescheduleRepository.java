package com.recycleconnect.request;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RescheduleRepository extends JpaRepository<RequestRecords.Reschedule, Long> {

    List<RequestRecords.Reschedule> findByRequestIdOrderByChangedAtAsc(Long requestId);

    List<RequestRecords.Reschedule> findAllByOrderByChangedAtDesc(Pageable page);
}
