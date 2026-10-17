/**
 * Map provider settings. Change tiles by setting these in frontend/.env.local; no code changes needed.
 * Default: OpenStreetMap France HOT tiles (DECISIONS D5). Any XYZ raster provider works, for example a
 * self-hosted tile server. To change the map library itself, rewrite only components/map/MapView.tsx.
 * The CSP in next.config.ts allows images from this tile host.
 */
export const MAP = {
  tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  subdomains: process.env.NEXT_PUBLIC_MAP_SUBDOMAINS || "abc",
  attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "© OpenStreetMap contributors, HOT",
  maxZoom: Number(process.env.NEXT_PUBLIC_MAP_MAX_ZOOM || 19),
  /** Where maps open when there is nothing to show yet (Chennai). */
  defaultCenter: [13.0827, 80.2707] as [number, number],
  defaultZoom: 12,
  /** Directions open in the free OpenStreetMap website. */
  directionsUrl: (lat: number, lng: number) => `https://www.openstreetmap.org/directions?to=${lat},${lng}`,
};

/** The tile host pattern, for the Content-Security-Policy img-src list. */
export function tileOrigin(url = MAP.tileUrl) {
  const m = url.match(/^(https?:\/\/)([^/]+)/);
  if (!m) return "";
  return m[1] + m[2].replace("{s}", "*");
}

export type MarkerKind = "home" | "home-done" | "truck" | "pin" | "stop" | "area" | "base" | "me";

export type MapMarker = {
  id: string | number;
  lat: number;
  lng: number;
  kind: MarkerKind;
  /** Number or initials shown inside the marker. */
  label?: string;
  /** Stop markers: colour by pickup status. */
  status?: string;
  /** Area markers: diameter in px and a badge count. */
  size?: number;
  badge?: number;
  title?: string;
};
