// End-to-end test of the whole RecycleConnect workflow in a real browser (brief: listing → completion).
// Run: cd e2e && npm test   (backend on :8080, frontend on :3000, Chrome installed).
// Uses three separate browser contexts (customer, collector, admin) so their sessions never mix.
// Creates test accounts named "E2E ..." in the database it runs against. Never prints passwords.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = path.join(here, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const env = Object.fromEntries(fs.readFileSync(path.join(here, "../backend/.env"), "utf8").split(/\r?\n/)
  .filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));

const rnd = String(Date.now()).slice(-8);
const custMobile = "78" + rnd, collMobile = "79" + rnd;
const CUSTOMER = { name: "E2E Customer", mobile: custMobile, email: `e2e.customer.${rnd}@example.in`, password: "greenbins26" };
const COLLECTOR = { name: `E2E Collector ${rnd.slice(-4)}`, mobile: collMobile, password: "collect2026" };

const results = [];
let failures = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(name, page, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    failures++;
    results.push(`FAIL  ${name}  (${e.message.split("\n")[0]})`);
    const file = path.join(SHOTS, name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".png");
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    throw e;
  }
}

// ---------- helpers ----------
async function go(page, p) {
  await page.goto(BASE + p, { waitUntil: "networkidle0" });
}
async function waitText(page, text, timeout = 15000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
}
async function click(page, selector, text, { within } = {}) {
  await page.waitForFunction((sel, t, w) => {
    const root = w ? document.querySelector(w) : document;
    return root && [...root.querySelectorAll(sel)].some((e) => e.textContent.replace(/\s+/g, " ").trim().includes(t) && !e.disabled);
  }, { timeout: 15000 }, selector, text, within ?? null);
  await page.evaluate((sel, t, w) => {
    const root = w ? document.querySelector(w) : document;
    const el = [...root.querySelectorAll(sel)].filter((e) => e.textContent.replace(/\s+/g, " ").trim().includes(t) && !e.disabled)[0];
    el.scrollIntoView({ block: "center" });
    el.click();
  }, selector, text, within ?? null);
}
async function type(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}
/** Clicks the confirm button inside the open native dialog, typing a reason first if asked. */
async function confirmDialog(page, buttonText, reason) {
  await page.waitForSelector("dialog[open]", { timeout: 10000 });
  if (reason) await page.type("dialog[open] textarea", reason);
  await click(page, "dialog[open] button", buttonText);
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), { timeout: 15000 });
}
async function settle(page, ms = 1200) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 }).catch(() => {});
  await sleep(ms);
}
async function login(page, identifier, password) {
  await go(page, "/login");
  await type(page, "#li-user", identifier);
  await type(page, "#li-pw", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), click(page, "button", "Sign in")]);
}
const text = (page) => page.evaluate(() => document.body.innerText);
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- run ----------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const ctx = { customer: await browser.createBrowserContext(), collector: await browser.createBrowserContext(), admin: await browser.createBrowserContext() };
const cu = await ctx.customer.newPage(), co = await ctx.collector.newPage(), ad = await ctx.admin.newPage();
await cu.setViewport({ width: 440, height: 900 });
await co.setViewport({ width: 440, height: 900 });
await ad.setViewport({ width: 1360, height: 900 });
let requestCode = "", requestUrl = "";

