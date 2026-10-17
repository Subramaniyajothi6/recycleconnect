package com.recycleconnect.request;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<RequestRecords.Photo, Long> {

    List<RequestRecords.Photo> findByRequestIdOrderByUploadedAtAsc(Long requestId);

    long countByRequestIdAndKind(Long requestId, RequestRecords.Photo.Kind kind);
}
