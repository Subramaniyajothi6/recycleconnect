# RecycleConnect: Security

What protects the app today, why, and what to do before and after going live. Brief §26 is the baseline:
authentication, role-based access, customers see only their own requests, collectors see only assigned work,
contact and location data only for authorised people, and a history of important actions.

## 1. How a request is checked (defence in depth)

```
Browser ──► Next.js (frontend) ──────────────► Spring Boot API (backend) ──► PostgreSQL
            1. proxy.ts: optimistic role      3. JWT signature, issuer, expiry
               redirect from cookie           4. ActiveAccountFilter: account exists, not blocked,
            2. Server Action / page reads        token version matches, pending collectors fenced
               the httpOnly cookie, sends      5. URL rule: /api/admin, /api/collector, /api/customer by role
               the token server-to-server     6. Service: ownership of every record (customer owns request,
                                                 collector is assigned to pickup), state machine
                                              7. Validation of every input; audit log of every change
```

No single layer is trusted alone. The browser never holds the token, so even a script injected into the page
can't steal it. The API repeats every check, so a bug in the frontend can't expose data.

## 2. What is in place

| Area | Measure | Where |
|------|---------|-------|
| Passwords | BCrypt cost 12; 8–72 characters; never logged or returned | `SecurityConfig`, `AuthService` |
| Sign-in abuse | 5 failed attempts per account per 15 min, 30 attempts per IP, 10 sign-ups per IP per hour; same response time for unknown accounts | `RateLimiter`, `AuthService` |
| Sessions | JWT (HS256, 12 h, issuer-checked) in an **httpOnly, SameSite=Lax, Secure (prod)** cookie; the browser's JavaScript can't read it | `lib/session.ts`, `SecurityConfig` |
| Revocation | Every token carries a version. Password change, block, deactivate or rejection bumps it: all old tokens stop working on the next request | `User.tokenVersion`, `ActiveAccountFilter` |
| Blocked accounts | Checked on every API call, not just at sign-in | `ActiveAccountFilter` |
| Roles | URL rules by role + ownership checks in every service method; unknown or someone else's records return 404 (no hint that they exist) | controllers, services |
| Collectors awaiting approval | Can only see their own account, notifications and ID-proof upload | `ActiveAccountFilter.PENDING_ALLOWED` |
| Privacy (brief §26) | Phone numbers masked in lists (`+91 98••• ••345`). Collector sees a customer's number only while the pickup is in progress; customer sees the collector's the same way. Opening a full customer record is audited. | `RequestViews`, `AdminUserService` |
| Status integrity | Request and pickup statuses can only move along the state machines; completed requests are read-only; optimistic locking stops two admins overwriting each other | `RequestStatus`, `PickupStatus`, `@Version` |
| Input | Bean Validation on every body with field-level messages; IDs and dates parsed strictly; search text escaped for `LIKE`; all SQL parameterised | DTOs, `AdminRequestService.likeEscape` |
| Uploads | Type checked by **file content** (JPEG/PNG/WebP, PDF for ID), size limit from settings, random file names, stored outside the web root, served only through an authorised endpoint with `nosniff` and `no-store` | `UploadValidator`, `LocalFileStorage`, `FileController` |
| Exports | CSV cells that start with `= + - @` are prefixed so spreadsheets don't run them as formulas; every export is audited | `ReportService.csv` |
| Headers (API) | `Content-Security-Policy: default-src 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, no stack traces or error details in responses | `SecurityConfig`, `application.properties` |
| Headers (site) | CSP (self only; images also from the map tile host), frame-ancestors none, `nosniff`, referrer and permissions policy, HSTS + upgrade when `HTTPS=true`, no `X-Powered-By` | `frontend/next.config.ts` |
| CSRF | Server Actions check the request origin (Next.js); the API takes bearer tokens only, no cookies | framework |
| Secrets | Only in `backend/.env` (git-ignored); first admin created from `.env`, never in code or git | `.gitignore`, `AdminBootstrap` |
| Audit | Append-only log of sign-ins, registrations, every status change, settings changes, approvals, blocks, exports, record views; searchable and exportable | `AuditService`, Admin → Audit log |
| Dependencies | `npm audit --omit=dev`: 0 known vulnerabilities (2026-10-08); only free/open-source libraries | |

## 3. Known trade-offs

- **CSP allows inline scripts** (`'unsafe-inline'`) so pages keep their fast static shells (the Next.js nonce
  approach makes every page dynamic). Risk is limited because React escapes all text and the app never renders
  user-provided HTML. To tighten later, follow the Next.js "nonces" or "SRI" guide in `node_modules/next/dist/docs`.
- **Rate limits and the settings cache live in memory**: right for one backend instance. With several instances,
  move them to a shared store (see `EXTENDING.md` §4).
- **Tests run against the dev database** (rolled back). Use a separate Neon branch for CI (see `TESTING.md`).

## 4. Before going live (checklist)

1. Serve both apps over **HTTPS only**; set `HTTPS=true` for the frontend build (turns on HSTS).
2. Generate a new `JWT_SECRET` (64+ random characters) and a new `ADMIN_PASSWORD` in the production `.env`;
   never reuse the development ones. Sign in and change the admin password once.
3. Set `FRONTEND_ORIGIN` to the real site address and `TRUSTED_PROXIES` to the address of the Next.js server
   (or load balancer) only.
4. Use a production database user with only the rights it needs; keep Neon's point-in-time restore on.
5. Put `UPLOAD_DIR` on a disk that is backed up (or switch to object storage, `EXTENDING.md` §3).
6. Set up email (`MAIL_HOST` etc.) with a free SMTP service and turn email on in Settings, so password-related
   and complaint messages reach people.
7. Turn on log collection for the backend; alert on repeated `429` (rate limit) and `SIGN_IN` bursts.
8. Run `npm audit --omit=dev` and `./mvnw dependency:tree` monthly; update Spring Boot and Next.js patch releases.
9. Review the audit log weekly for `SET_USER_STATUS`, `CHANGE_SETTING`, `EXPORT_REPORT`, `VIEW_CUSTOMER`.

## 5. Ideas for more security later

- Two-step sign-in for admins (time-based codes; free libraries exist for Java).
- Password reset by email link (needs email set up; see DECISIONS P10).
- Shorter admin sessions (e.g. 4 hours) with a separate expiry setting.
- Virus scanning of uploads with ClamAV (free) before storing.
- A web application firewall in front of the site if it is exposed to heavy traffic.
