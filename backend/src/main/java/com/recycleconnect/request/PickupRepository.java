package com.recycleconnect.request;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PickupRepository extends JpaRepository<Pickup, Long> {

    Optional<Pickup> findByRequestIdAndActiveTrue(Long requestId);

    List<Pickup> findByRequestIdOrderByAssignedAtAsc(Long requestId);

    Optional<Pickup> findByIdAndCollectorId(Long id, Long collectorId);

    boolean existsByRequestIdAndCollectorId(Long requestId, Long collectorId);

    List<Pickup> findByCollectorIdAndScheduledDateAndActiveTrueOrderBySlotAsc(Long collectorId, LocalDate date);

    List<Pickup> findByScheduledDateAndActiveTrue(LocalDate date);

    List<Pickup> findByCollectorIdAndScheduledDateBetweenOrderByScheduledDateDescSlotAsc(Long collectorId,
            LocalDate from, LocalDate to);

    List<Pickup> findByScheduledDateAndActiveTrueAndStatusIn(LocalDate date, Collection<PickupStatus> statuses);

    @Query("select count(p) from Pickup p where p.collectorId = ?1 and p.scheduledDate = ?2 and p.active = true and p.status <> com.recycleconnect.request.PickupStatus.FAILED")
    long countLoad(Long collectorId, LocalDate date);

    @Query("select p from Pickup p where p.collectorId = ?1 and p.active = true and p.scheduledDate >= ?2 and p.status not in (com.recycleconnect.request.PickupStatus.COMPLETED, com.recycleconnect.request.PickupStatus.FAILED) order by p.scheduledDate, p.slot")
    List<Pickup> findUpcoming(Long collectorId, LocalDate from);

    @Query("select p from Pickup p where p.active = true and p.status = com.recycleconnect.request.PickupStatus.COMPLETED and p.completedAt < ?1")
    List<Pickup> findCompletedBefore(Instant before);
}
