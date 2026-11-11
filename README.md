# SCIP — Smart Community Intelligence Platform

> AI-assisted municipal community intelligence and decision-support platform for transforming citizen observations into structured, reviewable operational intelligence.

SCIP is designed to correlate citizen-submitted reports, apply explainable analytical signals (classification, similarity, clustering, risk/trend indicators), and support human-led review and response workflows. It is **not** a fully autonomous decision system.

---

## 1. What SCIP Does

- **Citizen reporting:** submit, view, track, update (where allowed), and withdraw community observations/reports.
- **AI-assisted analysis (decision support):** preprocess text, classify/category-score, extract entities/hazards, compute similarity/duplicate signals, detect spatio-temporal clusters, estimate explainable risk/priority indicators, and generate intelligence briefings.
- **Human-in-the-loop operations:** authorities/officers review evidence, confirm/dismiss/review incidents, assign/escalate/resolve, and record inspections/verification notes according to role permissions.
- **Governance & visibility:** role-based dashboards/views, notifications/feedback flows, audit logging and integrity verification endpoints (permission-gated), and intelligence/analytics exports (scoped and PII-minimized in hardened paths).
- **Safe validation posture:** in-process mutating runtime test execution is disabled; validation is performed via isolated automated test suites and CI.

### Responsible AI principle (inviolable)
1. **A report is an observation** submitted by a citizen/user.
2. **An AI-generated incident/cluster/signal is an analytical interpretation**, not ground truth.
3. **AI recommendations do not replace human authority.** Human review, field verification, and authorized administrative decisions are required before operational actions/work orders.

AI outputs are probabilistic and may be incomplete or incorrect.

---

## 2. Current Implementation Status (high-level)

| Area | Status |
|---|---|
| Core app (React + Express + TypeScript), role-based UI/API, report/incident/intelligence/admin flows | Implemented (hardened in key paths) |
| Auth/session/RBAC hardening, input validation, scoping/PII minimization, audit improvements, endpoint lockdown, isolated tests | Substantially implemented and validated in isolated environments (not exhaustively proven) |
| AI/ML analytics (TF-IDF, classification, similarity/duplicate, clustering, risk, agent, metrics) | Implemented as local/heuristic decision support (not certified production ML) |
| Persistence runtime migration to integrated MongoDB repositories + data migration/cutover | **Not completed / blocked** (design documented; runtime remains file-backed) |
| End-to-end production/security certification | **Not completed** (`NOT SECURITY VERIFIED / NOT PRODUCTION READY`) |

See **`PROJECT_STATUS_REPORT.md`** for detailed completed vs not-completed items and evidence.

---

## 3. Technology Stack

### Frontend
- React 19, TypeScript, Vite 8
- Tailwind CSS v4, Lucide icons, Recharts, Leaflet, Motion

### Backend
- Node.js, Express 4, TypeScript (`tsx`)
- JWT (`jsonwebtoken`), password hashing (`bcryptjs`)
- Mongoose models/connection scaffolding present (not runtime-integrated)

### Persistence (current runtime)
- **Active:** file-backed in-memory database with atomic JSON persistence (`src/database/scipDatabase.ts`)
- **Default file:** `.scip_database.json` (configurable via `SCIP_DB_PATH`)
- **MongoDB:** schema/connection code exists, but runtime repository integration, migration, parity verification, and cutover are **not active**. See `docs/PERSISTENCE_MIGRATION_DESIGN.md`.

### AI/ML & analytics (decision support)
- NLP preprocessing: tokenization, stopword filtering, stemming, n-grams (`src/ai/preprocessor.ts`)
- TF-IDF vectorization and cosine similarity (`src/ai/tfidf.ts`)
- Category classification and entity/hazard extraction (`src/ai/classifier.ts`)
- Duplicate/related-report detection using text, spatial, temporal signals (`src/ai/duplicateDetector.ts`)
- Geospatial distance (Haversine)
- Spatio-temporal DBSCAN-inspired clustering (`src/ai/incidentClustering.ts`)
- Explainable multi-factor risk scoring / priority indicators (`src/ai/riskScorer.ts`)
- Multi-tool intelligence agent/orchestration (`src/ai/scipAgent.ts`)
- Classifier evaluation (holdout-style metrics) and dataset-quality signals (`scipDatabase` analytics methods; heuristic, not certification)

