package com.recycleconnect.routing;

import java.util.List;

/**
 * Orders a collector's stops for the day. The default keeps slot order and, inside a slot, visits the nearest
 * stop next. A real optimiser (for example a self-hosted OSRM or VROOM server) can replace it by providing
 * another bean of this type (roadmap: pickup route optimisation; docs/EXTENDING.md).
 */
public interface RoutePlanner {

    record Stop(Long id, String slot, Double lat, Double lng) {
    }

    /** Returns the same stops in visiting order. */
    List<Stop> order(Double startLat, Double startLng, List<Stop> stops);
}
