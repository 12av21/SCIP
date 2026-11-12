# SCIP — Final System Architecture

**Project:** Smart Community Intelligence Platform (SCIP)  
**Workspace:** `E:\projects\SCIP`  
**Date:** 2026-11-11  
**Status basis:** Repository/source inspection and recorded isolated validation evidence. No production runtime certification.

## 1. Purpose and design principles

SCIP transforms citizen observations into structured, reviewable municipal intelligence with explainable, human-governed AI assistance.

- **Human-in-the-loop:** AI outputs (classification, similarity, clusters, risk/priority, briefings) are advisory signals; authorized human review and decisions are required.
- **Least privilege & scoping:** JWT authentication, RBAC (6 roles), permission checks, ownership/department boundaries, and state guards in hardened paths.
- **Safety over convenience:** dev-only endpoints gated, in-process mutating runtime tests disabled, production-safe error handling, no silent backend cutover.
- **Data preservation:** existing `.scip_database.json` is treated as authoritative source snapshot; migrations/cutovers require explicit approval and isolated targets.

## 2. High-level topology

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Presentation (SPA)                                                          │
│ React 19 + TypeScript + Vite 8 + Tailwind CSS v4                            │
│ Leaflet maps, Recharts, Lucide, Motion                                      │
│ Role-aware views: Citizen / Officer / Dept Officer / Analyst / Authority /  │
│ Admin (dashboards, reports, incidents, inspections, intelligence, admin)    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS/HTTP REST + Bearer JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API & Application Layer (Node.js + Express 4 + TypeScript/tsx)              │
│ src/server/app.ts, server.ts                                                │
│ - Security headers, CORS allowlist, body limits, basic in-memory rate limit │
│ - AuthN/AuthZ middleware (JWT, sessionVersion, suspension/reset checks)     │
│ - Route modules: auth, reports, incidents, intelligence, admin, misc       │
│ - /api health, controlled dev endpoints (seed/tests disabled by policy)     │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
┌────────────────────────────────┐   ┌────────────────────────────────────────┐
│ Domain & Intelligence Engine   │   │ Persistence Abstraction (Phase 2)      │
│ src/database/scipDatabase.ts   │   │ src/database/index.ts                  │
│ (business logic, guards, AI    │   │  - JsonScipRepository (active default) │
│  orchestration, audit chain)   │   │  - MongoScipRepository (scaffold,      │
│ src/ai/* (local TS algorithms) │   │    not parity-integrated; explicit     │
└──────────────┬─────────────────┘   │    opt-in + connected + guarded)       │
               │                     │  - fallback to JSON if not ready       │
               ▼                     └──────────────┬─────────────────────────┘
┌────────────────────────────────┐                  │
│ Active Runtime Persistence     │                  │ (managed, non-integrated runtime)
│ File-backed in-memory engine   │                  ▼
│ + atomic JSON (.scip_database  │   ┌────────────────────────────────────────┐
│   .json / SCIP_DB_PATH)        │   │ MongoDB (isolated local scip_dev only) │
│ Default/fallback, authoritative│   │ Mongoose models + connection lifecycle │
└────────────────────────────────┘   │ Data loaded via approved migration      │
                                     │ (no runtime app cutover)               │
                                     └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Optional/auxiliary: Python FastAPI AI microservice (ai_service/main.py)     │
│ Endpoints: /health,/classify,/duplicate-check,/ner,/prioritize              │
│ Node adapter (src/ai/aiServiceAdapter.ts) falls back to local TS engine     │
│ Not required for core runtime; not integrated as authoritative pipeline     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. Component responsibilities

| Layer | Key files | Responsibility |
|---|---|---|
| Frontend | `src/App.tsx`, `src/components/**`, `src/context/**`, `src/services/apiClient.ts`, `src/types/scip.ts` | Role-aware UI, routing, auth/session handling, API consumption, map/analytics presentation, validation/status views |
| API server | `server.ts`, `src/server/app.ts`, `src/server/routes/*.ts`, `src/server/middleware/auth.ts` | HTTP API, authn/authz/RBAC, validation, scoping, workflow/state enforcement, response shaping, health/errors |
| Domain/data engine | `src/database/scipDatabase.ts`, `src/database/seedData.ts` | Entities, business rules, guards, notifications, assignments/inspections/resolutions, audit append/verify, AI orchestration hooks, JSON persistence |
| Persistence abstraction | `src/database/index.ts`, `repository.ts`, `jsonRepository.ts`, `mongoRepository.ts`, `mongoConnection.ts`, `models/*` | Driver selection (JSON default), safe fallback, Mongo lifecycle/health, schema scaffolding, explicit non-parity guards |
| AI/analytics | `src/ai/preprocessor.ts`, `tfidf.ts`, `classifier.ts`, `duplicateDetector.ts`, `incidentClustering.ts`, `riskScorer.ts`, `scipAgent.ts`, `aiServiceAdapter.ts` | Local explainable/algorithmic decision-support signals and metrics; optional external adapter fallback |
| Validation/migration | `scripts/security-smoke-test.mts`, `scripts/security-http-test.mts`, `scripts/mongo-migration-tool.mts`, `scripts/mongo-migration-execute.mts` | Isolated security tests and read-safe migration analysis/execution tooling |
| CI/docs | `.github/workflows/ci.yml`, `docs/*`, `README.md`, reports | Automated isolated checks and evidence-based documentation |

## 4. Authentication, authorization, and session model

- **Auth:** JWT bearer tokens (`Authorization: Bearer <token>`), bcrypt password hashing, production fail-closed `JWT_SECRET` validation.
- **Session controls:** `sessionVersion` (`sv`) revocation on sensitive events, suspension and `credentialsResetRequired` enforcement in hardened flows.
- **RBAC:** 6 roles (`citizen`, `officer`, `dept_officer`, `analyst`, `authority`, `admin`) with permission map and route-level guards; ownership/department/assignment scoping applied where implemented.
- **Confirmed privacy/governance (Option B, 2026-11-11):** admin full user directory vs authority reduced (no email/phone), audit logs retain `userEmail`/redacted `details` with masked IP + `detailCode`, `model-metrics` denied to authority, `dataset-quality`/`trends` allowed via `analytics.read` as implemented.

## 5. AI/ML architecture (decision support)

| Capability | Implementation (current) | Nature |
|---|---|---|
| Text preprocessing | Tokenization, normalization, stopwords, stemming, n-grams (`preprocessor.ts`) | Algorithmic/NLP |
| Vectorization & similarity | TF-IDF, cosine similarity, text/spatial/temporal duplicate signals (`tfidf.ts`, `duplicateDetector.ts`) | Statistical/algorithmic |
| Classification & extraction | Supervised centroid/keyword-assisted categorization, entity/hazard extraction (`classifier.ts`) | Rule/statistical (local) |
| Geospatial & clustering | Haversine distance, spatio-temporal DBSCAN-inspired clustering (`incidentClustering.ts`) | Algorithmic |
| Risk/priority | Explainable multi-factor scoring (`riskScorer.ts`) | Heuristic/explainable |
| Intelligence agent | Multi-tool orchestration/briefing (`scipAgent.ts`) | Orchestration of above signals |
| Metrics | Holdout-style evaluation, dataset quality heuristics (`scipDatabase` methods) | Development/diagnostic signals, not production ML certification |
| Optional microservice | FastAPI (`ai_service/main.py`) with adapter fallback (`aiServiceAdapter.ts`) | Auxiliary; local TS fallback available |

**No fabricated training datasets or production accuracy claims.** Outputs are probabilistic and require human verification.

## 6. Persistence and migration architecture

- **Active runtime:** file-backed in-memory JSON engine (atomic writes), configurable via `SCIP_DB_PATH` (default `.scip_database.json`). Single-process semantics.
- **MongoDB (prepared, not runtime-integrated):** Mongoose models (`src/database/models/*`), connection lifecycle/health, repository scaffold, and migration tooling. `DATABASE_DRIVER=mongo` falls back to JSON unless explicitly enabled and connected with parity prerequisites met.
- **Migration (approved isolated execution evidence):** `scripts/mongo-migration-execute.mts` performed read-only-source validation (SHA `262e382a…`, audit chain valid 67) and idempotent upsert load to isolated local `scip_dev` (`127.0.0.1:27017`) for 12 entity sets with `0` errors, matching source counts/refs; re-run idempotent (matched, no upserts). **Original `.scip_database.json` untouched. No runtime cutover.**

## 7. Security and operational controls (implemented in-repo)

- JWT fail-closed config (prod), bcrypt-only auth, session invalidation/suspension/reset enforcement.
- RBAC, ownership/department scoping, input validation/allowlists/state guards, PII minimization in hardened paths.
- Baseline security headers, env-allowlisted CORS, body size limits, in-memory single-process rate limiting, safe API errors/404s.
- Tamper-evident audit logging with read-only verification (canonical/legacy compatible); isolated tamper/restart/append tests.
- CI: typecheck, production build, isolated smoke/HTTP tests, dependency audit (`.github/workflows/ci.yml`).

## 8. Known architectural constraints

- Mongo runtime repositories and end-to-end behavior parity are incomplete; application runtime remains JSON-backed.
- Single-process JSON/rate-limit model; not horizontally scaled/distributed.
- Deployed CSP/CORS/proxy/TLS/runtime behavior and exhaustive e2e security proof not certified.
- FastAPI AI service and external model training/evaluation pipelines not integrated/certified as production ML.

## 9. Final acceptance status (architecture perspective)

| Status | Result | Notes |
|---|---|---|
| DEVELOPMENT COMPLETE | **NO** | Core implemented; runtime Mongo parity/integration, exhaustive hardening/tests/docs sign-off incomplete |
| DATABASE MIGRATION VERIFIED | **PARTIAL** | Isolated snapshot→`scip_dev` load verified (counts/refs/audit/idempotent); no runtime parity/cutover |
| SECURITY VERIFIED | **NO** | Strong isolated evidence (361 assertions) but not exhaustive/runtime-certified |
| PRODUCTION READY | **NO** | Blockers remain (see `docs/KNOWN_LIMITATIONS.md`, `docs/SECURITY_AUDIT_REPORT.md`) |
