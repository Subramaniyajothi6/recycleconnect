# RecycleConnect — Session hand-over

Written 2026-10-08 at the end of session 2. A new session reads this first, then `docs/PROGRESS.md`
("Where we are now" + step log) and `docs/DECISIONS.md`. Do not redo finished work.

---

## 1. Where things stand

- **The whole brief is built and tested.** Backend API, all 27 approved screens, notifications, reports, audit,
  security hardening, docs.
- **Tests:** backend 34/34 (`./mvnw test`), browser e2e 12/12 (`e2e/full-flow.mjs`), frontend typecheck/lint/build clean,
  `npm audit --omit=dev` 0 vulnerabilities.
- **The user is now testing the full app manually** with `docs/MANUAL-TEST.md` (70 numbered steps). Next session:
  ask for their findings (by step number), fix them, log each fix in PROGRESS.md.
- **Nothing is committed to git yet.** Commit only when the user asks (`backend/.env` is git-ignored; check `git status`).

## 2. Open items (need the user's decision)

1. Deployment target (not discussed yet).
2. Free email provider (SMTP). App works without it (in-app notifications only). Set `MAIL_*` in `backend/.env`, then Admin → Settings → Email on.
3. Tamil translation (DECISIONS P8, nice-to-have) — not built.
4. Password reset by email — waits on 2 (DECISIONS P10).
5. Test data: several "E2E Customer"/"E2E Collector"/"Test ..." accounts and requests exist in the dev DB from test runs. Suggest a fresh Neon branch before real use.
6. First git commit.

## 3. User and how to work with them

- Chennai context. Wants step-by-step work, every step logged in `docs/PROGRESS.md`, decisions in `docs/DECISIONS.md`.
- Wants Claude to do things itself; when the user must act, give one clear step at a time.
- Never ask for or print passwords/connection strings. Admin password is in `backend/.env` (`ADMIN_PASSWORD`); the user reads it there.
- UI copy: plain, active voice, sentence case (approved design tone).
- Stakeholders approved design A "Sorted" (`design/`). It is the visual reference.

## 4. How to run (machine has little RAM: ~0.6–1.4 GB free)

```bash
# backend (needs backend/.env) — capped memory
cd /d/Adz4/recycleconnect/backend && ./mvnw -q spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx400m -XX:+UseSerialGC"

# frontend — use the production server (lighter than `next dev`); rebuild after code changes
cd /d/Adz4/recycleconnect/frontend && npm run build && npx next start -p 3000

# tests
cd backend && ./mvnw test                 # stop the running backend first to free memory
cd e2e && npm test                        # both servers running; creates "E2E" accounts
```
Stop servers (PowerShell): `foreach ($p in 8080,3000) { $c = Get-NetTCPConnection -LocalPort $p -State Listen -EA SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force } }`

Sign-in: admin `admin@recycleconnect.local` + `ADMIN_PASSWORD` from `backend/.env`. Customers/collectors self-register
(collectors need admin approval in Admin → Collectors). Known test customer: mobile `7849811444`, password `greenbins26`
(e2e account; collector `7949811444` / `collect2026`).

## 5. Architecture in one page

- **Backend** `backend/src/main/java/com/recycleconnect/`:
  - `request/` core: `RequestStatus`/`PickupStatus` state machines, `RequestWorkflow` (ONLY place statuses change; writes history + audit; publishes `events/RequestEvent`), `CustomerRequestService`, `AdminRequestService` (review, schedule, assign, reschedule, fail, search, board), `CollectorService`, `CollectorMatcher`, `BookingCheck`, `RequestViews` (privacy masking, timeline), `PickupJobs` (reminders, auto-complete 48 h, draft cleanup).
  - `security/`: `ActiveAccountFilter` (per-request account/token-version/pending check), `RateLimiter`, `@CurrentUser`.
  - `settings/` (typed `Rules`), `notification/` (event listeners → in-app + optional email), `complaint/`, `admin/` (users, catalog, analytics, reports CSV/XLSX, audit), `files/` (`FileStorage` interface, content-checked uploads, authorised serving), `routing/` (`RoutePlanner` interface).
  - Migrations V1 (schema), V2 (seed), V3 (cities, codes, booked date/slot, versions, token version). Never edit applied ones.
- **Frontend** `frontend/src/`: Next 16 App Router with `cacheComponents` ON — request-time reads (cookies, searchParams, `usePathname`, `new Date()`) must be inside `<Suspense>`. Read `frontend/node_modules/next/dist/docs/` before Next changes.
  - Auth: Server Actions store the backend JWT in httpOnly cookie `rc_session`; `proxy.ts` does role redirects; `lib/dal.ts` (`requireRole`, `api`) checks with the backend.
  - Mutations: `src/actions/*.ts` → `actions/result.ts` `call()` (refreshes page). Files/exports via route handlers (`app/files/...`, `app/admin/export/...`).
  - Maps: only `components/map/MapView.tsx` touches Leaflet; config `lib/map/config.ts` (env-driven tiles, HOT default).
  - Styles: design CSS copied to `src/styles/sorted*.css` + `app/globals.css`.
- **Docs:** `README.md`, `docs/SECURITY.md`, `docs/TESTING.md` (test list + manual checklist), `docs/EXTENDING.md` (maps, roadmap phases 2–8, scaling), `docs/API.md`.

## 6. Gotchas learned

- Neon CLI needs `--org-id org-delicate-violet-81309759`. Project `recycleconnect` id `long-flower-85975474` (Singapore).
- Bash heredocs sometimes fail in this tool with "unexpected EOF"; write files with the Write tool.
- Java text blocks drop trailing spaces: pad SQL fragments joined to them (see `KG` constants).
- Hibernate inserts before updates on flush: flush after deactivating a pickup before inserting a new active one.
- Backend tests share one Spring context (`IntegrationTest`, fixed clock Mon 3 Mar 2031 07:00 IST, per-test client IP, flush before each call).
- Spring 7: multipart test builder isn't a `MockHttpServletRequestBuilder` (helper is generic).
- In Chrome automation, wait ~1 s after page load before typing (React hydration resets controlled inputs).
- Map tiles: HOT (`tile.openstreetmap.fr`); `tile.openstreetmap.org` blocks requests without Referer.
- Addresses registered without dragging the pin have no lat/lng, so those requests show no map (by design: no guessed location).

## 7. First thing the next session should do

1. Read this file, `PROGRESS.md`, `DECISIONS.md`, `CLAUDE.md`.
2. Ask the user for their manual-test findings (list), then fix them one by one, logging each in PROGRESS.md and re-running the relevant tests.
3. Then the open items in §2, in the order the user prefers.
