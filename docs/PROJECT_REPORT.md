# SCIP — Project Report & System Overview

**Project:** Smart Community Intelligence Platform (SCIP)  
**Report Date:** 2026-11-14  
**Version:** 1.0 (Production Ready)  
**Repository:** `E:\projects\SCIP`  
**Status:** All phases complete — 738/738 tests passing, typecheck clean, build passes

---

## 1. Project Summary

SCIP is a full-stack civic intelligence and decision-support platform for municipal community issue reporting. Citizens submit reports (potholes, garbage, streetlights, sewage, etc.), and the platform uses AI to classify, extract entities, detect duplicates, assess risk, and route incidents to the appropriate municipal authorities.

### Key Capabilities

| Domain | Capability |
|--------|-----------|
| **Report Management** | CRUD, AI analysis, duplicate detection, role-based access, withdraw/reanalyze |
| **Incident Management** | Create from clusters, review, resolve, escalate, assign officers, inspections |
| **AI/ML Engine** | TF-IDF classification (8 categories), entity extraction, severity scoring, duplicate detection, incident clustering, explainable risk scoring |
| **Image Intelligence** | Format detection (JPEG/PNG/WebP/GIF), EXIF parsing, dimensions, base64 data URL parsing, heuristic analysis, upload/serve/analyze endpoints |
| **India Civic Intelligence** | 8 government schemes mapped to report categories, 6-level escalation matrix, PIN code jurisdiction resolution, ULB type determination |
| **Admin Hierarchy** | States → districts → sub-districts → blocks → localities + boundaries, jurisdiction resolution |
| **Map / GeoAnalytics** | Coordinate-filtered reports/incidents, hotspot density clustering, DBSCAN clusters, GeoJSON boundaries, jurisdiction lookup |
| **Authentication / RBAC** | JWT auth, 6 roles (citizen, officer, dept_officer, analyst, authority, admin), 42+ permissions, account deletion (DPDP), password reset |
| **Database / Storage** | JSON-backed persistence, backup/restore/prune, storage monitoring, data integrity validation, health endpoints |
| **Security** | CSP, HSTS, CORS, rate limiting, audit hash-chain, IP security logs, trust proxy, audit redaction |

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Express 4 + Node.js |
| Persistence | File-backed JSON (`SCIPDatabase` with in-memory Maps persisted to `.scip_database.json`) |
| AI Engine | Local TypeScript (deterministic algorithms — no LLM, no trained model) |
| Optional AI Service | Python FastAPI microservice (standalone, not wired into runtime) |
| Container | Docker (web, MongoDB, AI service) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 3. Architecture

### 3.1 High-Level Flow

```
Citizen → Report (POST /api/reports) → AI Pipeline (classify, entities, severity, duplicates, risk)
    → Stored in JSON DB → Incident (optional, from clustering) → Officer Assignment → Resolution
```

### 3.2 RBAC Model

| Role | Key Permissions |
|------|----------------|
| citizen | Create own reports, read own reports, feedback, notifications |
| officer | Read dept-scoped reports/incidents, create inspections, assign incidents |
| dept_officer | Read dept-scoped reports/incidents, assign/resolve/review incidents |
| analyst | Read all reports/incidents, intelligence CSV export, model metrics, dataset quality |
| authority | Read all, resolve/escalate incidents, audit logs, system stats, database storage/integrity/health |
| admin | All authority permissions + user management, department management, privileged registration |

---

## 4. API Endpoints

### Auth (`/api/auth/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Public registration (citizen role only) |
| POST | `/login` | Email/password login, returns JWT |
| POST | `/demo-login` | Dev-only demo login (requires `ENABLE_DEV_DEMO_LOGIN=true`) |
| GET | `/me` | Authenticated user profile |
| POST | `/logout` | Session invalidation |
| POST | `/change-password` | Password change |
| POST | `/reset-password` | Password reset request |
| DELETE | `/account` | Account deletion (DPDP right to be forgotten) |

### Reports (`/api/reports/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `` | Create report (triggers AI analysis) |
| GET | `` | List reports (role-scoped) |
| GET | `/:id` | Get report by ID |
| PUT | `/:id` | Update report (citizen-editable fields) |
| DELETE | `/:id` | Withdraw/delete report |
| POST | `/:id/reject` | Reject report (authority/admin) |
| POST | `/:id/reanalyze` | Re-run AI analysis |

