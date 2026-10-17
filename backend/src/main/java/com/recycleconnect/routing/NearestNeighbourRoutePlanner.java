package com.recycleconnect.routing;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

/** Slot order first; within a slot, greedy nearest-next by straight-line distance. Free and good enough for a day's stops. */
@Component
public class NearestNeighbourRoutePlanner implements RoutePlanner {

    @Override
    public List<Stop> order(Double startLat, Double startLng, List<Stop> stops) {
        Map<String, List<Stop>> bySlot = new LinkedHashMap<>();
        stops.stream().sorted(Comparator.comparing(Stop::slot)).forEach(s -> bySlot.computeIfAbsent(s.slot(), k -> new ArrayList<>()).add(s));
        List<Stop> out = new ArrayList<>();
        Double lat = startLat, lng = startLng;
        for (List<Stop> group : bySlot.values()) {
            List<Stop> left = new ArrayList<>(group);
            while (!left.isEmpty()) {
                Stop next = left.get(0);
                if (lat != null && lng != null) {
                    double best = Double.MAX_VALUE;
                    for (Stop s : left) {
                        double d = distance(lat, lng, s.lat(), s.lng());
                        if (d < best) {
                            best = d;
                            next = s;
                        }
                    }
                }
                out.add(next);
                left.remove(next);
                if (next.lat() != null) {
                    lat = next.lat();
                    lng = next.lng();
                }
            }
        }
        return out;
    }

    static double distance(double lat1, double lng1, Double lat2, Double lng2) {
        if (lat2 == null || lng2 == null) return Double.MAX_VALUE / 2;
        double dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
