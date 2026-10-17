package com.recycleconnect.notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable page);

    long countByUserIdAndReadAtIsNull(Long userId);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndKindAndLinkAndCreatedAtAfter(Long userId, String kind, String link, Instant after);

    @Modifying
    @Query("update Notification n set n.readAt = ?2 where n.userId = ?1 and n.readAt is null")
    int markAllRead(Long userId, Instant at);
}