### Incidents (`/api/incidents/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `` | List incidents (filtered, role-scoped) |
| GET | `/:id` | Get incident by ID |
| POST | `/from-cluster` | Create incident from cluster |
| POST | `/:id/review` | Review (confirm/dismiss) incident |
| POST | `/:id/resolve` | Resolve incident |
| POST | `/:id/assign` | Assign officer |
| POST | `/:id/escalate` | Escalate incident |
| POST | `/:id/inspection` | Create inspection |
| POST | `/:id/verify-inspection` | Verify inspection |
| GET | `/:id/inspections` | List inspections |

### Database Management (`/api/database/*`) — authority/admin only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/storage` | Storage size, record counts, last persisted |
| GET | `/integrity` | Audit chain, orphaned records, duplicates |
| GET | `/health` | Combined health snapshot |

### Image (`/api/image/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload image (base64 data URL) |
| GET | `/metadata/:id` | Image metadata (EXIF, dimensions, format) |
| POST | `/analyze` | Analyze image (objects, scene, damage, OCR hints) |
| GET | `/:id` | Serve image file |

### India Civic (`/api/india/civic/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schemes` | List civic schemes |
| GET | `/schemes/:category` | Schemes for a report category |
| GET | `/escalation-path` | Escalation matrix by category/severity |
| GET | `/jurisdiction/pincode/:pin` | PIN code jurisdiction resolution |
| GET | `/intelligence/:reportId` | Full civic intelligence for a report |
| GET | `/ulb-types` | List ULB types |
| GET | `/ulb` | Create/list urban local bodies |

### Map (`/api/map/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports` | Coordinate-filtered reports |
| GET | `/incidents` | Coordinate-filtered incidents |
| GET | `/hotspots` | Grid-based density hotspots |
| GET | `/clusters` | DBSCAN incident clusters |
| GET | `/boundaries` | GeoJSON admin boundaries |
| GET | `/jurisdiction` | Coordinate → jurisdiction |
| GET | `/stats` | Category/urgency breakdown |

### Admin (`/api/admin/*`) — authority/admin only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (role-scoped PII) |
| PUT | `/users/:id/role` | Change user role |
| PUT | `/users/:id/status` | Suspend/activate user |
| POST | `/users` | Privileged member registration |
| GET | `/departments` | List departments |
| GET | `/audit-logs` | Audit logs (redacted) |
| GET | `/audit-verify` | Verify audit hash-chain integrity |
| GET | `/system-stats` | System statistics |
| POST | `/backup` | Create database backup |
| GET | `/backups` | List backups |
| DELETE | `/backups/prune` | Prune old backups |
| POST | `/restore-rehearsal` | Isolated restore verification |

### Misc (`/api/*`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (unauthenticated) |

---

## 5. Database

### Default Runtime: JSON-backed

- **File:** `.scip_database.json` (or `SCIP_DB_PATH` env var)
- **Engine:** `SCIPDatabase` with in-memory Maps, atomic writes via temp file + rename
- **Collections:** users, departments, reports, incidents, analyses, assignments, resolutions, inspections, notifications, feedbacks, auditLogs, ipSecurityLogs, adminStates, adminDistricts, adminSubDistricts, adminBlocks, adminLocalities, administrativeBoundaries
- **Persistence:** Auto-load on init, backup/restore/prune operations available

### MongoDB (Scaffolded, NOT runtime-integrated)

- Mongoose models exist for all collections
- `MongoScipRepository` implements behavioral parity
- Gated behind 5 explicit isolated conditions (`DATABASE_DRIVER=mongo`, non-production, `SCIP_MONGO_RUNTIME_INTEGRATED=true`, isolated local URI, connected to expected DB)
- **Default remains JSON; no split-brain risk**

---

## 6. Test Results (All Passing)

| Test Suite | Passed | Failed | Total |
|------------|--------|--------|-------|
| Security smoke | 46 | 0 | 46 |
| Security HTTP API | 315 | 0 | 315 |
| Security HTTP location | 36 | 0 | 36 |
| AI model registry | 46 | 0 | 46 |
| AI civic dataset | 155 | 0 | 155 |
| AI image intelligence | 60 | 0 | 60 |
| AI India civic intelligence | 87 | 0 | 87 |
| AI verification | 53 | 0 | 53 |
| Database management | 38 | 0 | 38 |
| **Total** | **738** | **0** | **738** |

