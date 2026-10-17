# RecycleConnect — Progress

**Read this first in a new session.** It says where we are and what to do next.
Decisions and their reasons are in [`DECISIONS.md`](DECISIONS.md). The brief is [`requirements.pdf`](requirements.pdf).
The approved UI is in [`../design/`](../design/) — open `design/presentation.html` and `design/app.html` in a browser.

## Where we are now

- **Current phase:** 7 — Polish and release. All brief requirements are built and tested (see step log 7.x).
- **Session hand-over:** read [`HANDOVER.md`](HANDOVER.md) for background; this file is the current state.
- **Next action:** decide deployment target and email provider (see 7.9), then follow the go-live checklist in [`SECURITY.md`](SECURITY.md) §4. Nothing is committed to git yet.
- **Admin sign-in (dev):** email `admin@recycleconnect.local`, password in `backend/.env` (`ADMIN_PASSWORD`).
- **Blocked on:** nothing.

## Plan

| Phase | Goal | Status |
|-------|------|--------|
| 0. Setup | Repo, scaffolds, docs, database connection | Done |
| 1. Foundation | DB schema v1, sign-in/registration API (JWT, roles), seed data, frontend shell + design tokens, sign-in and registration screens wired to the API | Done |
| 2. Customer requests | Create (draft/submit) with validation, my requests, request detail + timeline, cancel before cutoff, in-app notifications | Done |
| 3. Admin review and scheduling | Review queue, accept / reject with reason / ask for info / cancel, schedule + assign collector, reschedule history, audit log | Done |
| 4. Collector workflow | Assigned pickups, accept, status steps, record actual quantity + photo, failed pickup with reason; customer confirms or complains | Done |
| 5. Admin management | Customers, collector approval, waste categories + not-accepted list, settings, complaints | Done |
| 6. Dashboards and reports | Customer/collector/admin dashboards, analytics, reports with CSV/Excel export | Done |
| 7. Polish and release | Maps everywhere, tests, accessibility pass, deployment | In progress (deployment open) |

## How to run (once set up)

```bash
# backend  (needs backend/.env)
cd backend && ./mvnw spring-boot:run          # http://localhost:8080
cd backend && ./mvnw test                     # runs against Neon; test writes are rolled back

# frontend (needs the backend running)
cd frontend && npm run dev                    # http://localhost:3000
# low memory: npm run build && npx next start  (lighter than dev); backend with -Dspring-boot.run.jvmArguments="-Xmx384m"
```

Only run one dev server at a time if memory is low (see DECISIONS E3).

## Step log

Each step: what was done, and the result. Newest at the bottom.

### Phase 0 — Setup