try {
  await step("customer registers", cu, async () => {
    await go(cu, "/register/customer");
    await type(cu, "#rc-name", CUSTOMER.name);
    await type(cu, "#rc-mobile", CUSTOMER.mobile);
    await type(cu, "#rc-email", CUSTOMER.email);
    await type(cu, "#rc-line1", "12, 3rd Main Road");
    await type(cu, "#rc-area", "Anna Nagar");
    await type(cu, "#rc-pin", "600040");
    await type(cu, "#rc-password", CUSTOMER.password);
    await cu.click("input[name=agree]");
    await Promise.all([cu.waitForNavigation({ waitUntil: "networkidle0" }), click(cu, "button", "Create account")]);
    assert(cu.url().endsWith("/customer"), "not on customer home: " + cu.url());
    await waitText(cu, "E2E");
  });

  await step("customer books a pickup for today 16:00-18:00", cu, async () => {
    await go(cu, "/customer/new");
    await click(cu, "button.bin", "Paper");
    await click(cu, "button.bin", "Plastic");
    await type(cu, 'input[aria-label="Paper quantity"]', "12");
    await type(cu, 'input[aria-label="Plastic quantity"]', "4");
    await cu.evaluate(() => document.querySelector("button.day:not([disabled])").click());
    await click(cu, "button.slot", "16:00 – 18:00");
    await type(cu, 'textarea[aria-label="Notes for the collector"]', "Bundled near the lift");
    await Promise.all([cu.waitForNavigation({ waitUntil: "networkidle0" }), click(cu, "button", "Submit request")]);
    requestUrl = new URL(cu.url()).pathname;
    await waitText(cu, "Request sent");
    requestCode = (await text(cu)).match(/RC-\d{2}-\d{5}/)[0];
  });

  await step("collector registers and waits for approval", co, async () => {
    await go(co, "/register/collector");
    await type(co, "#rk-name", COLLECTOR.name);
    await type(co, "#rk-mobile", COLLECTOR.mobile);
    await type(co, "#rk-vehicleNumber", "TN 09 BX 4471");
    await type(co, "#rk-password", COLLECTOR.password);
    await click(co, "button.opt", "Three-wheeler");
    await click(co, "button.opt", "Anna Nagar");
    await co.click("input[name=agree]");
    await Promise.all([co.waitForNavigation({ waitUntil: "networkidle0" }), click(co, "button", "Send for approval")]);
    await waitText(co, "Waiting for approval");
  });

  await step("admin approves the collector", ad, async () => {
    await login(ad, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
    await go(ad, "/admin/collectors");
    await waitText(ad, COLLECTOR.name);
    await ad.evaluate((name) => {
      const card = [...document.querySelectorAll(".approve")].find((c) => c.textContent.includes(name));
      [...card.querySelectorAll("button")].find((b) => b.textContent.trim() === "Approve").click();
    }, COLLECTOR.name);
    await confirmDialog(ad, "Approve");
    await settle(ad);
    await go(ad, "/admin/collectors");
    assert(!(await ad.evaluate((n) => [...document.querySelectorAll(".approve")].some((c) => c.textContent.includes(n)), COLLECTOR.name)), "still pending");
  });

  await step("admin reviews, accepts, schedules and assigns", ad, async () => {
    await go(ad, `/admin/requests?tab=REVIEW&q=${requestCode}`);
    await click(ad, "a", requestCode);
    await settle(ad, 2000);
    await waitText(ad, "Decision");
    await click(ad, ".review button", "Accept");
    await settle(ad, 2000);
    await go(ad, `/admin/requests?tab=ACCEPTED&q=${requestCode}`);
    await click(ad, "a", requestCode);
    await waitText(ad, "Schedule and assign");
    await ad.evaluate((name) => {
      const label = [...document.querySelectorAll(".coll label")].find((l) => l.textContent.includes(name));
      label.querySelector("input").click();
    }, COLLECTOR.name);
    await click(ad, ".review button", "Schedule and assign");
    await settle(ad, 2000);
    await go(ad, `/admin/requests?tab=SCHEDULED&q=${requestCode}`);
    await waitText(ad, "Collector assigned");
  });

  await step("collector accepts and runs every pickup step", co, async () => {
    await go(co, "/collector"); // still signed in from registration; now approved
    await waitText(co, "E2E Customer");
    await click(co, "button", "Accept pickup");
    await settle(co);
    await click(co, "a", "Open pickup");
    await co.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
    for (const action of ["Start trip", "I have arrived", "Start collection"]) {
      await click(co, ".foot button", action);
      await settle(co);
    }
    await type(co, 'input[aria-label="Actual Paper"]', "13.4");
    await type(co, 'input[aria-label="Actual Plastic"]', "3.6");
    await click(co, ".foot button", "Save quantities and mark collected");
    await settle(co, 2000);
    await click(co, ".foot button", "Mark completed");
    await settle(co, 2000);
    await waitText(co, "Back to today");
  });

  await step("customer sees the weights and confirms", cu, async () => {
    await go(cu, requestUrl);
    await waitText(cu, "Did we collect everything?");
    const t = await text(cu);
    assert(t.includes("17 kg"), "recorded total not shown");
    await click(cu, "button", "Confirm collection");
    await settle(cu, 2000);
    await go(cu, requestUrl);
    await waitText(cu, "Collection completed");
    assert((await text(cu)).includes("Completed"), "not completed");
  });

  await step("customer history and notifications", cu, async () => {
    await go(cu, "/customer/history");
    await waitText(cu, "17");
    await go(cu, "/customer/notifications");
    for (const t of ["Request submitted", "Request accepted", "Collector assigned", "Pickup started", "Material collected", "Pickup completed"]) await waitText(cu, t);
  });

  await step("customer reports an issue and admin resolves it", ad, async () => {
    await go(cu, requestUrl.replace(/\/customer\/requests\/(\d+).*/, "/customer/complaints?request=$1"));
    await click(cu, "button.opt", "Wrong quantity recorded");
    await type(cu, 'textarea[aria-label="Describe the issue"]', "I think the paper was heavier.");
    await click(cu, "button", "Send complaint");
    await waitText(cu, "We’ve sent your complaint");
    await go(ad, "/admin/complaints?status=OPEN");
    await click(ad, "a", "CMP-");
    await waitText(ad, "Customer says");
    await type(ad, "#cmp-reply", "The paper was weighed dry. Photo attached.");
    await click(ad, ".review button", "Send and resolve");
    await settle(ad, 2000);
    await go(cu, "/customer/complaints");
    await waitText(cu, "The paper was weighed dry");
  });

  await step("customer cancels a second booking with a reason", cu, async () => {
    await go(cu, "/customer/new");
    await click(cu, "button.bin", "Cardboard");
    const days = await cu.$$("button.day:not([disabled])");
    await days[Math.min(1, days.length - 1)].click();
    await cu.evaluate(() => document.querySelector("button.slot:not([disabled])").click());
    await Promise.all([cu.waitForNavigation({ waitUntil: "networkidle0" }), click(cu, "button", "Submit request")]);
    await click(cu, "button", "Cancel request");
    await confirmDialog(cu, "Cancel request", "Travelling that week");
    await settle(cu);
    await waitText(cu, "Cancelled by");
  });

  await step("admin dashboard, reports, exports and audit log", ad, async () => {
    await go(ad, "/admin");
    await waitText(ad, "Total customers");
    await go(ad, "/admin/reports?type=COLLECTOR_ACTIVITY");
    await waitText(ad, COLLECTOR.name);
    const csv = await ad.evaluate(async () => {
      const r = await fetch("/admin/export/COLLECTION_VOLUME?format=csv");
      return { status: r.status, type: r.headers.get("content-type"), body: (await r.text()).slice(0, 40) };
    });
    assert(csv.status === 200 && csv.type.includes("text/csv") && csv.body.includes("Month"), "CSV export failed");
    const xlsx = await ad.evaluate(async () => (await fetch("/admin/export/LOCATION_WISE?format=xlsx")).headers.get("content-type"));
    assert(xlsx.includes("spreadsheetml"), "Excel export failed");
    await go(ad, "/admin/audit");
    await waitText(ad, "Approve collector");
    await go(ad, "/admin/scheduling");
    await waitText(ad, "Waiting for a slot");
    await go(ad, "/admin/analytics");
    await waitText(ad, "Why pickups fail");
    await go(ad, "/admin/settings");
    await waitText(ad, "Working days and hours");
  });

  await step("roles can't reach each other's areas", cu, async () => {
    await go(cu, "/admin");
    assert(cu.url().endsWith("/customer"), "customer reached admin: " + cu.url());
    await go(co, "/customer");
    assert(co.url().endsWith("/collector"), "collector reached customer area: " + co.url());
    // The proxy sends a customer away from /admin; the API would refuse the export anyway (403).
    const res = await cu.evaluate(async () => {
      const r = await fetch("/admin/export/LOCATION_WISE?format=csv");
      return { url: r.url, type: r.headers.get("content-type") ?? "" };
    });
    assert(!res.type.includes("csv") && res.url.endsWith("/customer"), "customer got the export: " + JSON.stringify(res));
  });
} catch {
  // the failing step already recorded its message and screenshot
} finally {
  await browser.close();
  console.log(results.join("\n"));
  console.log(`\n${results.length - failures}/${results.length} steps passed. Test accounts: customer ${CUSTOMER.mobile}, collector ${COLLECTOR.mobile}.`);
  process.exit(failures ? 1 : 0);
}
