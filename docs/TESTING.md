# RecycleConnect: Tests

How to check that everything still works: automated tests to run on every change, then a manual checklist
before a release. Each item maps to a section of the brief (`requirements.pdf`).

## 1. Run everything

```bash
# Backend: 34 tests, against the dev database, every test rolled back (~2 min)
cd backend && ./mvnw test

# Frontend: types, lint, production build
cd frontend && npm run typecheck && npm run lint && npm run build

# Browser, whole workflow (needs backend on :8080 and `npx next start` on :3000; creates "E2E" test accounts)
cd e2e && npm install && npm test
```

Low memory: start the backend with `-Dspring-boot.run.jvmArguments="-Xmx400m"` and use `next start`, not `next dev`.
The backend tests freeze time at Monday 3 March 2031, 07:00 IST, so they pass on any day.
For CI, point the tests at a separate Neon branch (`DB_URL`) so they never touch real data.

## 2. Automated tests (what each one proves)

### Backend (`backend/src/test`)

| Test | Proves | Brief |
|------|--------|-------|
| `WorkflowTests.fullWorkflowFromListingToCompletion` | Listing → request → review → accept → schedule + assign → collector steps → record actual + extra material → complete → customer confirms; codes, zone, timeline, privacy masking, notifications for every step, summary kg; completed request is read-only | Objective, §6–§13, §18, §22, §25, §26, §28 |
| `WorkflowTests.draftThenSubmitAndCancelBeforeCutoff` | Drafts; submit needs date + slot; Sunday, out-of-hours, past and beyond-horizon dates refused; cancel with reason, who and when; can't cancel twice | §6, §15, §25 |
| `WorkflowTests.itemRulesAreEnforced` | Duplicate material, zero quantity, empty list, unknown category refused | §25 |
| `WorkflowTests.adminReviewOutcomes` | Reject with reason, ask for info and resubmit, can't schedule before accepting, can't book a closed day, search and tab filters | §8, §21, §25 |
| `WorkflowTests.rescheduleFailAndRebook` | Reschedule keeps from/to/reason/who/when; another collector can't touch the pickup; failed pickup with reason stays in history and can be booked again | §14, §16 |
| `WorkflowTests.collectorCapacityAndAvailabilityAreRespected` | Collector on leave can't be assigned | §25 |
| `WorkflowTests.collectorCanDeclineBeforeAccepting` | "Ask to reassign" hands it back; trip can start only on the day; steps can't be skipped | §11 |
| `WorkflowTests.complaintsFlow` | Raise, review, resolve with reply; activity trail; can't complain about someone else's request | §23 |
| `WorkflowTests.adminInsightsAndExports` | Dashboard, analytics, all 7 reports, Excel and audit exports, schedule board, masked customer list | §20, §24 |
| `SecurityTests.customersSeeOnlyTheirOwnRequests` | Another customer's request and address are invisible | §26 |
| `SecurityTests.rolesAreSeparated` | Each role is refused the others' APIs; no token = 401 | §26 |
| `SecurityTests.pendingCollectorCanOnlyUseTheirAccount` | Unapproved collectors are fenced; can upload ID proof | §2B |
| `SecurityTests.blockingAnAccountTakesEffectImmediately` | Blocked user's existing token stops working; can't sign in; admins can't be blocked here | §26 |
| `SecurityTests.passwordChangeSignsOutOtherSessions` | Wrong current password refused; old tokens revoked | §26 |
| `SecurityTests.repeatedWrongPasswordsAreSlowedDown` | 6th attempt after 5 failures is refused (429) | §26 |
| `SecurityTests.uploadsAreCheckedByContent` | Script disguised as PNG refused; real PNG stored; served only to the owner | §26 |
| `SecurityTests.securityHeadersAreSet` | Frame, sniffing and CSP headers | §26 |
| `RulesTests` (6) | State machines, slot generation, closed dates, cut-off time, bad settings, CSV formula safety, phone masking | §7, §11, §15, §25 |
| `UploadValidatorTests` | File-type sniffing | §26 |
| `AuthFlowTests` (7) | Registration, duplicate mobile, field errors, sign-in by mobile or email, collector approval wait, catalog | §2, §4, §5 |
| `PhonesTests` (2) | Indian mobile formats | §4 |

### Browser (`e2e/full-flow.mjs`)

12 steps with three separate users: customer registers → books today 16:00–18:00 → collector registers →
admin approves → admin reviews, accepts, schedules and assigns → collector accepts and runs every step, records
13.4 kg + 3.6 kg → customer sees 17 kg and confirms → history and all notifications → complaint raised and
resolved → second booking cancelled with a reason → dashboard, reports, CSV + Excel export, audit log,
scheduling, analytics, settings → each role is kept out of the others' areas.

## 3. Manual checklist before a release

Tick each on a phone-sized window (customer, collector) and a laptop (admin).

**Customer** (brief §2A, §3, §27)
- [ ] Register with a wrong email and a 5-digit mobile: both errors show at once, nothing typed is lost
- [ ] Drag the map pin on registration and on a new request; the pin position is kept
- [ ] New request: tap bins, see "what we accept" and the battery warning; open "Items we can't collect"
- [ ] Closed days are greyed out; past slots today can't be picked
- [ ] Add a photo (and try a PDF renamed to .jpg: refused); save draft; reopen draft; delete draft
- [ ] Submit → timeline shows "Request submitted"; cancel shows the cut-off time
- [ ] After pickup: "Did we collect everything?" shows recorded vs estimated; confirm; report an issue
- [ ] Notifications: unread dot on the bell; "Mark all read"
- [ ] Profile: edit details, add a second address, make it default, change password (other device signed out)

**Collector** (brief §2B, §11, §12, §14, §19)
- [ ] Waiting screen until approved; ID proof upload works
- [ ] Today: counts, filters (pending, completed, failed, category), route map with numbered stops, "Open in maps"
- [ ] Accept / ask to reassign a new pickup; Start trip only works on the pickup day
- [ ] Customer's number shows only after accepting; Directions opens OpenStreetMap
- [ ] Record weights, add a material not listed, add a photo, save; then Mark completed
- [ ] Can't complete: pick a reason, confirm; it stays in History with the reason
- [ ] Availability off → the admin can't assign them

**Admin** (brief §2C, §8–§10, §16, §17, §20–§24)
- [ ] Dashboard numbers match the requests made during testing
- [ ] Requests: every tab and filter; opening a new request marks it Under review
- [ ] Accept / reject with reason / ask for info / cancel, each with a confirmation dialog
- [ ] Schedule and assign: collectors outside the zone, on leave, full or not working that day are marked
- [ ] Reschedule with a reason; reassign; mark failed; book a failed one again
- [ ] Collectors: approve with ID proof, reject, leave on/off, block/unblock (blocked user is signed out)
- [ ] Categories: hide one (gone from the customer's bins), edit warning text, add/remove not-accepted items
- [ ] Settings: change hours, slot length, closed date, cut-off, reminder; every change appears in the audit log
- [ ] Complaints: take, note, correct quantity, send and resolve; customer sees the reply
- [ ] Reports: each of the 7 previews; CSV and Excel open in a spreadsheet
- [ ] Audit log: filter by role and date; export CSV

**Cross-cutting**
- [ ] Keyboard only: every button, dialog and form reachable; focus outline visible
- [ ] 320 px wide phone: no sideways scrolling on customer and collector screens
- [ ] Turn the backend off: pages show a friendly "can't reach" message, not a crash
- [ ] Session expiry: after 12 hours (or blocking), the next click returns to Sign in