---

## 4. Roles and Access Model

Supported roles: `citizen`, `officer`, `dept_officer`, `analyst`, `authority`, `admin`.

Access is enforced via JWT authentication + role/permission checks and, where applicable, ownership/department/scoping rules.

Typical capabilities (high level):
- **Citizen:** create and manage own reports (within allowed states), view own data/notifications, submit feedback (scoped).
- **Officer / Field roles:** access/act on assigned or department-scoped records per permissions (e.g. inspections/report handling where authorized).
- **Dept officer:** department-scoped incident/report operations, review/assignment/escalation/inspection verification per permissions and boundaries.
- **Analyst:** read analytics/intelligence and scoped data; PII-minimized views/exports in hardened paths; limited mutation permissions.
- **Authority:** governance/oversight actions (review/resolve/escalate/exports/audit access as permitted).
- **Admin:** administrative management, audit/system endpoints, and highest operational permissions (subject to implemented guards).

> Exact permissions and endpoint behavior are implemented in `src/server/middleware/auth.ts` and route handlers; not every role×endpoint×state combination is exhaustively certified.

---

## 5. Key Features & Modules

### 5.1 Authentication & session security
- Registration (public self-registration restricted to `citizen`; privileged roles require authorized provisioning)
- Login/logout, current user (`/me`), profile update, password change, safe reset-request workflow
- JWT-based auth with fail-closed production secret validation (`JWT_SECRET` required, minimum length in prod)
- Session revocation/version checks, suspension and credential-reset enforcement in hardened flows
- Development-only demo login is opt-in and disabled in production

### 5.2 Reports
- Create/read/update/delete/withdraw/report workflows with validation and authorization/scoping
- AI analysis/reanalysis support for reports (decision support)
- Ownership and role/department scoping; PII minimization for restricted roles in hardened responses

### 5.3 Incidents & inspections
- Incident listing/detail access with scoping rules (citizen linkage, officer/department boundaries, privileged roles)
- Cluster-to-incident creation flow (permission/validation guarded)
- Review, assignment, escalation, resolution, inspection submission, and inspection verification workflows with state/permission/validation guards (as implemented)
- Linked evidence/reports handling with scoped access

### 5.4 Intelligence & analytics
- Agent query endpoint, clusters/hotspots/trends, model metrics, dataset quality, and CSV export endpoints
- Exports scoped/validated; report export omits citizen PII for analyst role in hardened implementation; CSV formula neutralization applied
- Intelligence outputs include uncertainty/responsible-use framing where implemented

### 5.5 Administration, audit, and misc
- User listing/role/status management, departments, system stats, audit logs, audit integrity verification (permission-gated)
- Notifications and feedback endpoints with auth/validation/ownership checks (as implemented)
- Health endpoint; dev seed/test endpoints locked down by environment/role/flags and safety checks

### 5.6 Frontend application
- Government-style UI with role-aware navigation/dashboards/views for citizens, officers, analysts, authority/admin
- Views include: landing/about, submit/track/my reports, intelligence/incident/investigation/map/trends/agent, admin, department/operations dashboards, and validation/audit status view
- In-app “run mutating audit” removed/disabled in favor of isolated validation guidance

---

## 6. API Overview

Base path: `/api` (JSON responses). Authentication uses `Authorization: Bearer <token>` for protected endpoints.

### Auth (`/api/auth`)
- `POST /register` — register citizen account
- `POST /login` — authenticate
- `POST /demo-login` — **dev-only, opt-in** (`ENABLE_DEV_DEMO_LOGIN=true`, non-production); otherwise disabled
- `GET /me` — current authenticated user (sanitized)
- `POST /logout` — invalidate session
- `POST /change-password` — authenticated password change
- `PUT /profile` — authenticated profile update
- `POST /reset-password` — safe reset request flow

