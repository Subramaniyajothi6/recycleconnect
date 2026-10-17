"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./MapView";

/** Loads the map only in the browser (the map library needs `window`). Use this, not MapView, in screens. */
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="map-off">Loading map…</div>,
});

export function AppMap(props: MapViewProps) {
  return <MapView {...props} />;
}
