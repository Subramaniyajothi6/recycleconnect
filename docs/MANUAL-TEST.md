# RecycleConnect: step-by-step manual test

Follow in order. Each step says **what to do** and **what you should see**. Tick it, or note what went wrong
(step number + what you saw) so it can be fixed in the next session.

**Before you start**
- Both servers running: open http://localhost:3000. You should see the green "Book a pickup for your recyclables" sign-in page.
- Use **three browser windows** so the three people stay signed in at once:
  - Window A: normal Chrome → **Customer**
  - Window B: Incognito (Ctrl+Shift+N) → **Collector**
  - Window C: another Chrome profile, or sign out/in when needed → **Admin**
- Admin sign-in: `admin@recycleconnect.local` + the `ADMIN_PASSWORD` value in `backend/.env`.
- Do this **before 16:00** so you can book a slot for today (a collector can start a trip only on the pickup day).

---

## Part 1 — Customer registers (Window A)

| # | Do | Expect |
|---|----|--------|
| 1 | On sign-in, click **Create a customer account** | Registration form |
| 2 | Type name, mobile `12345`, email `test@x`, leave address empty, click **Create account** without ticking the box | "Tick the box to agree" message |
| 3 | Tick the box, click **Create account** again | Red messages under mobile, email, address, PIN, password; what you typed is still there |
| 4 | Fix: a real 10-digit mobile (e.g. `98765 43210`), full email, address `12, 3rd Main Road`, Area `Anna Nagar`, PIN `600040`, password 8+ characters. **Drag the map pin** a little. Tick the box, **Create account** | You land on **Home**: "Good afternoon, <name>", "Household account, Anna Nagar" |
| 5 | Click the **Profile** tab | Your details, one "Home (default)" address with a map pin, notification switches |

## Part 2 — Customer books a pickup (Window A)

| # | Do | Expect |
|---|----|--------|
| 6 | Tap **New** (green + in the tab bar) | "New collection" with coloured material bins |
| 7 | Tap **Paper** and **Batteries** | Quantity rows appear; Batteries shows an amber warning about vehicle batteries |
| 8 | Open **Items we can't collect** | List of 5 items (medical waste, paint containers, …) |
| 9 | Tap Batteries again to remove it. Set Paper to `12`. Tap **Plastic**, set `4` | Two rows: Paper 12 kg, Plastic 4 kg |
| 10 | Check the date chips | Sunday and closed days greyed out; today available |
| 11 | Pick **today**, slot **16:00 – 18:00**. Write a note | Selected chip and slot turn dark/green |
| 12 | Click **Save draft** | Top right shows "Draft saved" |
| 13 | Tap the camera box and add a photo (any JPG/PNG) | Photo thumbnail appears |
| 14 | Click **Submit request** | Request page: "Request sent…", status **Submitted**, code like `RC-26-000xx`. Note the code |
| 15 | Scroll down | Timeline: "Request submitted" ticked; Items table: estimated 12 kg + 4 kg; your photo; "Cancel request" with a cut-off time |
| 16 | Tap the bell (Home) | Notification "Request submitted" |

## Part 3 — Collector registers (Window B, Incognito)

| # | Do | Expect |
|---|----|--------|
| 17 | Go to http://localhost:3000, click **Register as a collector** | Collector form |
| 18 | Fill name, a different mobile, vehicle **Three-wheeler**, registration `TN 09 AB 1234`, area **Anna Nagar**, upload any photo or PDF as ID proof, password, tick the box, **Send for approval** | "Waiting for approval" screen showing vehicle, areas, days, "ID proof uploaded" |
| 19 | Tap **Today** / **Assigned** tabs | Still the waiting screen (no pickups until approved) |

## Part 4 — Admin approves and schedules (Window C)

| # | Do | Expect |
|---|----|--------|
| 20 | Sign in as admin | **Dashboard** with KPIs; "Pending requests" shows at least 1 |
| 21 | Sidebar → **Collectors** | "Waiting for approval" card with your new collector |
| 22 | Click **View ID proof** | The uploaded file opens in a new tab |
| 23 | Click **Approve** → confirm in the dialog | Card moves to "All collectors" as **Available** |
| 24 | Window B: reload | Collector now sees **Today** with "0 pickups" (and a notification "Your account is approved" under Profile → Notifications) |
| 25 | Sidebar → **Collection requests**, tab **Needs review** | Your request in the table |
| 26 | Click the request code | Review panel opens on the right; status becomes **Under review** |
| 27 | Try the filters (Waste type = Paper → Apply) | Request still listed; change to Glass → list empty; click **Clear** |
| 28 | In the panel click **Accept** | Status **Accepted**; "Schedule and assign" section appears |
| 29 | Check the collector list | Your collector marked **In zone**, "0 of 8" |
| 30 | Keep today's date and 16:00–18:00, select your collector, click **Schedule and assign <name>** | Status **Collector assigned** |
| 31 | Window A (customer): open the request | Timeline: Accepted, Pickup scheduled, Collector assigned ticked; collector name and vehicle shown; phone **hidden** (no Call button yet) |

## Part 5 — Collector does the pickup (Window B)

