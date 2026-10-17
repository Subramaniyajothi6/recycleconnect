"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import { MAP, type MapMarker } from "@/lib/map/config";

/**
 * The only place the app talks to the map library (Leaflet). Screens describe what to show: markers, an optional
 * route line, an optional draggable pin. Swapping Leaflet for another library means rewriting this file only.
 */
export type MapViewProps = {
  markers?: MapMarker[];
  route?: [number, number][];
  routeStyle?: "solid" | "dashed";
  circle?: { lat: number; lng: number; radiusM: number };
  /** A draggable pin; onMove gets the new position. */
  pin?: { lat: number; lng: number; onMove: (lat: number, lng: number) => void };
  center?: [number, number];
  zoom?: number;
  fit?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label: string;
};

const css = (name: string) =>
  typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const ICON_PATHS: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  truck: '<path d="M2.5 6h11.5v10H2.5zM14 9.5h4l3 3V16h-7"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
};
const svg = (name: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;

/** Marker text comes from our own data; escape it anyway before it goes into marker HTML. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function icon(Lf: typeof L, m: MapMarker): L.DivIcon {
  const leaf = css("--leaf") || "#1E7A55", ink = css("--ink") || "#16302A", red = css("--red") || "#C2412D";
  switch (m.kind) {
    case "home":
    case "home-done":
      return Lf.divIcon({ className: "", iconSize: [38, 38], iconAnchor: [19, 19],
        html: `<div style="width:38px;height:38px;border-radius:50%;background:${m.kind === "home" ? ink : leaf};color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)">${svg(m.kind === "home" ? "home" : "check", 17)}</div>` });
    case "truck":
      return Lf.divIcon({ className: "", iconSize: [42, 42], iconAnchor: [21, 21],
        html: `<div style="width:42px;height:42px;border-radius:50%;background:${leaf};color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 0 0 7px rgba(30,122,85,.35),0 3px 10px rgba(0,0,0,.35)">${svg("truck", 19)}</div>` });
    case "pin":
      return Lf.divIcon({ className: "", iconSize: [30, 40], iconAnchor: [15, 38],
        html: `<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39s13-13 13-23A13 13 0 1 0 2 16c0 10 13 23 13 23z" fill="${leaf}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>` });
    case "stop": {
      const s = m.status ?? "";
      const done = s === "COMPLETED" || s === "COLLECTED", failed = s === "FAILED", now = s === "COLLECTION_STARTED" || s === "ARRIVED" || s === "ON_THE_WAY";
      const bg = done ? leaf : failed ? red : now ? ink : "#fff";
      const fg = done || failed || now ? "#fff" : ink;
      return Lf.divIcon({ className: "", iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};color:${fg};border:2px solid ${ink};display:grid;place-items:center;font:700 12px var(--font-body),sans-serif;box-sizing:border-box">${esc(m.label ?? "")}</div>` });
    }
    case "area": {
      const sz = m.size ?? 30;
      return Lf.divIcon({ className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
        html: `<div class="area-dot" style="width:${sz}px;height:${sz}px"><b>${esc(m.label ?? "")}</b><span>${esc(m.title ?? "")}</span>${m.badge ? `<i>${m.badge}</i>` : ""}</div>` });
    }
    case "base":
      return Lf.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 15],
        html: `<div style="width:30px;height:30px;border-radius:50%;background:${ink};color:#fff;border:2px solid #fff;display:grid;place-items:center;font:700 11px var(--font-body),sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)">${esc(m.label ?? "")}</div>` });
    case "me":
      return Lf.divIcon({ className: "", iconSize: [18, 18], iconAnchor: [9, 9],
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#2F6FDE;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,111,222,.25)"></div>' });
  }
}

type Drawable = Pick<MapViewProps, "markers" | "route" | "routeStyle" | "circle" | "pin" | "zoom" | "fit"> & {
  onMove: { current: ((lat: number, lng: number) => void) | undefined };
};

/** Clears the layer and draws the markers, route, circle and pin. */
function drawInto(Lf: typeof L, m: L.Map, g: L.LayerGroup, p: Drawable) {
  g.clearLayers();
  const points: [number, number][] = [];
  if (p.circle) {
    Lf.circle([p.circle.lat, p.circle.lng], { radius: p.circle.radiusM, color: css("--leaf"), weight: 1.5, fillOpacity: 0.06, dashArray: "4 6" }).addTo(g);
  }
  if (p.route && p.route.length > 1) {
    Lf.polyline(p.route, { color: css("--leaf"), weight: 4, opacity: 0.9, lineCap: "round", ...(p.routeStyle !== "solid" ? { dashArray: "2 8" } : {}) }).addTo(g);
    points.push(...p.route);
  }
  for (const mk of p.markers ?? []) {
    Lf.marker([mk.lat, mk.lng], { icon: icon(Lf, mk), title: mk.title, keyboard: false }).addTo(g);
    points.push([mk.lat, mk.lng]);
  }
  if (p.pin) {
    const pin = p.pin;
    const marker = Lf.marker([pin.lat, pin.lng], { icon: icon(Lf, { id: "pin", lat: pin.lat, lng: pin.lng, kind: "pin" }), draggable: true, title: "Drag to your gate" }).addTo(g);
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      p.onMove.current?.(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
    });
    points.push([pin.lat, pin.lng]);
  }
  if (p.fit !== false && points.length > 1) m.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
  else if (points.length === 1 && !p.pin) m.setView(points[0], p.zoom ?? 16);
}

export function MapView({ markers = [], route, routeStyle = "dashed", circle, pin, center, zoom, fit = true, className, style, label }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<{ Lf: typeof L; m: L.Map; g: L.LayerGroup } | null>(null);
  const onMove = useRef(pin?.onMove);
  const latest = useRef<Drawable>({ markers, route, routeStyle, circle, pin, zoom, fit, onMove });

  useEffect(() => {
    onMove.current = pin?.onMove;
    latest.current = { markers, route, routeStyle, circle, pin, zoom, fit, onMove };
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    const start = center ?? MAP.defaultCenter;
    const startZoom = zoom ?? MAP.defaultZoom;
    import("leaflet").then((Lf) => {
      if (cancelled || !el.current || state.current) return;
      const m = Lf.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
      Lf.tileLayer(MAP.tileUrl, { maxZoom: MAP.maxZoom, subdomains: MAP.subdomains, attribution: MAP.attribution }).addTo(m);
      m.attributionControl?.setPrefix(false);
      Lf.control.zoom({ position: "bottomright" }).addTo(m);
      const g = Lf.layerGroup().addTo(m);
      state.current = { Lf, m, g };
      m.setView(start, startZoom);
      drawInto(Lf, m, g, latest.current);
      setTimeout(() => m.invalidateSize(), 200);
    });
    // Re-measure when the box changes size (rotation, window resize, layout switching to stacked).
    const ro = new ResizeObserver(() => state.current?.m.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => {
      cancelled = true;
      ro.disconnect();
      state.current?.m.remove();
      state.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when the content changes.
  const key = JSON.stringify({ markers, route, circle, pin: pin ? [pin.lat, pin.lng] : null });
  useEffect(() => {
    const st = state.current;
    if (st) drawInto(st.Lf, st.m, st.g, latest.current);
  }, [key]);

  return <div ref={el} className={className} style={style} role="img" aria-label={label} />;
}
