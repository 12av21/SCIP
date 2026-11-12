# SCIP — Database Setup Guide

**Date:** 2026-11-11  
**Applies to:** Local development and isolated migration/verification only. **No production, Atlas, or existing external databases.**

## 1. Persistence modes

| Mode | Status | Use |
|---|---|---|
| **File-backed JSON (active runtime)** | **Default / operational** | `.scip_database.json` (or `SCIP_DB_PATH`) via `src/database/scipDatabase.ts` + atomic persistence |
| **MongoDB (Mongoose)** | **Prepared, not runtime-integrated** | Connection lifecycle/models/scaffold repo and migration tooling available; runtime remains JSON unless explicitly integrated and parity-verified |

> `DATABASE_DRIVER=mongo` currently falls back to JSON with explicit status/warning unless explicit integration flags and verified parity prerequisites are satisfied. This prevents silent split-brain.

## 2. Prerequisites

- Node.js >= 20, npm
- For MongoDB work: MongoDB Community Server installed and running locally (isolated), `mongosh` optional but recommended
- Project dependencies: `npm install`

## 3. Environment configuration

Create `.env` (gitignored) from `.env.example`. **Never commit secrets/URIs.**

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-with-a-strong-random-secret-at-least-32-chars

# Persistence
DATABASE_DRIVER=json                 # safe default/fallback
SCIP_DB_PATH=./.scip_database.json   # optional; tests/tools may override

# Isolated local MongoDB only (not Atlas/production/existing DB)
MONGODB_URI=mongodb://127.0.0.1:27017
# Target DB name used by migration tooling: scip_dev

# Safety flags (keep disabled in production)
ENABLE_DEV_DEMO_LOGIN=false
ENABLE_DEV_SEED=false
ENABLE_DEV_TESTS=false
```

**Validation/safety:** `src/database/mongoConnection.ts` refuses hosted/Atlas/unsafe URIs for this workflow, never logs `MONGODB_URI`/credentials, and reports connection status without leaking secrets.

## 4. Local MongoDB (isolated) setup

### 4.1 Verify installation/service (Windows)
- Service: `Get-Service -Name "*mongo*"` should show MongoDB running (e.g. service `MongoDB`, status `Running`).
- Port: local TCP `127.0.0.1:27017` reachable.
- Optional CLI: `mongod --version`, `mongosh --version`.

### 4.2 Create/use dedicated dev database
- Dedicated database: **`scip_dev`** (isolated local development only).
- No manual data seeding into existing app snapshot; use migration tooling from a **read-only snapshot** of `.scip_database.json` when approved.

### 4.3 Connectivity check (safe)
Use a non-destructive ping (example pattern, no data writes): connect Mongoose to `mongodb://127.0.0.1:27017/scip_dev` with short timeouts, run `db.admin().ping()`, then disconnect. Do not print URI/credentials.

## 5. Runtime startup

```bash
npm run dev      # development (Vite-integrated Express)
npm run build    # production client build
npm run start    # production-style server
```

Health/status: `GET /api/health` reports API/AI readiness and persistence state (`active/requested/runtimeIntegrated`, `mongoRepositoryIntegrated`, disk persistence, Mongo connection info sanitized).

## 6. JSON persistence safety

- Default file: `.scip_database.json` in project root (tracked state in this workspace context — **must not be modified/reset/migrated/overwritten**).
- Tests and tools must use isolated copies or `SCIP_DB_PATH` temp paths (e.g. `scripts/security-*.mts`, migration tool `--source` snapshot read-only).
- `data/db` must remain untouched unless explicitly approved (currently absent).

## 7. MongoDB integration status (important)

- **Models:** `src/database/models/*` (User, Department, Report, Incident, AuditLog, Notification, Feedback, Assignment, Inspection, Resolution, AIAnalysis, RiskScore).
- **Repository scaffold:** `mongoRepository.ts` implements guarded/read-oriented scaffolding; mutating/workflow/audit-chain/AI-parity operations are not runtime-safe/complete and throw explicit non-parity errors.
- **Runtime:** application continues using JSON-backed repository by default/fallback. **No automatic cutover.**
- **Cutover prerequisites:** full behavioral parity implementation, async-safe call paths, isolated parity tests, approved migration verification, backup/restore/rollback evidence, and explicit owner approval.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Mongo “not connected” | Service running, port 27017 open, `MONGODB_URI` points to isolated local instance, no Atlas/hosted URI |
| Driver shows fallback to JSON | Expected unless explicit integration + connection + parity gates satisfied |
| Health shows `mongoRepositoryIntegrated: false` | Expected current state (no runtime cutover) |
| Tests failing due to DB | Ensure isolated `SCIP_DB_PATH`/temp DB and `NODE_ENV=test`, `DISABLE_RATE_LIMIT=true` for HTTP suite as configured |

## 9. Evidence recorded (local isolated)

- MongoDB service running on `127.0.0.1:27017`; safe ping to `scip_dev` succeeded (no data writes).
- Isolated migration executed to `scip_dev` with idempotent upserts and verified counts/refs/audit chain (see `docs/DATABASE_MIGRATION_GUIDE.md`).
- `.scip_database.json` unchanged (`2026-11-09 15:30:38`, `159534` bytes).
