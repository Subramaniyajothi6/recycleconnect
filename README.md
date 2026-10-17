# RecycleConnect

A waste collection and recycling coordination platform for Chennai: customers book pickups of sorted recyclables,
admins review and schedule them, collectors run the pickups and record what they collected.

**Workflow:** material listing → collection request → acceptance → scheduling → pickup → weight recording →
collection confirmation → completion. Free and open-source only (no paid maps, SMS, AI or payments).

| Folder | What |
|--------|------|
| `backend/` | Spring Boot 4.1 (Java 17) REST API, PostgreSQL (Neon) with Flyway migrations |
| `frontend/` | Next.js 16 (App Router, React 19, TypeScript), the approved "Sorted" design |
| `e2e/` | Browser test of the whole workflow (puppeteer-core) |
| `design/` | Approved UI reference (`app.html`, `presentation.html`) |
| `docs/` | Brief, progress log, decisions, security, tests, extending, API |

## Run it

```bash
# 1. Backend: copy backend/.env.example to backend/.env and fill it in (database, JWT secret, first admin)
cd backend && ./mvnw spring-boot:run            # http://localhost:8080 (applies migrations on start)

# 2. Frontend: optional frontend/.env.local (see frontend/.env.example)
cd frontend && npm install && npm run dev        # http://localhost:3000
```

Sign in at `/login`. The first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`.
Customers and collectors register themselves; collectors wait for an admin to approve them.

## Check it

```bash
cd backend && ./mvnw test                                      # 34 API tests
cd frontend && npm run typecheck && npm run lint && npm run build
cd e2e && npm install && npm test                              # with both servers running
```

## Read next

- [`docs/PROGRESS.md`](docs/PROGRESS.md): what was built, step by step, and what's next
- [`docs/DECISIONS.md`](docs/DECISIONS.md): every decision and why
- [`docs/SECURITY.md`](docs/SECURITY.md): protections, trade-offs, go-live checklist
- [`docs/TESTING.md`](docs/TESTING.md): automated tests and the manual release checklist
- [`docs/EXTENDING.md`](docs/EXTENDING.md): changing the map, roadmap phases 2–8, scaling
- [`docs/API.md`](docs/API.md): every endpoint (for a future mobile app too)
