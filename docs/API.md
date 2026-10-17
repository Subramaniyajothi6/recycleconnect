# RecycleConnect: API reference

REST + JSON, served by the Spring Boot backend (default `http://localhost:8080`). The web app and any future
mobile app use the same endpoints.

- **Auth:** `Authorization: Bearer <token>` from `/api/auth/login` or a registration call. Tokens last 12 hours.
- **Errors:** `{"message": "...", "fields": {"field": "message"}}` with 400 (invalid), 401 (sign in), 403 (not
  allowed / account off / waiting for approval), 404 (not found or not yours), 409 (wrong status), 429 (too many
  attempts). Messages are written for end users.
- **Dates** `YYYY-MM-DD`; **slots** `HH:MM-HH:MM`; **times** ISO instants (UTC). Business dates are Asia/Kolkata.
- Lists marked *paged* take `page` (from 0) and `size` (max 100).

## Public

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | `{identifier (mobile or email), password}` → `{token, expiresAt, user}` |
| POST | `/api/auth/register/customer` | name, customerType, mobile, email, preferredContact, password, address{line1, area, city, district, state, pin, lat, lng} |
| POST | `/api/auth/register/collector` | name, mobile, email?, vehicleType, vehicleNumber, zoneIds[], workingDays[], password → status PENDING_APPROVAL |
| GET | `/api/catalog/categories` | Active categories with accepts/warning text and colour |
| GET | `/api/catalog/not-accepted` | Items we don't collect |
| GET | `/api/catalog/zones` | Service areas with centre points |
| GET | `/api/catalog/booking-options` | Open days in the booking horizon with free slots, cut-off rule, upload limit |

## Any signed-in user

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/auth/me` | Profile, addresses (customer), vehicle/zones/days (collector) |
| PUT | `/api/account/password` | `{currentPassword, newPassword}` → new token; other sessions end |
| PUT | `/api/account/preferences` | `{emailNotifications, reminderEnabled, preferredLanguage}` |
| GET | `/api/notifications?limit=` | `{unread, items[]}` |
| POST | `/api/notifications/{id}/read`, `/api/notifications/read-all` | |
| GET | `/api/files/photos/{id}` | Request photo, if you may see the request |
| GET | `/api/files/id-proof/{userId}` | Own ID proof, or any as admin (audited) |

## Customer (`/api/customer`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/requests` | Your requests (cards) |
| POST | `/requests` | `{items[{categoryId, qty}], addressId, lat?, lng?, preferredDate?, preferredSlot?, notes?, submit}` |
| GET / PUT / DELETE | `/requests/{id}` | Detail with timeline and allowed actions / edit (draft or info requested) / delete draft |
| POST | `/requests/{id}/cancel` | `{reason}`, before the cut-off |
| POST | `/requests/{id}/confirm` | `{confirmed: true, feedback?}` when collected |
| POST / DELETE | `/requests/{id}/photos`, `/requests/{id}/photos/{photoId}` | multipart `file` (JPEG/PNG/WebP), up to 4 |
| GET | `/summary` | Totals, kg by material, kg per month (brief §18) |
| PUT | `/profile` | name, email, customerType, preferredContact |
| POST / PUT / DELETE | `/addresses`, `/addresses/{id}` · POST `/addresses/{id}/default` | Saved addresses |
| POST / GET | `/complaints` | `{requestId?, type, description}` / your complaints with replies |

## Collector (`/api/collector`, approved accounts)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/today?date=&status=pending\|completed\|failed&categoryId=` | Counts, ordered stops, new assignments |
| GET | `/assigned` | Upcoming pickups by day; those needing an answer |
| GET | `/history?month=YYYY-MM&status=&categoryId=` · `/stats?month=` | Finished pickups and month figures |
| GET | `/pickups/{id}` | Request detail as the collector sees it |
| POST | `/pickups/{id}/step` | `{to: ACCEPTED \| ON_THE_WAY \| ARRIVED \| COLLECTION_STARTED}` |
| POST | `/pickups/{id}/decline` | `{reason}` before accepting |
| POST | `/pickups/{id}/record` | `{items[{categoryId, qty, unit}], notes?}` → collected |
| POST | `/pickups/{id}/complete` | |
| POST | `/pickups/{id}/fail` | `{reason: CUSTOMER_UNAVAILABLE \| INCORRECT_ADDRESS \| MATERIAL_UNAVAILABLE \| UNABLE_TO_REACH \| UNSAFE_MATERIAL \| OTHER, note?}` |
| POST | `/pickups/{id}/photos` | multipart `file` evidence |
| PUT | `/availability` | `{available}` |
| POST | `/id-proof` | multipart `file` (also while waiting for approval) |

## Admin (`/api/admin`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/requests?tab=REVIEW\|ACCEPTED\|SCHEDULED\|IN_PROGRESS\|AWAITING_CONFIRMATION\|CLOSED&q=&status=&categoryId=&zoneId=&from=&to=&collectorId=&minQty=&maxQty=&customerType=&pickupStatus=` | *paged*, with tab counts |
| GET | `/requests/{id}` · `/requests/{id}/collector-options?date=` | Detail with history · ranked collectors |
| POST | `/requests/{id}/review`, `/accept` | |
| POST | `/requests/{id}/reject`, `/request-info`, `/cancel` | `{reason}` |
| POST | `/requests/{id}/schedule` | `{date, slot, collectorId?}` (accepted or failed) |
| POST | `/requests/{id}/assign` | `{collectorId}` (assign or reassign) |
| POST | `/requests/{id}/reschedule` | `{date, slot, reason}` |
| POST | `/requests/{id}/fail` | `{reason, note?}` |
| GET | `/schedule?date=` | Board by collector and slot, waiting list with suggestions, recent reschedules |
| GET | `/customers?q=&type=&status=&area=` · `/customers/{id}` | *paged*, masked phones · full record (audited) |
| GET | `/collectors?q=&zoneId=` | Pending approvals and all collectors with load and stats |
| POST | `/collectors/{id}/approve` · `/collectors/{id}/reject {reason}` | |
| PUT | `/collectors/{id}` · `/collectors/{id}/availability` | Edit vehicle/zones/days · leave |
| POST | `/users/{id}/status` | `{status: ACTIVE \| INACTIVE \| BLOCKED, reason}` |
| GET / POST / PUT | `/categories`, `/categories/{id}` | |
| GET / POST / DELETE | `/not-accepted`, `/not-accepted/{id}` | |
| GET / PUT | `/zones`, `/zones/{id}` | |
| GET / PUT | `/settings` | Map of key → value; validated, audited |
| GET | `/complaints?status=&type=&q=` · `/complaints/{id}` | |
| POST | `/complaints/{id}/review` · `/note {note}` · `/resolve {resolution, reply, corrections?}` | |
| GET | `/dashboard?month=` · `/analytics?from=&to=&zoneId=&customerType=&categoryId=` | |
| GET | `/reports/{TYPE}?from=&to=&zoneId=&categoryId=` · `/reports/{TYPE}/export?format=csv\|xlsx` · `/reports/recent-exports` | Types: COLLECTION_VOLUME, WASTE_CATEGORIES, CUSTOMER_ACTIVITY, COLLECTOR_ACTIVITY, PICKUP_COMPLETION, FAILED_PICKUPS, LOCATION_WISE |
| GET | `/audit?q=&role=&action=&from=&to=` · `/audit/export` | *paged* |