| Step | Date | What | Result |
|------|------|------|--------|
| 0.1 | 2026-10-06 | Read brief, designed 6 directions in HTML | Done |
| 0.2 | 2026-10-07 | Stakeholders approved design A; old designs deleted; approved design kept in `design/` | Done |
| 0.3 | 2026-10-07 | Checked machine: Java 17, Node 22, Git, Docker (not running), no Maven, no Postgres, 7.7 GB RAM | Done |
| 0.4 | 2026-10-07 | Chose Neon cloud Postgres (user's choice) | Done |
| 0.5 | 2026-10-07 | Generated backend (Spring Boot 4.1.1, Java 17) and frontend (Next.js 16.4, TS, App Router) | Done |
| 0.6 | 2026-10-07 | Found `&` in old folder name breaks npm on Windows. Created `D:\Adz4\recycleconnect` and copied backend, frontend (fresh `npm install`), design, PDF there | Done |
| 0.7 | 2026-10-07 | Verified: `npm run build` passes; `./mvnw -DskipTests compile` passes (fixed parent version `4.1.1.RELEASE` → `4.1.1`) | Done |
| 0.8 | 2026-10-07 | Wrote `docs/DECISIONS.md`, `docs/PROGRESS.md`, root `CLAUDE.md`, `.gitignore`, `backend/.env.example`; initialised git (files staged, not committed yet) | Done |
| 0.8b | 2026-10-07 | Removed old copies from the `&` folder; left a `CLAUDE.md` pointer there; original PDF kept | Done |
| 0.8c | 2026-10-07 | User logged in to Neon CLI (`npx neonctl@latest auth`, profile DEFAULT) | Done |
| 0.8d | 2026-10-07 | Wrote `docs/HANDOVER.md` (session 1 → 2 hand-over) | Done |
| 0.9a | 2026-10-07 | Listed Neon projects (org `org-delicate-violet-81309759`; neonctl needs `--org-id`). Only `classroom-management-application` existed | Done |
| 0.9b | 2026-10-07 | Created Neon project `recycleconnect` (id `long-flower-85975474`, aws-ap-southeast-1, Postgres 18), database `neondb` | Done |
| 0.9c | 2026-10-07 | Wrote `backend/.env` from the pooled connection string via a script (no secrets printed); random `JWT_SECRET`; confirmed git-ignored | Done |
| 0.9d | 2026-10-08 | Configured `application.properties`; added `db/migration/V1__init.sql` (full schema from HANDOVER §8, plus `info_request` on requests and `active`/`assigned_at` on pickups with one-active-pickup-per-request index). `./mvnw spring-boot:run`: Flyway applied v1, app started on :8080, then stopped | Done |
| 0.9e | 2026-10-08 | Checked root `RecycleConnect_Waste_Collection_Recycling_Project.pdf`: byte-identical to `docs/requirements.pdf`. Gaps found vs schema: collector may record a category the customer didn't list (fixed in V2); collector nav has "Completed Pickups" (check in Phase 4) | Done |

### Phase 1 — Foundation

| Step | Date | What | Result |
|------|------|------|--------|
| 1.1 | 2026-10-08 | `V2__seed_reference_data.sql`: 9 categories (text + colours from design), 5 not-accepted items, 12 settings, 7 zones (Kilpauk = Z7). Schema: collector email optional, collector working days, `request_items.estimated_qty` nullable only for `added_by_collector` rows | Applied on Neon |
| 1.2 | 2026-10-08 | Backend foundation: entities (users, profiles, addresses, zones, categories, not-accepted, audit log), JSON error format `{message, fields}`, Spring Security JWT (HS256, 12 h, `role` claim), CORS for the frontend | Done |
| 1.3 | 2026-10-08 | Auth API: `POST /api/auth/register/customer`, `POST /api/auth/register/collector` (status PENDING_APPROVAL), `POST /api/auth/login` (mobile or email), `GET /api/auth/me`; public `GET /api/catalog/{categories,not-accepted,zones}`; registrations written to audit log | Done |
| 1.4 | 2026-10-08 | First admin created at startup from `ADMIN_*` in `backend/.env` (password generated by script, never printed; user reads it from `.env`). Email `admin@recycleconnect.local` | Done; admin sign-in verified on a running server |
| 1.5 | 2026-10-08 | Tests: `AuthFlowTests` (7, MockMvc against Neon, rolled back), `PhonesTests` (2), context test. `./mvnw test` | 10/10 pass |
| 1.6 | 2026-10-08 | Frontend shell: design CSS copied to `frontend/src/styles/` (fonts via `next/font`), phone column + admin sidebar layouts, icon set, tab bars. Auth via Server Actions; backend JWT kept in httpOnly cookie `rc_session`; `src/proxy.ts` does role redirects; `lib/dal.ts` checks the user with `/api/auth/me` inside `<Suspense>` (Cache Components) | Done |
| 1.7 | 2026-10-08 | Screens wired to the API: sign in (mobile or email, `?next=`), customer registration, collector registration (areas from API), customer home + profile, collector waiting-for-approval + profile, admin shell. Later screens are labelled placeholders | Done |
| 1.8 | 2026-10-08 | Fix: invalid mobile now reported with the other field errors (`@IndianMobile` validator) instead of after them | Done; backend tests 10/10 |
| 1.9 | 2026-10-08 | Checks: `typecheck`, `lint`, `npm run build` clean. Headless-Chrome end-to-end script (scratchpad, puppeteer-core): 24/24 pass: field errors, register both roles, sign out/in, wrong password, `?next=`, cross-role redirects, admin sign-in. Created test accounts "Test Customer" (7790044005, 7766916805) and "Test Collector" (7690044005, 7666916805) in the dev DB | Done |
| 1.10 | — | Phase 1 leftovers: map pin on registration (moved to Phase 2 with the request map), collector ID-proof upload (Phase 5) | Moved |

### Phases 2–6 — Backend (built together, 2026-10-08)

| Step | Date | What | Result |
|------|------|------|--------|
| 2.1 | 2026-10-08 | `V3__workflow_and_scale.sql`: cities (multi-city ready), zone centres, request/complaint code sequences, booked date+slot on requests, optimistic-lock versions, token version + notification prefs on users, upload metadata, report indexes, new settings | Applied on Neon |
| 2.2 | 2026-10-08 | Security core: `ActiveAccountFilter` (re-checks account, token version, pending collectors on every request), `@CurrentUser`, `RateLimiter` (5 failed sign-ins/account/15 min, 30 attempts/IP, 10 sign-ups/IP/hour), trusted-proxy client IP, strict API headers (CSP none, frame deny, no-referrer), BCrypt 12, issuer check | Done |
| 2.3 | 2026-10-08 | Settings service (typed, validated, cached, audited) + business clock in Asia/Kolkata; booking checks (working days, closed dates, horizon, slots, no past slots) | Done |
| 2.4 | 2026-10-08 | Request domain: state machines (`RequestStatus`, `PickupStatus`), `RequestWorkflow` (only place statuses change; writes history + audit; publishes `RequestEvent`), entities, views with privacy (phones masked unless admin or pickup underway), timeline per brief §28 | Done |
| 2.5 | 2026-10-08 | Customer API: drafts, submit, edit on info request, cancel before cut-off, confirm, photos (content-checked), summary/history | Done |
| 3.1 | 2026-10-08 | Admin API: review/accept/reject/ask info/cancel, schedule (+assign), assign/reassign, reschedule (history), fail, re-book after failure, filtered search with tabs (brief §21), scheduling board with suggestions, collector matching (zone, load, capacity, leave, working days) | Done |
| 4.1 | 2026-10-08 | Collector API: today (route order via `RoutePlanner`), assigned, steps, decline, record actual quantities (+ materials not listed), complete, fail with reason, evidence photos, history, stats, availability, ID proof upload | Done |
| 4.2 | 2026-10-08 | Notifications for all brief §22 events (event listeners), optional SMTP email (Spring Mail; logs only without MAIL_HOST), jobs: reminders (evening before / 2 h before), auto-complete unconfirmed after N hours, remove old drafts | Done |
| 5.1 | 2026-10-08 | Complaints (raise, review, note, resolve with reply, quantity correction audited), admin users (customers with masked phones, record view audited, collectors with load/stats, approve/reject, block/unblock signs out), categories + not-accepted CRUD, zones, settings API, public booking options | Done |
| 6.1 | 2026-10-08 | Dashboard KPIs (brief §20), analytics (volume by month and material, fail reasons, busiest slots, estimate accuracy, customer types, repeat rate, collector performance), 7 reports with CSV (formula-safe) and Excel export, audit log search + CSV export, authorised file serving | Done |
| 6.2 | 2026-10-08 | Tests: `WorkflowTests` (9), `SecurityTests` (8), `RulesTests` (6), `UploadValidatorTests`, `AuthFlowTests` (7), `PhonesTests`; fixed clock (Mon 3 Mar 2031 07:00 IST); writes rolled back. Fixed during testing: SQL text-block spacing, insert-before-update on re-booking a failed pickup | 34/34 pass |

### Phases 2–7 — Frontend, docs and release checks (2026-10-08)

| Step | Date | What | Result |
|------|------|------|--------|
| 7.1 | 2026-10-08 | Frontend core: API client (forwards client IP for rate limits), `api()`/`requireRole()` data layer, Server Actions for every API call (`call()` refreshes the page), file and export pass-through routes (token stays server-side), formatters and status labels from the design | Done |
| 7.2 | 2026-10-08 | Map layer: `components/map/MapView.tsx` (only file that imports Leaflet), `AppMap` wrapper, `lib/map/config.ts` (tiles from env; CSP follows) | Done |
| 7.3 | 2026-10-08 | Customer screens: dashboard, new collection (bins, warnings, not-accepted list, map pin, open days and slots, photos, drafts), my requests (tabs, search), tracking (timeline, items, photos, reschedules, confirm, report, cancel with reason), history, notifications, complaints, profile (details, addresses with map, preferences, password). Map pin added to registration; ID proof upload added to collector registration | Done |
| 7.4 | 2026-10-08 | Collector screens: today (counts, filters, route map, stops), pickup (stepper, map + own position, directions, call, record weights + extra material, photos, fail with reason), assigned (accept / ask to reassign), history (month, filters, stats), profile (availability, stats, preferences, password), notifications, waiting screen with ID upload | Done |
| 7.5 | 2026-10-08 | Admin screens: dashboard, requests (tabs, all brief §21 filters, review panel with every action and confirmation dialogs), customers (masked, audited record view, block), collectors (approve with ID proof, leave, block), categories (+ not-accepted), scheduling board (suggestions, one-click booking), complaints (evidence, correction, reply), analytics, reports (7 + CSV/Excel), audit log (+ export), settings (+ zones) | Done |
| 7.6 | 2026-10-08 | Security headers on the site (CSP without nonces, frame deny, nosniff, referrer and permissions policy; HSTS when `HTTPS=true`), 6 MB action body limit, no `X-Powered-By` | Done |
| 7.7 | 2026-10-08 | Checks: typecheck, lint, production build (34 routes) clean; `npm audit --omit=dev` 0 vulnerabilities; backend 34/34; `e2e/full-flow.mjs` 12/12 (three roles, whole workflow, exports, cross-role access); admin screens reviewed by screenshot; customer screens reviewed in Chrome | Done |
| 7.8 | 2026-10-08 | Docs: `README.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/EXTENDING.md`, `docs/API.md`, `.env.example` files | Done |
| 7.10 | 2026-10-08 | Rewrote `HANDOVER.md` for session 3; user is testing the full app manually | Done |
| 7.11 | 2026-10-08 | Wrote `docs/MANUAL-TEST.md`: 70-step manual walkthrough across three windows (customer, collector, admin) | Done |
| 7.12 | 2026-10-08 | Manual test (user, session 3): steps 1–14 pass. Today showed "Closed" after 16:00 (expected: no slots left; label could say so). Unit is fixed per material (by design) | Noted |
| 7.13 | 2026-10-08 | Fix (manual test step 12–14): Save draft then Submit created a second request (RC-26-00034 stayed a draft, 00035 submitted). New-collection form now keeps the draft id in state instead of relying on the `?edit=` reload. Typecheck + build clean; site restarted | Done; retest by user |
| 7.14 | 2026-10-08 | Fix (manual test step 18): a long ID-proof file name pushed the collector form wider than the phone column. Upload box text now shrinks and cuts long names with "…" (full name on hover). First try only let the text shrink; the box is a grid item so it also needed `min-width: 0`. Build clean; site restarted | Done; retest by user |
| 7.15 | 2026-10-09 | Manual test: steps 15–24 pass (request RC-26-00035, collector Murugan Kannan registered and approved). Layout fix 7.14 confirmed | Done |
| 7.16 | 2026-10-09 | Change (manual test step 26, user request): admin side panels (requests, complaints) get a ✕ button top right (`components/PanelClose.tsx`) and close on Esc (not while a dialog is open or while typing). Clicking outside does not close them, so half-typed reasons aren't lost. Typecheck, lint, build clean; site restarted | Done; retest by user |
| 7.17 | 2026-10-09 | Manual test: steps 25–31 pass. RC-26-00035 booked Fri 9 Oct 14:00–16:00 with Murugan Kannan; customer timeline correct | Done |
| 7.18 | 2026-10-09 | Manual test: steps 32–36 pass. Fix (step 38): "Add another material" did nothing; its hidden `<select>` had `sr-only` (clipped to 0 px) and the button wasn't `position: relative`, so there was nothing to tap. Now the transparent select covers the button. Typecheck + build clean | Done; retest by user |
| 7.19 | 2026-10-09 | Manual test: steps 37–40 pass (13.4 + 3.6 + 2 kg recorded, completed). Fix: collector stepper left the last segment half-filled on a completed pickup; now all segments fill. Typecheck clean | Done; in next rebuild |
| 7.20 | 2026-10-09 | Manual test: steps 41–44 pass (customer confirmed, history, notifications) | Done |
| 7.21 | 2026-10-09 | Manual test: steps 45–50 pass (complaint raised, taken, paper corrected to 14 kg, reply seen by customer) | Done |
| 7.22 | 2026-10-09 | Wrote `docs/TEST-ACCOUNTS.md` (all test accounts, user request; git-ignored, admin password stays only in `backend/.env`) | Done |
| 7.23 | 2026-10-11 | Backend had stopped (PC restart / low memory); user now runs backend and site in their own terminals. Manual test step 51 (dashboard) passes except: (a) 0% segment still showed a 6 px sliver in coloured bars; now `ItemStrip`, `ValueStrip`, `Strip` and the households bar skip empty segments (legends unchanged). (b) At 320 px the collector performance table spilled out of its card and widened the page; cards holding a `.tbl` now scroll sideways. Typecheck + lint clean | Done; retest by user |
| 7.24 | 2026-10-11 | Change (user request): at ≤900 px the admin sidebar wrapped into a block of links on every page. Now a sticky top bar (logo + ☰); the button slides a panel down over the page with the links, admin name and Sign out; closes on link, ✕ or Esc. Desktop sidebar unchanged. `components/AdminSide.tsx`, `menu` icon, CSS in `globals.css`. Typecheck + lint clean | Done; retest by user |
| 7.25 | 2026-10-11 | Manual test (375 px): hamburger bar works. Fixes: "What we collected" squeezed into 2 columns (kg wrapped, Metal misaligned) → one column under 600 px, values don't wrap; KPI grid showed a grey empty cell when the tile count is odd → separators drawn per tile, empty cells stay white | Done; retest by user |
| 7.26 | 2026-10-11 | Fix (dashboard, 375 px): "Requests by location" map squeezed to a sliver beside the 220 px "Busiest areas" list → under 700 px the map sits on top (260 px tall) and the list below. `MapView` now re-measures on any size change (ResizeObserver), so resized/rotated maps don't leave grey tiles. Typecheck + lint clean | Done; retest by user |
| 7.27 | 2026-10-11 | Fix (320 px): admin page header (`.topline`, used by all 11 admin pages) never wrapped, so "Export report" stuck out past the screen. Header now wraps (buttons go under the title); under 600 px the page padding is 16 px and the title 24 px | Done; retest by user |
| 7.28 | 2026-10-11 | Lazy loading check (user question). Already in place: map code (Leaflet) loads only on pages with a map (`next/dynamic` + `import("leaflet")`), per-route code splitting, Suspense streaming on 31 files, paged admin lists. Added: `loading="lazy"` + `decoding="async"` on the 4 photo thumbnails. Open idea: photos are served full size (up to 5 MB) even as thumbnails; server-side thumbnails would cut data use | Done |
| 7.29 | 2026-10-11 | Manual test: step 52 (scheduling board) passes | Done |
| 7.30 | 2026-10-11 | Overdue pickups (user asked "fix all"; found RC-26-00029 booked Thu 8 Oct still "Collector assigned" on 11 Oct, unflagged). New rule `request/Overdue.java`: booked slot ended and still scheduled/assigned, or a trip started on an earlier day. Used for: `overdue` flag on request cards + detail, an **Overdue** tab in Collection requests (red while non-empty), a red note in the review panel, an "Overdue pickups" KPI on the dashboard (links to the tab), and a daily 08:00 (business time) notification to admins (`PickupJobs.overdueNotice`). Tests: `RulesTests.overdueMeansTheBookedSlotEndedWithoutACollection`, API checks in `WorkflowTests` | Done |
| 7.31 | 2026-10-11 | Fix: request panel didn't match the tab. Scheduling board and complaint links opened requests with a fixed tab (`SCHEDULED` / `CLOSED`), so a completed request showed beside the Scheduled list. Links now pass only `open`; the requests page picks the tab from the request's status (Overdue if overdue). Removed the old "Close" text link from the request and complaint panels (✕ and Esc remain). Request tabs scroll sideways on narrow screens. Typecheck + lint clean | Done; retest by user |
| 7.32 | 2026-10-11 | Change (user: request showed in both Scheduled and Overdue): each request now sits in one tab. Overdue requests leave Scheduled / In progress (list and counts) and return to Scheduled once rebooked to a future slot. Test added (`WorkflowTests`: Scheduled tab has no overdue rows) | Done |
| 7.33 | 2026-10-11 | Fix (user): in Collection requests (and Complaints) the whole row showed a hand cursor but only the code/customer cells were links. The first cell's link now stretches over the row (CSS `::after`), so a click anywhere opens it; the "No requests match" row has a normal cursor | Done; retest by user |
| 7.34 | 2026-10-11 | Fix (user): "Reassign to E2E Collector 8981" looked active but was disabled (that collector is already assigned), and disabled buttons still darkened on hover with a "loading" cursor. Label now says "Already assigned to …" when the current collector is selected; disabled admin buttons keep their resting colour on hover and show a "not allowed" cursor. Typecheck + lint clean | Done; retest by user |
| 7.35 | 2026-10-11 | Manual test: RC-26-00029 rescheduled to Mon 12 Oct 10–12 and reassigned to Murugan; it left Overdue and reached the collector. Fix (collector Assigned screen): the stop card's three buttons (Accept / Ask to reassign / Details) didn't wrap and the card's text column couldn't shrink, so the card pushed the phone column sideways. Stop card column is now `minmax(0, 1fr)`, buttons wrap (also on the admin approval card), status label never breaks | Done; retest by user |
| 7.36 | 2026-10-11 | Manual test step 53 (reports) desktop: preview fills, 3 completed / 53.6 kg matches the dashboard. Fix (375 px): From/To/Area/Category squeezed into one row (dates cut off, boxes overlapping) → 2 columns under 700 px, 1 under 360 px; the 7 tall report cards become a swipeable row of compact buttons under 900 px | Done; retest by user |
| 7.37 | 2026-10-11 | Reports export: Excel only (user decision, DECISIONS D6). Removed the CSV button from Reports ("Download Excel"). Excel file restyled: large title + "RecycleConnect · period · Generated …" line, leaf-green header with white text, frozen header, striped rows with thin borders, bold total row, columns sized to content, whole numbers / one decimal per column, "(%)" columns shown with a % sign, prints landscape fitted to one page width, "No data for this period." when empty. Audit log export stays CSV. Backend compiles, frontend typecheck + lint clean | Done; retest by user |
| 7.38 | 2026-10-11 | User's backend restart failed once (exit 1, likely the old process still closing); a clean start worked (19 s). Backend tests with the overdue, single-tab and Excel changes: **35/35 pass** (was 34; +1 overdue rule test; the xlsx export is exercised in `WorkflowTests`) | Done |
| 7.39 | 2026-10-11 | Manual test: new styled Excel export confirmed by user (Waste categories) | Done |
| 7.40 | 2026-10-11 | Reports "Recent exports": removed the file-format label (XLSX/CSV), since reports export only as Excel now (D6), and the downloader's name (only one admin account exists; no screen adds more). Rows show report + time; the audit log still records who and which format | Done; retest by user |
| 7.41 | 2026-10-11 | Manual test: step 53 (reports) passes | Done |
| 7.42 | 2026-10-11 | Manual test: step 54 (analytics) passes | Done |
| 7.43 | 2026-10-11 | Manual test step 55 (audit log): all 16 steps of RC-26-00035 present. Fix: Details column showed raw codes ("PICKUP_STARTED", "13.40 -> 14", "date: 2026-10-09. note: Murugan Kannan…"). Audit page now writes them in plain words: status names from the app's labels, "Fri 9 Oct, 14:00 – 16:00", kg/pcs lower case, no trailing zeros (IP addresses untouched), resolution in words, notes that repeat the collector or slot hidden. Backend: quantity corrections log only materials that changed, without trailing zeros (new entries). Frontend typecheck + lint clean; backend compiles | Done; retest by user (backend restart for the correction change) |
| 7.44 | 2026-10-11 | Audit log download (user decision, D6 updated): main button "Download Excel" (same styled sheet as reports: Time, Who, Role, Action, On, Details in plain words; subtitle lists the filters and entry count; long details wrap), plus a small outlined "CSV" button with the raw stored values. Plain-words wording moved to the backend (`audit/AuditText.java`) so the screen (`summary` field) and the Excel file share it; the frontend copy from 7.43 was removed. `ReportService.styledXlsx` reused. Tests: `AuditTextTests` (3) + export checks in `WorkflowTests`; full backend suite **38/38 pass** | Done; retest by user |
| 7.45 | 2026-10-11 | Fix (dev error on /admin/audit, "Blocking Route: unstable value `Date.now()` while prerendering" at `SignedInAs` in the admin layout): `getCurrentUser()` and `api()` in `lib/dal.ts` now start with `await connection()`, so per-user data is only ever rendered for a real request (Next.js docs: `connection()` for rendering that must wait for a user request). Typecheck + lint clean | Done; retest by user |
| 7.46 | 2026-10-11 | Manual test: step 55 (audit log, plain-words details, Excel + CSV downloads) passes | Done |
| 7.47 | 2026-10-11 | Fix (Customers, user): type filter was big underlined number boxes, unlike every other admin list, and Area was a free-text box. Now type tabs with counts (same as Collection requests), Area is a dropdown of the 7 areas, a "Clear" link appears when a filter is set, and search keeps the area filter. Typecheck + lint clean | Done; retest by user |
| 7.48 | 2026-10-11 | Fix (user): search boxes worked only with Enter. Shared admin `SearchForm` (all admin lists) and the customer's My requests search now use design B "joined" (picked by the user from 4 samples): box and a pale-green "Search" button share one outline, plus a ✕ to clear an active search (keeps other filters); `type="search"` + search key on phone keyboards. Admin box 340 px on desktop, full width on phones. Typecheck + lint clean | Done; retest by user |
| 7.49 | 2026-10-11 | Audit log (user question about "IP address: ::1"; it is the local machine, real visitor IPs show once deployed). Fixes: "On" showed raw user ids ("83", "1") for sign-ins and other person entries → now CU-00082 / COL-083 (same codes as the admin lists) or the admin's name, on screen and in Excel (CSV keeps raw values); a collector swap read "Collector assigned → Collector assigned" → now "Collector changed to <name>", and same-status entries drop the meaningless arrow. Wording tests pass (10/10); SQL change runs in the full suite at next restart | Done; restart backend + retest |
| 7.50 | 2026-10-11 | Fix (user: clearing a search reloaded the whole page): admin search and filter forms were plain HTML `<form>`s and the ✕ a plain link, so each did a full page load. Now `next/form` `<Form scroll={false}>` (search box + filter bars on Requests, Customers, Complaints, Audit, Analytics, Reports) and a `<Link>` ✕: only the content updates, scroll position stays. Fields reset when the filters change (keyed wrapper / keyed search input), so "Clear" doesn't leave stale values. Still works without JavaScript. Typecheck + lint clean | Done; retest by user |
| 7.51 | 2026-10-11 | Audit "On" codes confirmed by user (COL-083). Change (user): local sign-ins showed "IP address: ::1"; `AuditText` now says "IP address: this computer" for ::1 / 127.0.0.1 (other addresses unchanged). Wording tests pass; full suite at next backend stop | Done; needs backend restart |
| 7.52 | 2026-10-11 | Fix (manual test step 56, user): clicking the "Area:" pill on Customers only showed a dark green focus ring; the list opened only when you hit the small dropdown itself. New `components/FilterPicker.tsx` (in the admin layout): a click anywhere on a filter pill (`.fsel`, all admin filter bars) opens its dropdown or date picker (`showPicker()`). Focus now shows as the soft green border used by text boxes, on the whole pill. Typecheck + lint clean | Done; retest by user |
| 7.53 | 2026-10-11 | Manual test: step 56 (Customers: masked mobile, View, audit entry) passes | Done |
| 7.9 | — | Still open: photo thumbnails made on upload (backend; photos now served full size, up to 5 MB; agreed 2026-10-11, do after the manual test), "Closed" vs "No slots left" label (undecided), deployment target, email provider choice, Tamil translation (P8), password reset (needs email), first git commit | **Next (needs your decisions)** |
