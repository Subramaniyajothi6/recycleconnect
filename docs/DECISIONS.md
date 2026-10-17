# RecycleConnect — Decisions

Every decision that shapes the project, with the reason. Newest at the bottom of each section.
If a decision changes, strike it through and add the new one below with a date.

## Product

| # | Date | Decision | Why |
|---|------|----------|-----|
| P1 | 2026-10-06 | Build exactly the brief in `docs/requirements.pdf`: a collection **coordination and tracking** platform. | Brief §29: no AI recognition, paid maps/SMS, payments, hazardous decisions or carbon maths in the MVP. |
| P2 | 2026-10-06 | Three roles: Customer, Collector, Admin. One sign-in page for all; role decides the screens. | Brief §2, §26. |
| P3 | 2026-10-06 | One request can hold several waste categories, each with estimated quantity + unit; the collector records actual quantity per category. Both are stored. | Brief §6, §12. |
| P4 | 2026-10-06 | Request status (§7) and pickup workflow (§11) are modelled as **one** request state machine plus a pickup sub-status on the assignment. | The two lists overlap; one machine avoids conflicting states. |
| P5 | 2026-10-06 | Collectors can self-register; an admin must approve them before they get pickups. | Brief lists "collector registration" in final requirements; approval keeps quality. |
| P6 | 2026-10-06 | Cancellation cutoff, working days/hours, slots, collector capacity are **admin settings**, not hard-coded. Defaults: Mon–Sat 08:00–18:00, 2-hour slots, cancel until 18:00 the day before, 8 pickups/collector/day. | Brief §15 "configured cutoff", §25 "operational periods". |
| P7 | 2026-10-06 | Notifications: in-app always, email optional. No SMS. | Brief §1: no paid SMS. |
| P8 | 2026-10-07 | Suggested extras shown in the approved presentation (Tamil/English, offline-tolerant collector updates, zone-based collector suggestion, evening-before reminder) are **nice-to-have**, built after the core workflow works. | Approved as suggestions, not as core scope. |
| P9 | 2026-10-08 | A collector can sign in while `PENDING_APPROVAL` (sees a "waiting for approval" screen) but gets no pickups until an admin approves. Collector email is optional (as in the design); customer email is required (brief §4). | Matches the design's registration note; collectors need to see the approval notification. |
| P10 | 2026-10-08 | Collector ID-proof upload is built with file storage in Phase 5 (collector approval). "Forgot password" waits until an email provider is chosen. `email_enabled` defaults to `false` until then. | Neither is in the brief's core list; both need services not yet chosen. |
| P11 | 2026-10-08 | A collected request the customer doesn't confirm completes automatically after `auto_complete_hours` (default 48); a dispute is a complaint, not a blocked request. | Brief §13 says the customer *may* confirm; requests shouldn't stay open forever. |
| P12 | 2026-10-08 | Phone numbers: masked in lists; a collector sees the customer's number (and the customer the collector's) only while their pickup is in progress; admins see full numbers and opening a customer record is audited. | Brief §26: contact details not public, location only for authorised users. |
| P13 | 2026-10-08 | A collector can "ask to reassign" an assignment before accepting; admins get a notification. A pickup trip can start only on its day; steps can't be skipped. | Matches the design (k-assigned) and keeps timestamps honest. |
| P14 | 2026-10-08 | Requests store the customer's preferred date/slot and, separately, the booked date/slot set by an admin. | Reschedule history and "you asked for" stay accurate. |

## Design

| # | Date | Decision | Why |
|---|------|----------|-----|
| D1 | 2026-10-06 | Six design directions were explored; stakeholders **approved design A "Sorted"** (light, leaf green, colour-coded material bins). | Approval received 2026-10-07. |
| D2 | 2026-10-07 | The approved design lives in `design/` (`presentation.html`, `app.html`, `shared/`). It is the **visual reference** for the real frontend. All other directions were deleted. | Single source of truth for the UI. |
| D3 | 2026-10-07 | Fonts: Bricolage Grotesque (headings) + Figtree (body). Tokens from `design/shared/sorted.css` (`--leaf #1E7A55`, `--leaf-ink #0F4D35`, category colours `--c-*`). | Part of the approved design. |
| D4 | 2026-10-07 | Mobile-first screens for customer and collector, desktop layout with sidebar for admin. | Brief §27. |
| D5 | 2026-10-07 | Map tiles: OpenStreetMap France **HOT** tiles (`https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png`). Not `tile.openstreetmap.org`. | The main OSM server blocks requests without a Referer (pages opened as files) and shows "Access blocked". CARTO now needs an API key. Revisit before production. |
| D6 | 2026-10-11 | Reports export **Excel only** (styled to the design: green header, striped rows, bold total, frozen header). The design's CSV button on Reports is dropped. **Update 2026-10-11:** the audit log downloads as the same styled Excel by default (plain-words details, filters in the subtitle), with a small "CSV" link for the raw stored values. The API still accepts `format=csv` for reports. | Brief §24 asks for one "practical structured format"; CSV cannot carry formatting and the user wanted an attractive file (user decision 2026-10-11). Rule agreed with the user: Excel for people, CSV for software; the audit log is the one record other software might import. |

## Technology

