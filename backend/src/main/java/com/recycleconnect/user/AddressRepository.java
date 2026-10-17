package com.recycleconnect.user;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserIdOrderByIsDefaultDescIdAsc(Long userId);
}
