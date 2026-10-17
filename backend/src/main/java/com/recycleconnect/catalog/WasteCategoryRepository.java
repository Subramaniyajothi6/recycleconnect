package com.recycleconnect.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WasteCategoryRepository extends JpaRepository<WasteCategory, Long> {

    List<WasteCategory> findByActiveTrueOrderBySortOrderAsc();

    List<WasteCategory> findAllByOrderBySortOrderAsc();

    boolean existsByCode(String code);
}