### Reports (`/api/reports`)
- `GET /` — list reports (scoped/filtered)
- `POST /` — submit report
- `GET /:id` — report detail (scoped, role-aware sanitization)
- `PUT /:id` — update (role/state/allowlist constrained)
- `DELETE /:id` — withdraw/delete per rules
- `POST /:id/reject` — reject (authorized roles/workflow)
- `POST /:id/reanalyze` — re-run AI analysis (authorized)

### Incidents (`/api/incidents`)
- `GET /` — list incidents (scoped/filtered)
- `GET /:id` — incident detail with scoped linked data
- `POST /from-cluster` — create incident from cluster (authorized/validated)
- `POST /:id/review` — human review action
- `POST /:id/assign` — assignment workflow
- `POST /:id/escalate` — escalation workflow
- `POST /:id/resolve` — resolution workflow
- `POST /:id/inspection` — submit inspection (authorized)
- `GET /:id/inspections` — list inspections (authorized/scoped)
- `POST /:id/verify-inspection` — verify inspection (authorized)

### Intelligence (`/api/intelligence`)
- `POST /agent` — intelligence agent query
- `GET /clusters` — clustering results (scoped)
- `GET /hotspots` — hotspot analysis (scoped)
- `GET /trends` — trend analytics
- `GET /model-metrics` — classifier/model evaluation metrics (permission-gated)
- `GET /dataset-quality` — dataset quality signals (permission-gated)
- `GET /export-csv` — scoped export (`type=reports|incidents`; invalid type rejected)

### Admin (`/api/admin`)
- `GET /users`, `PUT /users/:id/role`, `PUT /users/:id/status`
- `GET /departments`
- `GET /audit-logs`, `GET /audit-verify`
- `GET /system-stats`

### Misc (`/api`)
- `GET /health`
- `GET/PUT/POST` notifications endpoints (authenticated, scoped)
- `POST /feedback` (authenticated, validated/scoped)
- `POST /seed` — **dev-only, admin-only, opt-in, refuses when persisted DB exists**; disabled in production
- `POST /tests/run` — **disabled** (safety control; use isolated automated suites)

> Endpoint behavior, permissions, and validation are implemented in `src/server/routes/*`. Refer to source for authoritative details.

---

## 7. Repository Structure (key paths)

```text
.
├─ src/
│  ├─ ai/                     # Preprocessing, TF-IDF, classifier, similarity, clustering, risk, agent
│  ├─ components/             # UI components, layouts, views, map/theme
│  ├─ context/                # Auth/theme/language providers
│  ├─ database/               # scipDatabase (active runtime), mongo connection/models (scaffolding)
│  ├─ server/                 # Express app, middleware, route modules
│  ├─ services/               # API client and shared services
│  ├─ types/                  # Shared domain types
│  ├─ App.tsx, main.tsx       # Frontend entry/app shell
├─ scripts/
│  ├─ security-smoke-test.mts # Isolated DB/RBAC/audit/workflow smoke tests
│  └─ security-http-test.mts  # Isolated HTTP integration tests
├─ docs/
│  ├─ SECURITY_REMEDIATION_REPORT.md
│  └─ PERSISTENCE_MIGRATION_DESIGN.md
├─ .github/workflows/ci.yml   # CI: typecheck, isolated tests, prod audit
├─ server.ts                  # Server entry
├─ README.md
├─ PROJECT_STATUS_REPORT.md
├─ DEPLOYMENT.md
└─ .env.example
```

---

## 8. Setup & Local Development

### Prerequisites
- Node.js >= 20
- npm (or compatible package manager)

### Install
```bash
npm install
```

### Configure environment
Create `.env` from `.env.example` and set values appropriate for your environment.

Important variables (see `.env.example` / `DEPLOYMENT.md`):
- `PORT` (default dev: 3000)
- `NODE_ENV` (`development` / `test` / `production`)
- `JWT_SECRET` (**required in production; strong secret, >= 32 chars**)
- `SCIP_DB_PATH` (optional path for file-backed DB; useful for isolated environments)
- `CORS_ORIGINS` (comma-separated allowlist, if needed)
- `DISABLE_RATE_LIMIT` (`true` only for isolated tests)
- `ENABLE_DEV_DEMO_LOGIN`, `ENABLE_DEV_SEED`, `ENABLE_DEV_TESTS` (development-only opt-ins; keep disabled in production)
- `MONGODB_URI` (present for scaffolding/future integration; runtime persistence is not migrated)

