package com.recycleconnect.request;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfirmationRepository extends JpaRepository<RequestRecords.Confirmation, Long> {
}
