# RecycleConnect

Waste collection and recycling coordination platform (customers, collectors, admins).

## Start here in every session
0. If `docs/HANDOVER.md` exists, read it first: full context from the previous session, gotchas and exact next commands.
1. Read `docs/PROGRESS.md`: current phase, next action, step log.
2. Read `docs/DECISIONS.md` before changing direction on anything listed there.
3. After finishing a step, add a row to the step log in `docs/PROGRESS.md` and update "Where we are now". Record new decisions in `docs/DECISIONS.md`.

## Layout
- `backend/`: Spring Boot 4.1.1, Java 17. Use `./mvnw` (Maven is not installed globally).
- `frontend/`: Next.js 16 App Router + TypeScript. This Next.js has breaking changes; read `frontend/AGENTS.md` and `frontend/node_modules/next/dist/docs/` before writing Next code.
- `design/`: approved UI (design A "Sorted"). The visual reference for every screen; tokens in `design/shared/sorted.css`.
- `docs/`: brief (`requirements.pdf`), decisions, progress.

## Rules
- Secrets only in `backend/.env` (git-ignored). Never ask the user to paste credentials into chat.
- Free/open-source only: no paid maps, SMS, AI or payment services (brief §1, §29).
- Map tiles: OSM France HOT tiles, not tile.openstreetmap.org (see DECISIONS D5).
- Machine has little free RAM: don't start Docker; avoid running several dev servers at once.
- Copy for UI text follows the approved design's tone: plain, active voice, sentence case.