**Never commit real secrets, tokens, or production `.env` files.**

### Run (development)
```bash
npm run dev
```
Starts the Express server (Vite-integrated dev flow). Open: `http://localhost:3000`

### Build & run (production-style)
```bash
npm run build
npm run start
```

### Useful scripts
```bash
npm run typecheck
npm run lint          # alias to typecheck (tsc --noEmit)
npm run test:security
npm run test:security:http
npm run test:security:all
npm run build
```

---

## 9. Testing, Validation, and CI

- **Isolated security smoke tests (`scripts/security-smoke-test.mts`):** temp DB (`SCIP_DB_PATH`), RBAC/workflow guards, audit integrity and tamper-detection on isolated copies, session invalidation helpers, etc.
- **Isolated HTTP integration tests (`scripts/security-http-test.mts`):** temp DB + ephemeral localhost server + test secrets, authn/authz/RBAC, scoping/PII minimization, validation, workflow/state boundaries, headers/lockdowns, etc.
- **CI (`.github/workflows/ci.yml`):** typecheck, isolated smoke tests, isolated HTTP tests, and production dependency audit.

Latest recorded isolated validation evidence (see `PROJECT_STATUS_REPORT.md` / remediation report): **`npm run typecheck` PASS**, **`test:security` 40/40**, **`test:security:http` 307/307** (**347 total assertions**), **`npm run build` PASS** (at time of last recorded run).

> Passing isolated tests does **not** by itself constitute production/security certification.

---

## 10. Security Notes (implemented hardening highlights)

- Fail-closed JWT configuration checks in production; bcrypt-only credential verification
- Session invalidation/versioning support, suspension and credential-reset enforcement (hardened paths)
- RBAC/permission middleware and route-level guards; ownership/department scoping in key workflows
- Input validation, allowlists, length/type checks, and guarded state transitions in hardened endpoints
- PII minimization in selected responses/exports (e.g. analyst report/intelligence views in hardened paths), auth/user response sanitization
- Audit logging with canonical append/verification utilities; integrity checks and tamper detection validated on isolated fixtures
- Security headers, env-allowlisted CORS, basic in-memory rate limiting (single-process), safe API 404/error handling, dev endpoint lockdowns

### Known limitations / open items
- Runtime persistence migration/cutover (Mongo) not performed (blocked/design-only)
- Not an exhaustive role×endpoint×state security proof; some policy decisions pending (e.g. audit-log actor detail exposure, aggregate metrics scope)
- Distributed rate limiting, production CSP/runtime fit validation, complete logging/PII review, and comprehensive e2e/operator controls pending
- **Overall status:** `NOT SECURITY VERIFIED / NOT PRODUCTION READY`

---

## 11. Deployment Notes

- See `DEPLOYMENT.md` for environment, Docker/VPS/Cloud Run guidance and security configuration notes.
- Current runtime persistence is file-backed (`.scip_database.json` or `SCIP_DB_PATH`); treat it as single-process unless/until a fully integrated, verified multi-instance datastore migration is completed.
- Do not enable dev-only flags (`ENABLE_DEV_DEMO_LOGIN`, `ENABLE_DEV_SEED`, `ENABLE_DEV_TESTS`) in production.

---

## 12. Documentation

- `PROJECT_STATUS_REPORT.md` — consolidated **completed vs not completed** status, evidence, blockers, and decisions
- `docs/SECURITY_REMEDIATION_REPORT.md` — detailed remediation history, findings, fixes, and validation evidence
- `docs/PERSISTENCE_MIGRATION_DESIGN.md` — Phase 6 persistence migration design (no runtime migration performed)
- `DEPLOYMENT.md` — deployment and operations guidance

---

## 13. License / Usage

No explicit license file was detected in the repository at the time of this README update. Confirm licensing/usage terms with the project owner before redistribution or production use.
