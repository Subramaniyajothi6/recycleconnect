# RecycleConnect: Extending and scaling

How the code is laid out so the roadmap in brief §30 (and a change of map provider) can be added without
rewriting what works. Read with `DECISIONS.md`.

## 1. Ground rules that keep it extendable

- **One state machine.** Request and pickup statuses change only in `request/RequestWorkflow.java`, checked
  against `RequestStatus` / `PickupStatus`. New features react to statuses; they never set them directly.
- **Domain events.** Every change publishes an event (`events/RequestEvent`, `ComplaintEvent`, `AccountEvent`).
  Notifications are just one listener (`notification/NotificationService`). New modules add their own
  `@EventListener` instead of editing request code.
- **Interfaces at the edges.** Maps (`frontend/src/components/map/MapView.tsx`), file storage
  (`files/FileStorage`), route ordering (`routing/RoutePlanner`), email (`notification/EmailSender`).
- **Schema changes are new Flyway files** (`V4__…sql`), never edits to applied ones.
- **Settings, not constants.** Operating rules live in the `settings` table and `settings/Rules`.

## 2. Changing the map

| Change | What to do |
|--------|------------|
| Different tile provider (another OSM style, self-hosted tiles) | Set in `frontend/.env.local`: `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_SUBDOMAINS`, `NEXT_PUBLIC_MAP_ATTRIBUTION`, `NEXT_PUBLIC_MAP_MAX_ZOOM`. Rebuild. The CSP picks up the new host automatically (`next.config.ts` → `tileOrigin`). |
| Different map library (e.g. MapLibre GL with vector tiles) | Rewrite only `components/map/MapView.tsx` to the same props (`markers`, `route`, `circle`, `pin`, `center`, `zoom`, `fit`). Screens use `<AppMap>` and never import the library. |
| Directions provider | `MAP.directionsUrl` in `lib/map/config.ts`. |
| Address search (geocoding) | Add a backend endpoint that calls a self-hosted Nominatim (free) and returns lat/lng; the request form already sends `lat`/`lng`. Respect Nominatim's usage policy if using the public server. |

## 3. Roadmap (brief §30): where each phase plugs in

| Phase | Plan | Extension points already in place |
|-------|------|-----------------------------------|
| **2. Collection center management** | New `center` module: `collection_centers` table (city, address, lat/lng, opening hours, capacity), a `center_id` on `pickups` for where the load was dropped, admin CRUD screen. | `RequestEvent.PICKUP_COMPLETED` (listener records drop-off), `cities`/`zones` tables, audit, admin layout and `AdminNav` list. |
| **3. Recycling partner management** | `partners` (recyclers who buy material) + `dispatches` (center → partner, by category and weight). | Weights by category are stored per request (`request_items.actual_qty`); reports module (`ReportService.Type`) takes a new report type. |
| **4. Customer reward system** | `reward_ledger` (user, points, reason, request) and a points rule per category in settings. | Listen to `RequestEvent.COMPLETED`; actual kg per category is on the request. Customer profile and dashboard already have a "your recycling" panel to show points. |
| **5. Pickup route optimisation** | Provide another `RoutePlanner` bean that calls a self-hosted **OSRM** or **VROOM** (both free). | `CollectorService.today` already orders stops through `RoutePlanner`; stops carry lat/lng. Mark the new bean `@Primary`. |
| **6. Recycling impact dashboard** | Read-only analytics over actual kg by category and month, with conversion factors kept in a settings table (avoid "complex carbon calculations" until requested). | `AnalyticsService` pattern (plain SQL aggregates); dashboard cards in `app/admin/page.tsx`; same data per customer in `/api/customer/summary`. |
| **7. Mobile application** | React Native / Flutter app calling the same REST API with the bearer token (store it in the OS secure storage). | The API is stateless JWT, versioned by path; see `API.md`. Push notifications: add a `device_tokens` table and a listener next to `EmailSender` (FCM is free). |
| **8. Multi-city operations** | Add rows to `cities` and its zones; scope admin screens and settings by city. | `cities` table and `zones.city_id` exist; requests carry `zone_id`; `BusinessClock` reads the time zone from settings (move it per city when needed). |

## 4. Scaling up

| When | Change |
|------|--------|
| More than one backend instance | Move `RateLimiter` counters and the settings cache to a shared store (e.g. a free Redis-compatible service or a Postgres table); add a shared lock for `PickupJobs` (e.g. ShedLock with the Postgres provider) so jobs run once. |
| Many photos | Implement `FileStorage` for S3-compatible storage (free tiers exist, or self-hosted MinIO) and switch the bean. Paths in the database are already opaque keys. |
| Heavy reporting | Point `AnalyticsService`/`ReportService` at a read replica, or add nightly summary tables; the API stays the same. |
| Large lists | Admin lists already page on the server (`page`, `size`); add indexes for any new filter (see `V3`). |
| Busy notifications | `EmailSender.send` is already `@Async`; move to a queue table + worker if volumes grow. |
| Traffic spikes | Both apps are stateless (sessions live in the token) and can run behind a load balancer. |

## 5. Adding a feature: checklist

1. Migration `V<n>__what.sql` (new tables/columns, indexes, seed data).
2. Entity + repository; service with ownership checks; controller under `/api/<role>/…`.
3. Status changes only via `RequestWorkflow`; publish or listen to events.
4. Audit important changes with `AuditService.record`.
5. Tests in `backend/src/test` (extend `IntegrationTest`), then a step in `e2e/full-flow.mjs` if it is user-facing.
6. Frontend: types in `lib/types.ts`, a Server Action in `src/actions`, a page inside `<Suspense>` that calls
   `requireRole(...)`. Read the Next.js docs in `node_modules/next/dist/docs` first (Next 16 changes).
7. Log the step in `PROGRESS.md` and any choice in `DECISIONS.md`.
