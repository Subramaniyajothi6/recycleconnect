# Browser test run: 11 Oct 2026 (Claude in Chrome)

Automated walk through `docs/MANUAL-TEST.md` (70 steps) in Chrome, done by Claude at the user's request.
**Observation only: no code was changed during this run.** Findings are listed for the user to decide on.

## Setup

- Started: Sun 11 Oct 2026, 21:03 (Asia/Kolkata). Site http://localhost:3000 (dev server), backend :8080, Neon dev DB.
- One browser profile, so the three roles take turns (sign out / sign in) instead of three windows.
- Sunday is closed and the evening is past every slot, so bookings use **Mon 12 Oct**. A collector can only start a trip
  on the pickup day, so steps that need a started trip can't be finished tonight (marked **Blocked**).
- New accounts for this run (dev data only) are listed at the end.

Result key: **Pass** · **Fail** (doesn't match the expected result) · **Issue** (works, but something is off) ·
**Blocked** (can't be done now) · **Skipped**.

## Results

| # | Role | Step | Result | Notes |
|---|------|------|--------|-------|
| 1 | Customer | Open "Create a customer account" | Pass | Form opens |
| 2 | Customer | Wrong mobile/email, no address, box not ticked | Pass | "Tick the box to agree before you continue." |
| 3 | Customer | Tick box, submit again | Pass | Errors under mobile, email, street, area, PIN, password; typed values kept. Top message "Check the highlighted fields." |
| 4 | Customer | Correct data, submit | Pass | Home: "Good evening, Lakshmi", "Household account, Anna Nagar". Map pin not dragged (automation), so no saved location |
| 5 | Customer | Profile tab | Pass | Details, "Home Default" address, notification switches. No address map (no pin, by design) |
| 6 | Customer | Tap New | Pass | "New collection" with 9 coloured bins |
| 7 | Customer | Tap Paper and Batteries | Pass | Rows appear; amber warning "Vehicle (lead-acid) batteries are not accepted…" |
| 8 | Customer | Open "Items we can't collect" | Pass | 5 items listed |
| 9 | Customer | Remove Batteries, Paper 12, add Plastic 4 | Pass / **Issue** | Two rows correct. **Issue A:** the quantity box is too narrow: the up/down arrows cover the digits ("12" shows as "1▲▼") |
| 10 | Customer | Date chips | Pass | Sundays greyed "Closed". Today is Sunday, so there is no bookable "today" chip |
| 11 | Customer | Mon 12 Oct, 16:00–18:00, note | Pass | Selected chip dark, slot green |
| 12 | Customer | Save draft | Pass | "Draft saved", URL `?edit=54` (about 8 s on the dev server's first compile) |
| 13 | Customer | Add photo | Pass | Thumbnail appears; file served intact (checked bytes and colours). A brown placeholder shows for a moment before the image paints |
| 14 | Customer | Submit request | Pass | RC-26-00066, "Submitted", "Request sent…". Same id 54 as the draft: the 7.13 duplicate fix holds |
| 15 | Customer | Scroll the request | Pass / Note | Timeline, items 4 + 12 = 16 kg, note, photo. **No "Cancel request" button** because the cut-off (18:00 the day before) has passed; expected by the rules, and the page explains it: "It’s past the cancellation cut-off. Contact us if you can’t be there." |
| 16 | Customer | Notifications | Pass | "Request submitted · We received RC-26-00066…" |
| 17 | Collector | Open "Register as a collector" | Pass | Form opens |
| 18 | Collector | Fill form + ID proof, Send for approval | Pass | "Waiting for approval": Three-wheeler TN 09 CD 5678, Anna Nagar, Mon–Sat, "ID proof uploaded". (First attempt was lost: the dev server reloaded the page while it was being filled; not counted as an app fault) |
| 19 | Collector | Today / Assigned / History tabs while pending | **Fail** | **Bug C:** *Assigned* and *History* show "Something went wrong while loading this screen" with a Next.js error badge. The backend correctly answers "Your account is waiting for approval." (403), but these two screens don't handle it; *Today* and *Profile* do (Profile: "Collector, waiting for approval") |
| 20 | Admin | Sign in → Dashboard | Pass | 8 KPI cards incl. new "Overdue pickups 0 · none missed"; Pending requests 2 |
| 21 | Admin | Collectors | Pass | Selvam in "Waiting for approval" (plus 2 old "Test Collector" entries waiting since 8 Oct) |
| 22 | Admin | View ID proof | Pass | Opens in a new tab; serves the uploaded image (same 2,030 bytes) |
| 23 | Admin | Approve → confirm | Pass / **Issue** | Selvam moves to "All collectors" as Available (COL-141). **Issue D:** a new collector with 0 pickups shows "100% on time"; should be "—" until there is a pickup |
| 25 | Admin | Collection requests → Needs review | Pass / Note | RC-26-00066 listed. **Note E:** RC-26-00037 (Karthik) asked for Sat 10 Oct, still "Under review" on 11 Oct, not flagged anywhere: the Overdue rule only covers booked pickups |
| 26 | Admin | Open the request | Pass / **Issue** | Opened by clicking the "16 kg" cell (whole-row click works); status turns "Under review" after a moment. **Issue F:** with the panel open at 1372 px wide, the table is squeezed: Status cut off, Collector hidden, sideways scroll needed |
| 27 | Admin | Filters Paper / Glass / Clear | Pass | Paper: both rows; Glass: "No requests match."; Clear: both rows, dropdown back to "All". Applying a filter closes the open panel; URL carries empty params (`zoneId=&…`), harmless |
| 28 | Admin | Accept | Pass | "Schedule and assign" appears, prefilled with the customer's day and slot. (Opened via `?open=54` with no tab: lands on the right tab "Needs review") |
| 29 | Admin | Collector list | Pass | Selvam "In zone", "0 of 8" |
| 30 | Admin | Schedule and assign Selvam | Pass / **Issue** | Status "Collector assigned"; button now reads "Already assigned to Selvam Rajendran" (7.34 fix holds). **Issue G:** panel Activity shows "Scheduled by Admin: 2026-10-12 16:00-18:00" (raw date), unlike the audit log's plain wording |
| 24 | Collector | Sign in after approval | Pass / **Bug** | Today: "Sun 11 Oct, 0 pickups", banner "1 new assignment to accept. Review". **Bug H:** the selected filter chip "All statuses" has dark text on a dark background (both rgb 22,48,42), so its label is invisible |
| 32 | Collector | New assignment shown | Pass | On **Assigned** (pickup is Monday, so Today is empty): "New — accept it" card; buttons wrap inside the card (7.35 fix holds). The same pickup is listed twice (under "Needs your answer" and "Mon 12 Oct"), apparently by design |
| 33 | Collector | Accept pickup | Pass | Label "Accepted", button "Open pickup" |
| 34 | Collector | Open pickup | Pass | Step 2 of 7, name, address, full phone, Call. No Directions button (customer has no map pin, expected) |
| 35 | Collector | Start trip | Blocked / **Issue** | Correctly refused: "You can start the trip only on the pickup day." **Issue I:** the button looks fully active before tapping; on other days it could be disabled with that message shown up front |
| 36–44 | Customer / Collector | Pickup in progress → collected → completed → confirm, history, notifications | **Blocked** | Need a trip started on the pickup day (Mon 12 Oct). Run these from 08:00 Monday with RC-26-00066 / Selvam |
| 31 | Customer | Open the request after assignment | Pass / Question | Timeline: Accepted, Pickup scheduled (Mon 12 Oct, 16:00 – 18:00), Collector assigned (Selvam Rajendran, TN 09 CD 5678). Checked *after* the collector accepted: a **Call** button is shown. The collector screen says numbers are shared once the pickup is accepted; DECISIONS P12 says "while the pickup is in progress". **Question J:** which rule is intended? |
| 57 | Customer | Book Tue 13 Oct, cancel with reason | Pass / **Bug** | RC-26-00067: "You can cancel until 12 Oct, 18:00" → Cancelled, "Cancelled by Lakshmi Narayanan: …". **Bug K:** a reason ending with "." gets a second one: "I won't be home on Tuesday.." |
| 69 | Customer | Open /admin (and /collector) as customer | Pass | Both send the customer back to /customer |
| 52 | Admin | Scheduling, Mon 12 Oct | Pass | Murugan 10–12 RC-26-00029, Selvam 16–18 RC-26-00066; "Waiting for a slot 0"; "Recent reschedules" list |
| 53 | Admin | Reports (Collector activity, 1–11 Oct) | Pass / Note | Preview 4 rows, one "Download Excel" button, no CSV (D6). The report leaves "On time" blank for a collector with 0 pickups (good; compare Issue D). **Note N:** header "Thu 1 Oct – Sun, 11 Oct 2026" (comma only after Sun) |
| 54 | Admin | Analytics | Pass | Loads, filters present (area, customer type, category), no error |
| 55 | Admin | Audit log | Pass / Notes | RC-26-00066's 6 steps in plain words; "IP address: this computer"; COL-141 codes. **Note O:** register entry shows "Areas: Z8" (code, not "Anna Nagar"). **Note P:** searching "Selvam" doesn't find admin actions *about* him (approve, leave); search matches the actor or the code (COL-141) only |
| 56 | Admin | Customers → View Lakshmi | Pass / Question | List masked "+91 95••• ••001"; View shows full mobile, email, address; audit "View customer · CU-00140". The record box uses a "Close" text link, not the ✕ used on panels. **Question Q:** an extra "View customer CU-00140" entry at 22:51 was not made by this run (user, or link pre-loading writing audit entries?) |
| 58 | Admin | Reject RC-26-00068 (Wed) with reason | Pass | Status "Rejected" (customer view checked below) |
| 59 | Admin | Ask for info on RC-26-00069 (Thu) | Pass | Status "More info needed" (customer side checked below) |
| 60a | Admin | Accept + schedule RC-26-00070 (Fri 16, 10–12) to Selvam | Pass | "Collector assigned" |
| 64 | Admin | Waste categories: Glass off / on | Pass | At 685 px the admin shows the ☰ top bar (7.24). With Glass off, the customer catalogue lists 8 categories without Glass; switched back on |
| 65 | Admin | Settings: closed date 2026-10-12, then remove | Pass / **Issue** | Saved; booking options show Mon 12 closed, Tue open; removed again → Mon open. SMS switch shown off/disabled "Paid service, not used in the first version". **Issue L:** closing a day that already has 2 booked pickups (RC-26-00066, RC-26-00029) gives no warning |
| 66 | Admin | Collector on leave / back | Pass / **Issue** | Selvam "On leave": greyed out and not selectable in the scheduling list; "Back from leave" → Available. No confirm step. **Issue M:** no warning that he has 2 upcoming assigned pickups (Mon, Fri) |
| 60 | Collector → Admin | Collector "Ask to reassign" RC-26-00070 with reason | Pass / **Bug** | Pickup leaves Selvam's list; request back to "Scheduled" with no collector; reason in Activity. **Bug R:** the backend creates admin notifications (reassign requests, the 08:00 overdue notice), but the admin has **no notifications screen or bell**: the admin only sees it by opening the request |
| 61 | Admin | Assign again; reschedule to Sat 17 Oct 10–12 with reason | Pass | "Rescheduled to Sat 17 Oct by Admin: Collector is busy on Friday". Reschedule button stays disabled until a reason is typed (good). Changing the date reloads the panel (`&date=`), so text typed just before is lost |
| 62 | Collector | Accept, then "Can't complete this pickup" → Customer unavailable → confirm | Pass / **Issue** | "Failed: Customer unavailable"; phone masked again; stays in History. **Issue S:** failing is allowed days before the pickup day (done on Sun for Sat), while starting a trip is limited to the day. History again shows "100% On time" with 0 completed / 1 failed (Issue D) |
| 63 | Admin | Book again (Murugan, Sat 17 10:00) | Pass / **Issue** | New booking; "Pickups" list keeps the failed one. **Issue T:** the reassign-requested Friday pickup is listed as "Selvam Rajendran: New — accept it", should read e.g. "Asked to reassign" |
| 58b | Customer | See rejected RC-26-00068 | Pass | "Rejected: We can't collect from this address yet." + notification |
| 59b | Customer | Update RC-26-00069 after "Ask for info" | Pass / **Issue** | Sees "We need more information: Please add a photo…" + "Update request"; edit screen "Update RC-26-00069", photo added, submitted → "Submitted" (back in Needs review). **Issue U:** the update screen says "Draft saved" and offers "Save draft", though the request isn't a draft |
| 61b | Customer | See schedule changes on RC-26-00070 | Pass / **Issue** | "Schedule changes": Fri 16 → Sat 17 with the reason. **Issue V:** re-booking after the failure is also listed as a change "Sat 17 → Sat 17" (no change); both say "Changed by RecycleConnect" |
| — | Customer | Notifications after all of the above | Pass / Note | All events present (accepted, scheduled, assigned, rescheduled, failed, info request, rejected). "Collector assigned Selvam … Fri 16 Oct" arrives twice; "Pickup failed: Customer unavailable" sent 6 days ahead (consequence of Issue S) |
| 45–46 | Customer | Report an issue → "Collector did not arrive" on RC-26-00070 | Pass | Done on the failed request (no completed pickup tonight). "Thanks. We've sent your complaint…"; CMP-0008 listed as Open |
| 47 | Admin | Complaints → open CMP-0008 | Pass / **Bug** | Customer's words, recorded table, "Open the request". **Bug X:** panel says "Collected by Murugan Kannan": nothing was collected, the failed visit was Selvam's; Murugan is only the new booking |
| 48 | Admin | Take it | Pass | Status "In review" |
| 49 | Admin | Explain what happened + reply → Send and resolve | Pass | Status "Resolved" (quantity correction not repeated: nothing was recorded on this request) |
| 50 | Customer | See the reply | Pass | CMP-0008 "Resolved", "Reply from RecycleConnect, 11 Oct, 23:14 …" |
| 67 | Admin | Block / unblock Lakshmi | Pass / Note | Block asks for a reason (audit) → "Blocked"; sign-in then answers "This account is turned off. Contact the RecycleConnect team."; Unblock → Active. **Note W:** button says "Unblock", its dialog says "Reactivate … / Reactivate" |
| 68 | Customer | Change password | Pass / **Bug** | "Password changed. Other devices are signed out." The profile text says "The collector sees your number only while the pickup is in progress", but in step 34 the collector saw the full number at the *Accepted* step: **Bug J** (was Question J): page promise and behaviour disagree |
| 70 | Customer | 6 wrong passwords | Pass | Attempts 1–5: "That mobile number, email or password is wrong."; 6th: "Too many sign-in attempts. Wait 15 minutes and try again." (Lakshmi's account is locked until about 23:30) |

## Summary

Ran 11 Oct 2026, 21:03–23:16. **Steps run: 61 of 70. Blocked: 9 (36–44)**, because a trip can only start on the pickup day.
Every run step does what MANUAL-TEST.md expects; the findings below are problems found along the way.

### Bugs (wrong behaviour)

| Id | Where | What |
|----|-------|------|
| C | Collector, pending approval | *Assigned* and *History* tabs show "Something went wrong" (backend 403 "waiting for approval" not handled); *Today* and *Profile* are fine |
| H | Collector Today | Selected filter chip "All statuses": dark text on dark background, label invisible |
| J | Privacy | Collector sees the customer's full number from *Accepted*; customer sees the collector's Call button from *Accepted*. Profile text and DECISIONS P12 say "only while the pickup is in progress" |
| K | Cancel reason | A reason ending with "." shows "..": "I won't be home on Tuesday.." |
| R | Admin notifications | Backend notifies admins (reassign requests, 08:00 overdue notice), but the admin has no bell or notifications screen |
| X | Complaint panel | "Collected by <current collector>" on a request where nothing was collected and a different collector failed |

### Issues (works, but should be better)

| Id | Where | What |
|----|-------|------|
| A | New collection | Quantity box too narrow: arrows cover the digits |
| D | Collectors card, collector History | "100% on time" with 0 completed (report correctly leaves it blank) |
| E | Requests | A request whose *asked-for* date has passed while still under review isn't flagged (Overdue covers booked pickups only) |
| F | Admin requests at ~1372 px | Table squeezed when the panel is open (Status cut, Collector hidden) |
| G | Request panel Activity | Raw "2026-10-12 16:00-18:00" instead of "Mon 12 Oct, 16:00 – 18:00" |
| I | Collector pickup | "Start trip" looks active on other days; message only after tapping |
| L | Settings | Closing a date with existing bookings gives no warning |
| M | Collectors | Marking "on leave" gives no warning about upcoming assigned pickups |
| S | Collector pickup | "Can't complete this pickup" allowed days before the pickup day |
| T | Request panel "Pickups" | A reassign-requested pickup shows "New — accept it" |
| U | Customer update after "Ask for info" | Shows "Draft saved" and a "Save draft" button |
| V | Customer "Schedule changes" | Re-booking listed as a change with the same from/to |

### Small notes

N (report header comma), O (audit "Areas: Z8" code), P (audit search doesn't find actions *about* a person by name),
Q (an extra "View customer" audit entry at 22:51 not made by this run: user, or link pre-loading?), W ("Unblock" vs
"Reactivate"), duplicate "Collector assigned" notification, applying a request filter closes the open panel.

### Confirmed fixes from earlier today

Draft → Submit reuses the draft (7.13); collector card buttons wrap (7.35); "Already assigned to …" label (7.34);
whole-row click (7.33); right tab when opened by link (7.31); Overdue KPI (7.30); hamburger at ≤900 px (7.24);
search button + ✕ (7.48); Excel-only reports (D6); audit plain wording, codes and "this computer" (7.44–7.51).

### Test-run notes (not app faults)

- Dev server (`next dev`): first visit to a page compiles for 5–10 s, and typing before the page is ready is lost
  (known hydration behaviour, HANDOVER §6). Re-done where it happened (steps 18, sign-ins).
- Chrome pauses fully covered windows; the run paused twice until the window was visible.
- Frontend code was being edited by the user during the run (admin `layout.tsx` gained a `FilterPicker`); results reflect the code at the time.

### Accounts created (dev data)

| Role | Name | Sign in | Password |
|------|------|---------|----------|
| Customer | Lakshmi Narayanan (CU-00140) | 9500011001 / lakshmi.n@example.com | BrowserTest27 (was BrowserTest26 before step 68); locked until ~23:30 by step 70 |
| Collector | Selvam Rajendran (COL-141) | 9500011002 | BrowserTest26 |

Requests: RC-26-00066 (Mon 12 Oct 16–18, Selvam, accepted: **use it for steps 36–44 on Monday**), RC-26-00067 (cancelled),
RC-26-00068 (rejected), RC-26-00069 (info given, back in review), RC-26-00070 (failed once, re-booked Sat 17 10–12 with
Murugan). Complaint CMP-0008 (resolved).
