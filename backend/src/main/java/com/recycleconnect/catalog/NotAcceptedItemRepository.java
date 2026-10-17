package com.recycleconnect.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotAcceptedItemRepository extends JpaRepository<NotAcceptedItem, Long> {

    List<NotAcceptedItem> findAllByOrderBySortOrderAsc();
}