| # | Date | Decision | Why |
|---|------|----------|-----|
| T1 | 2026-10-07 | Frontend: **Next.js 16.4 (App Router) + React 19 + TypeScript**, no Tailwind; reuse the approved CSS. | Brief prefers React/Next.js; design CSS already exists. Next 16 has breaking changes: read `frontend/node_modules/next/dist/docs/` before writing Next code (see `frontend/AGENTS.md`). |
| T2 | 2026-10-07 | Backend: **Spring Boot 4.1.1, Java 17**, Maven wrapper (`mvnw`). Starters: webmvc, data-jpa, security, validation, flyway, postgresql. | Brief prefers Java/Spring Boot. Maven is not installed globally; always use `./mvnw`. Note: the parent version is `4.1.1`, not `4.1.1.RELEASE`. |
| T3 | 2026-10-07 | Database: **PostgreSQL on Neon free tier** (region AWS ap-southeast-1, Singapore). Schema managed by **Flyway** migrations. | Laptop has 7.7 GB RAM; Docker Desktop is too heavy. Cloud DB costs no local memory. |
| T4 | 2026-10-07 | Secrets (DB URL, JWT secret) live in `backend/.env` (git-ignored). Only `backend/.env.example` is committed. The user pastes the Neon string into `.env` themselves; never paste it in chat. | Keep credentials out of git and chat. |
| T5 | 2026-10-07 | Auth: Spring Security with **JWT** (stateless), BCrypt passwords, roles CUSTOMER / COLLECTOR / ADMIN. | Brief §1 "free authentication", §26 role-based access. |
| T6 | 2026-10-07 | Maps in the app: Leaflet (+ react-leaflet). Charts: Recharts. Exports: CSV + Excel (Apache POI). Photos: local disk in dev, free-tier storage later. | All free/open source (brief §1). |
| T7 | 2026-10-08 | Schema conventions: `bigint` identity ids, `timestamptz`, enum-like columns as `text` + `CHECK` (mapped with `EnumType.STRING`). Applied Flyway migrations are never edited; changes go in a new `V<n>__*.sql`. Seed data lives in migrations, except the admin account, which is created at startup from `.env`. | Readable SQL and easy enum changes; no admin password in git. |
| T8 | 2026-10-08 | Pickup reassignment keeps history: old `pickups` row gets `active=false`; a partial unique index allows one active pickup per request. | Brief needs reschedule/assignment history; DB enforces the single-collector rule. |
| T9 | 2026-10-08 | JWT via Spring Security's resource server (Nimbus), HS256 with `JWT_SECRET`, 12-hour tokens with `sub` = user id and `role` claim. Account status is re-checked from the DB on `/api/auth/me`. Login accepts mobile or email. Mobiles stored as 10 digits. | No extra JWT library; blocked users lose access on next check. |
| T10 | 2026-10-08 | Backend tests run against the Neon dev database inside rolled-back transactions (no Docker/Testcontainers). | Machine has too little RAM for Docker (E3). Revisit with a separate Neon branch for tests if data conflicts appear. |
| T11 | 2026-10-08 | Frontend auth follows the Next.js 16 guide: Server Actions call the Spring API and store its JWT in an httpOnly, SameSite=Lax cookie (`rc_session`). Browser code never sees the token. `src/proxy.ts` only does optimistic role redirects (reads `role`/`exp` without verifying); real checks are the backend plus `lib/dal.ts` (`/api/auth/me`, inside `<Suspense>` because `cacheComponents` is on). | Keeps the token away from XSS; follows the framework's documented pattern. |
| T12 | 2026-10-08 | Frontend reuses the design CSS as-is (`src/styles/sorted*.css`, copied from `design/shared/`), fonts self-hosted with `next/font`. Form state is controlled React state so values survive a failed submit. | One visual source of truth; no CSS framework (T1). |
| T13 | 2026-10-08 | Maps behind one component (`MapView.tsx`) and one config (`lib/map/config.ts`, env-driven). Screens never import Leaflet. | Change tiles with env vars; change library by rewriting one file (EXTENDING §2). |
| T14 | 2026-10-08 | Status changes only through `RequestWorkflow`, which publishes domain events; notifications listen to them. Roadmap modules (rewards, centers, impact) attach as listeners. Storage (`FileStorage`), routing (`RoutePlanner`) and email (`EmailSender`) are interfaces. | Extend without editing the core (EXTENDING §3). |
| T15 | 2026-10-08 | Charts are the design's own SVG/CSS (bars, stacked columns, heat map) instead of Recharts (updates T6). Exports: CSV (formula-safe) and Excel via Apache POI. | Lighter, matches the approved design exactly, no extra dependency. |
| T16 | 2026-10-08 | Site CSP without nonces (keeps static shells and partial prerendering); HSTS and upgrade only when `HTTPS=true`. Trade-off documented in SECURITY §3. | Next.js nonce CSP would make every page dynamic. |
| T17 | 2026-10-08 | Email through any SMTP server with Spring Mail; with no `MAIL_HOST` the app only logs. Reminders and auto-completion run as scheduled jobs in Asia/Kolkata. | Free providers work; nothing paid is required (P7). |
| T18 | 2026-10-08 | Cities table and `zones.city_id` added now; requests carry `zone_id`. | Multi-city (roadmap phase 8) needs data, not a rewrite. |

## Environment

| # | Date | Decision | Why |
|---|------|----------|-----|
| E1 | 2026-10-07 | Code lives in **`D:\Adz4\recycleconnect`**, not in `D:\Adz4\RecycleConnect – Waste coltn & recycling platform`. | The old folder name contains `&`; on Windows `cmd.exe` treats `&` as a command separator, so `npm run …` and `npx` break there. The old folder now only holds the original PDF and a pointer note. |
| E2 | 2026-10-07 | One git repository at `D:\Adz4\recycleconnect` (monorepo: `backend/`, `frontend/`, `design/`, `docs/`). | Simple to keep backend, frontend and docs in step. |
| E3 | 2026-10-07 | Don't run Docker or several dev servers at once; machine has ~1–2 GB free RAM. | A background server was killed for low memory earlier. |
