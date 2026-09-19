# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A guest check-in / billing system for a hostel ("hostal"), replacing what used to be an Excel workbook (sheets "REGISTRO", "HABITACIONES", "DISPONIBILIDAD", "HISTORIAL"). Two independent apps in one repo:

- `hostal-backend/` — NestJS + TypeORM API.
- `hostal-frontend/` — Angular 21 (standalone components, signals, no router — a single `tabActiva` signal switches views in [app.ts](hostal-frontend/src/app/app.ts)/[app.html](hostal-frontend/src/app/app.html)).

Code comments, entity/field names, commit messages, and UI copy are in Spanish. Match that when adding to existing files.

## Commands

Backend (`cd hostal-backend`):
- `npm run start:dev` — dev server w/ watch, SQLite at `hostal.sqlite` (auto-created, `synchronize: true`), no `APP_KEY` needed.
- `npm run build` / `npm run start:prod`
- `npm run lint` — eslint --fix
- `npm run test` — unit tests (jest); single file: `npm run test -- habitaciones.service.spec.ts`
- `npm run test:e2e`
- Migrations (Postgres only — see below): `npm run migration:generate src/migrations/NombreMigracion`, `npm run migration:run`, `npm run migration:revert`. These require a `.env` with `DATABASE_URL` (copy `.env.example`).

Frontend (`cd hostal-frontend`):
- `npm start` / `ng serve` — dev server at `localhost:4200`, talks to backend at `localhost:3000`.
- `npm run build`
- `npm test` — Vitest.

## Architecture

### Two DB modes, one entity list

[app.module.ts](hostal-backend/src/app.module.ts) picks the TypeORM connection based on whether `DATABASE_URL` is set:
- **Not set (local dev):** `better-sqlite3`, `synchronize: true`. Zero-friction — no migrations needed.
- **Set (production, Render + Neon/Supabase):** Postgres, `synchronize: false`, `migrationsRun: true`. Schema changes **must** go through a versioned migration in `src/migrations/` — never rely on synchronize in prod.

Both connections and the standalone [data-source.ts](hostal-backend/src/data-source.ts) (used only by the TypeORM CLI to generate/run migrations) import the same entity list from [database.entities.ts](hostal-backend/src/database.entities.ts) so they can't drift apart.

### Auth: shared API key, not user auth

There's no login/roles/sessions. [ApiKeyGuard](hostal-backend/src/common/api-key.guard.ts) is applied globally in `main.ts` and checks the `x-api-key` header against `APP_KEY`. If `APP_KEY` is unset, the guard passes everything through (local dev). In production it must always be set, or the API is wide open. The frontend's [AuthService](hostal-frontend/src/app/core/services/auth.service.ts) stores the key in `localStorage` and [api-key.interceptor.ts](hostal-frontend/src/app/core/interceptors/api-key.interceptor.ts) attaches it to every request to the API origin, logging out locally on a 401. `REQUIERE_CLAVE`/`API_URL` come from `core/config/api.config.ts`, which Angular swaps for `api.config.prod.ts` on production builds via `fileReplacements` in `angular.json` — local dev never requires the key.

### Hostel timezone vs. server timezone

The hostel operates on Mexico City time (UTC-6, fixed, no DST since 2022), but the server (Render) runs in UTC. All date logic that means "noon at the hostel" or "midnight at the hostel" **must** go through [common/zona-horaria.ts](hostal-backend/src/common/zona-horaria.ts) (`medioDiaHostal`, `medianocheHostal`, `fechaYMDHostal`) rather than plain `Date`/`setHours`/`getMonth`, which read the server's local (UTC) time and silently shift results by 6 hours. This file documents a real bug that was fixed this way — check it before touching checkout timing, report date ranges, or renewal date math.

### Domain model — three core entities

- **Habitacion** (room): `piso`/`numero`/`camasTotales`. Occupied/available beds are never stored — [HabitacionesService](hostal-backend/src/habitaciones/habitaciones.service.ts) computes them on the fly by summing `camasSolicitadas` of open (`cerrado: false`) registros that are still VIGENTE or renewed (`renovar: SI`).
- **Registro** (an active stay): one row per guest stay, open until checkout. `status` (VIGENTE/PENDIENTE/RENOVADO/NO) is never a column — [RegistrosService.calcularStatus](hostal-backend/src/registros/registros.service.ts) derives it live from `checkOutEstimado` vs. now and the `renovar` field, mirroring the old Excel formula. `checkOutEstimado` always has its time normalized to noon hostel time regardless of what date is picked — that's the uniform cutoff used for "PENDIENTE", auto-releasing beds, and suggesting a late checkout fine.
- **Historial**: a ledger, not a final summary row. Every billable event (CHECK_IN, RENOVACION, COBRO_EXTRA, CHECKOUT) writes its own row dated the day it actually happened, so daily/monthly/annual reports reflect income when it was charged, not when the guest eventually leaves. `registroOriginalId` links all rows of one stay.
- **Ingreso**: one row per payment method per Historial event (so "$1000 half cash half card" is representable). `concepto` (HOSPEDAJE/MULTA/COBRO_EXTRA) is independent of `metodoPago`. Reports sum from `Ingreso`, not `Historial.totalCobrado`, specifically to handle split payments correctly.

Registro→Historial→Ingreso writes always happen together inside one `dataSource.transaction(...)` in [registros.service.ts](hostal-backend/src/registros/registros.service.ts) — check-in, renewal, extra charge, and checkout each follow this pattern (create/update Registro, write a Historial row, write one Ingreso row per payment line). Follow it when adding new billable actions instead of writing to one entity without the others.

`pagos`/`metodoPago` DTOs are being migrated from a single payment method per event to a list of payment lines (`resolverPagos` in registros.service.ts reconciles both shapes); new code should prefer the `pagos` array shape.

### Reports

[HistorialService](hostal-backend/src/historial/historial.service.ts) provides `reporteDiario` (raw ledger rows + summary for a date range — the "corte de caja"), `reporteMensual`, and `reporteAnual` (always returns all 12 months, even empty, so charts have consistent bars). All three group by `fechaEvento`/`fecha` (when the money was actually charged), using `medianocheHostal`/`fechaYMDHostal` for date boundaries — never raw `Date` arithmetic.
