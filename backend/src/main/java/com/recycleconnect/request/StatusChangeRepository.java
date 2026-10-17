package com.recycleconnect.request;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StatusChangeRepository extends JpaRepository<RequestRecords.StatusChange, Long> {

    List<RequestRecords.StatusChange> findByRequestIdOrderByAtAscIdAsc(Long requestId);
}