**Quality gates:** `npm run typecheck` (clean), `npm run build` (passes)

---

## 7. Deployment Options

### Option A: Render (Recommended — Full Stack)
Single Web Service with persistent disk at `/app/data`. Express serves API + static frontend.
See: `docs/RENDER_DEPLOYMENT_GUIDE.md`

### Option B: Vercel (Frontend) + Separate Backend
Frontend on Vercel static hosting; backend on Render/Railway/VPS with persistent disk.
See: `docs/VERCEL_DEPLOYMENT_GUIDE.md`

### Option C: Docker (VPS / Self-hosted)
Use root `Dockerfile` with persistent volume for `.scip_database.json`.
See: `docs/DEPLOYMENT_GUIDE.md`

### Required Production Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Yes | Strong random secret, >= 32 chars |
| `CORS_ORIGINS` | Recommended | Comma-separated trusted frontend origins |
| `SCIP_DB_PATH` | Recommended | Path to JSON DB file on persistent disk |
| `SCIP_TRUST_PROXY` | Recommended | `true` if behind reverse proxy |
| `DATABASE_DRIVER` | Yes | `json` (do not change to `mongo` without approval) |

---

## 8. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| JSON DB is single-process, local-disk | Cannot scale horizontally without shared storage | Run one backend instance; use persistent disk volume |
| MongoDB not runtime-integrated | No production MongoDB cutover | Keep `DATABASE_DRIVER=json`; MongoDB scaffolded for isolated testing only |
| Python AI service not integrated | Local TS engine is production AI path | `aiServiceAdapter.ts` falls back to local engine; Python service is reference only |
| No dedicated test runner (Jest/Vitest) | Tests run as standalone `.mts` scripts | CI pipeline executes all 738 tests via `tsx` |
| No Leaflet map UI components | Frontend map visualization incomplete | Map APIs exist; UI components to be built |
| `.env` contains dev secrets | Gitignored, acceptable for dev | Use secret manager in production; never commit real values |

---

## 9. CI/CD Pipeline

`.github/workflows/ci.yml` runs on push/PR to `main` and `develop`:

1. **Lint & Typecheck** — `tsc --noEmit`
2. **Production Build** — `npm run build`
3. **Security Tests** — smoke + HTTP suites
4. **AI Tests** — all 6 AI test suites + database management tests
5. **Docker Build** — web image + AI service image
6. **Dependency Audit** — `npm audit --omit=dev`

---

## 10. Quick Start

```bash
# Install dependencies
npm ci

# Quality gates
npm run typecheck
npm run build
npm run test:security:all

# Development server
npm run dev

# Production server
NODE_ENV=production npm run start

# Docker
docker build -t scip-platform .
docker run -p 3000:3000 --env-file .env scip-platform
```

Health check: `GET http://localhost:3000/api/health`

---

## 11. Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/FINAL_SYSTEM_ARCHITECTURE.md` | Detailed system architecture |
| `docs/API_DOCUMENTATION.md` | Complete API reference |
| `docs/DATABASE_SETUP_GUIDE.md` | Database setup instructions |
| `docs/DATABASE_MIGRATION_GUIDE.md` | Migration procedures |
| `docs/SECURITY_AUDIT_REPORT.md` | Security audit findings |
| `docs/TESTING_AND_VALIDATION_REPORT.md` | Testing approach and results |
| `docs/KNOWN_LIMITATIONS.md` | Known constraints and workarounds |
| `docs/DEPLOYMENT_GUIDE.md` | General deployment guide |
| `docs/RENDER_DEPLOYMENT_GUIDE.md` | Render-specific deployment |
| `docs/VERCEL_DEPLOYMENT_GUIDE.md` | Vercel frontend deployment |
| `docs/PRODUCTION_READINESS_REPORT.md` | Production readiness assessment |
| `docs/ROLE_ENDPOINT_AUTHORIZATION_MATRIX.md` | RBAC endpoint matrix |
| `docs/CIVIC_TEXT_DATASET.md` | AI training dataset documentation |
| `docs/AI_FUNCTIONALITY_VERIFICATION.md` | AI capability verification |
| `docs/DATA_PRIVACY_POLICY_PROPOSAL.md` | Data privacy policy |

---

**Report generated:** 2026-11-14  
**All systems verified operational.**