| # | Do | Expect |
|---|----|--------|
| 32 | Reload **Today** | 1 pickup, amber "New — accept it", route map; banner "1 new assignment to accept" |
| 33 | Click **Accept pickup** | Label changes to **Accepted**; button **Open pickup** |
| 34 | Click **Open pickup** | Stepper at step 2; customer name, address, phone number, **Directions** and **Call** |
| 35 | Click **Start trip** | Step "On the way" (browser may ask for location; allow or deny, both fine) |
| 36 | Window A: open the request | Status **Pickup in progress**; now a **Call** button for the collector |
| 37 | Window B: **I have arrived** → **Start collection** | Quantity boxes appear, pre-filled with the estimate |
| 38 | Change Paper to `13.4`, Plastic to `3.6`. Use **Add another material** → Metal, `2` | Each row shows "+1.4 kg compared with the estimate" etc.; Metal says "Not in the customer's list" |
| 39 | Add a photo, write a note, click **Save quantities and mark collected** | Step **Collected**; button **Mark completed** |
| 40 | Click **Mark completed** | "Back to today"; Today shows it with a green tick and "Collected today 19 kg" |

## Part 6 — Customer confirms and complains (Window A)

| # | Do | Expect |
|---|----|--------|
| 41 | Open the request | Amber box "Did we collect everything?" with 19 kg recorded vs 16 kg estimated; Items table shows both columns and Metal |
| 42 | Write feedback, click **Confirm collection** | Status **Completed**; all 7 timeline steps ticked |
| 43 | **History** tab | 19 kg total, coloured bar by material, month chart, the pickup in "Completed pickups" |
| 44 | Bell → **Notifications** | Submitted, Accepted, Pickup scheduled, Collector assigned, Collector confirmed, Pickup started, Material collected, Pickup completed |
| 45 | Open the request → **Report an issue** | Complaint form with the request preselected |
| 46 | Pick **Wrong quantity recorded**, write a sentence, **Send complaint** | Green "We've sent your complaint…" and it appears under "Your complaints" as **Open** |

## Part 7 — Admin resolves and checks reports (Window C)

| # | Do | Expect |
|---|----|--------|
| 47 | **Complaints** → Open tab → click the complaint | Panel: customer's words, estimate vs recorded table, collector name |
| 48 | Click **Take it** | Status **In review** (customer gets "Complaint update") |
| 49 | Choose **Correct the recorded quantity**, change Paper to `14`, write a reply, **Send and resolve** | Status **Resolved** |
| 50 | Window A: Profile → Report an issue | Complaint shows the reply |
| 51 | **Dashboard** | Completed collections and kg went up; "What we collected" shows paper/plastic/metal; collector in the performance table |
| 52 | **Scheduling** | Today's board shows the pickup in the 16:00–18:00 column of your collector |
| 53 | **Reports** → each of the 7 reports | Preview tables fill in; **CSV** and **Excel** download and open in a spreadsheet |
| 54 | **Analytics** | Charts show data; filters apply |
| 55 | **Audit logs** | Entries for: registered, approve collector, accepted, scheduled, assigned, pickup steps, recorded quantity, quantity corrected, complaint resolved, exports; **Export CSV** works |
| 56 | **Customers** | Your customer with masked mobile; **View** shows full details (and adds a "View customer" audit entry) |

## Part 8 — Other paths

| # | Do | Expect |
|---|----|--------|
| 57 | Customer: book another pickup for **tomorrow**, submit, then **Cancel request** with a reason | Status **Cancelled**, "Cancelled by <you>: <reason>" |
| 58 | Customer: book another; Admin: **Reject** it with a reason | Customer sees "Rejected: <reason>" and a notification |
| 59 | Customer: book another; Admin: **Ask for info** | Customer sees "We need more information" + **Update request**; after updating and submitting it's back in Needs review |
| 60 | Admin: accept + schedule another to your collector; Collector: **Ask to reassign** with a reason | Admin gets a notification; request back to "Scheduled" with no collector |
| 61 | Admin: assign again; **Reschedule** to another slot with a reason | Customer sees "Schedule changes" with old (struck through) and new slot |
| 62 | Collector: accept it, open, **Can't complete this pickup** → reason → confirm | Status **Pickup failed** with the reason; stays in History |
| 63 | Admin: open the failed request → **Book again** with a collector | New booking; old failed pickup listed under "Pickups" |
| 64 | Admin → **Waste categories**: switch **Glass** off | Customer's New collection no longer shows Glass. Switch it back on |
| 65 | Admin → **Settings**: add tomorrow to "Closed dates", **Save changes** | Customer's date chips show tomorrow as Closed; audit log shows the change. Remove it again |
| 66 | Admin → **Collectors**: **Mark on leave** | Collector can't be selected when scheduling ("On leave"). Mark back |
| 67 | Admin → **Customers**: **Block** your test customer | Customer's next click returns to Sign in; signing in says the account is turned off. **Unblock** |
| 68 | Customer → Profile → **Change password** | Works; other windows signed in as that customer are signed out |
| 69 | Customer: open http://localhost:3000/admin | Sent back to the customer home |
| 70 | Sign in with a wrong password 6 times | After 5, "Too many sign-in attempts. Wait 15 minutes" |

## Writing down problems

For each problem note: **step number, which window/role, what you did, what you expected, what you saw**
(a screenshot helps). Paste the list into the next session.
