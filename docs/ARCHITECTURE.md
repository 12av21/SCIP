# SCIP — System Architecture

**Project:** Smart Community Intelligence Platform (SCIP)  
**Version:** 1.0 (Production Ready)  
**Date:** 2026-11-14  
**Status:** Accurate description of the implemented system

---

## 1. Architecture Overview

SCIP is a full-stack civic intelligence and decision-support platform for municipal community issue reporting. The architecture follows a clean separation between frontend, backend API, database/repository layer, authentication/authorization, AI/ML service, file storage, and notification service.

### 1.1 High-Level Data Flow

```
Citizen → Report (POST /api/reports) → AI Pipeline (classify, entities, severity, duplicates, risk)
    → Stored in JSON DB → Incident (optional, from clustering) → Officer Assignment → Resolution
    → Citizen notified → Feedback collected
```

### 1.2 Component Boundaries

| Boundary | Responsibility | Technology |
|----------|---------------|------------|
| Frontend Application | UI, state management, API consumption | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend API | REST endpoints, auth, RBAC, business logic | Express 4 + Node.js + TypeScript |
| Database/Repository | Persistent storage, backup, integrity | JSON file-backed (`SCIPDatabase`) + MongoDB scaffolded (gated) |
| Authentication/Authorization | JWT, RBAC, session management | JWT + bcrypt + role-permission matrix |
| AI/ML Service | Classification, entities, severity, risk, clustering | Local TypeScript engine + optional Python FastAPI |
| File Storage | Image upload, metadata, analysis | Local filesystem + base64 data URLs |
| Notification Service | Audit logs, IP security logs | In-app audit chain + IP security event logging |

---

## 2. Frontend Architecture

### 2.1 Technology Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Maps:** Leaflet (with `@types/leaflet`)
- **Charts:** Recharts
- **State:** React Context API (Auth, Theme, Language)
- **HTTP Client:** Custom typed `APIClient` class (`src/services/apiClient.ts`)

### 2.2 Directory Structure

```
src/
├── App.tsx                 # Master application shell with tab-based routing
├── main.tsx                # Entry point
├── index.css               # Global styles
├── types/scip.ts           # TypeScript type definitions
├── context/
│   ├── AuthContext.tsx     # Authentication + permission hooks
│   ├── ThemeContext.tsx    # Theme management
│   └── LanguageContext.tsx # i18n (EN/HI)
├── components/
│   ├── layout/             # GovernmentUtilityBar, GovernmentHeader, etc.
│   ├── map/                # Map components
│   ├── theme/              # Theme components
│   └── views/              # 21 view components (dashboards, forms, modals)
├── services/
│   └── apiClient.ts        # Centralized typed API client
├── ai/
│   ├── classifier.ts       # TF-IDF classification, entity extraction, severity
│   ├── tfidf.ts            # Vectorizer
│   ├── preprocessor.ts     # Text preprocessing
│   ├── duplicateDetector.ts
│   ├── incidentClustering.ts
│   ├── riskScorer.ts
│   ├── scipAgent.ts        # Intelligence agent with 10 tools
│   ├── imageIntelligence.ts
│   ├── modelRegistry.ts
│   ├── civicDataset.ts
│   ├── datasetManager.ts
│   ├── indiaCivicIntelligence.ts
│   └── aiServiceAdapter.ts
├── database/
│   └── (database types)
└── server/
    └── (backend routes, middleware, etc.)
```

### 2.3 Routing Model

The application uses tab-based navigation (not traditional URL routing). The `currentTab` state in `App.tsx` determines which view is rendered. Public tabs (home, about, tests, track-report, departments) are accessible without authentication; all other tabs require authentication.

### 2.4 Authentication Flow

1. User enters credentials in `AuthModal`
2. `AuthContext.login()` calls `api.login()` → `POST /api/auth/login`
3. Backend validates credentials, returns JWT token + sanitized user
4. Token stored in `localStorage`, user stored in `localStorage` and React state
5. Subsequent API requests include `Authorization: Bearer <token>` header
6. `hasPermission(permission)` checks role-based permission matrix on frontend
7. Backend enforces same permissions via `requirePermission` middleware

---

## 3. Backend Architecture

### 3.1 Technology Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express 4 + TypeScript
- **Server:** `server.ts` entry point → `startServer()` → `createApp()`
- **JSON Parsing:** 10MB limit
- **CORS:** Origin-allowlisted with credential support
- **Rate Limiting:** In-memory store (60 req/min auth, 300 req/min other), Redis opt-in

### 3.2 Application Factory (`createApp`)

The `createApp()` function in `src/server/app.ts` configures:

1. JWT config validation (fail-closed in production)
2. Security headers (X-Content-Type-Options, X-Frame-Options, CSP, HSTS, etc.)
3. CORS configuration
4. Trust proxy support
5. Rate limiting middleware
6. Route registration
7. API 404 + error handling
8. Frontend attachment (Vite dev middleware or static dist)

### 3.3 Route Groups

| Route Group | Base Path | File | Auth Required |
|-------------|-----------|------|---------------|
| Auth | `/api/auth` | `authRoutes.ts` | Mixed (public + protected) |
| Reports | `/api/reports` | `reportRoutes.ts` | Yes (RBAC) |
| Incidents | `/api/incidents` | `incidentRoutes.ts` | Yes (RBAC) |
| Intelligence | `/api/intelligence` | `intelligenceRoutes.ts` | Yes (RBAC) |
| Admin | `/api/admin` | `adminRoutes.ts` | Yes (authority/admin) |
| Locations | `/api/locations` | `locationRoutes.ts` | Yes (RBAC) |
| IP Logs | `/api/iplogs` | `iplogRoutes.ts` | Yes (RBAC) |
| GeoAnalytics | `/api/geoanalytics` | `geoanalyticsRoutes.ts` | Yes (RBAC) |
| Map | `/api/map` | `mapRoutes.ts` | Yes (RBAC) |
| Image | `/api/image` | `imageRoutes.ts` | Yes (RBAC) |
| India Civic | `/api/india` | `indiaCivicRoutes.ts` | Yes (RBAC) |
| Database | `/api/database` | `databaseRoutes.ts` | Yes (authority/admin) |
| Misc | `/api` | `miscRoutes.ts` | Mixed |

### 3.4 Middleware

| Middleware | Purpose | File |
|------------|---------|------|
| `authenticate` | JWT verification, IP security logging | `src/server/middleware/auth.ts` |
| `requirePermission` | Role-permission matrix check | `src/server/middleware/auth.ts` |
| `requireRole` | Role-based access check | `src/server/middleware/auth.ts` |
| `validateJwtConfigOnStartup` | Fail-closed JWT config validation | `src/server/middleware/auth.ts` |
| Rate limiting | Request throttling | `src/server/app.ts:80-117` |
| Security headers | CSP, HSTS, CORS, etc. | `src/server/app.ts:53-79` |

---

## 4. Database / Repository Architecture

### 4.1 Default Runtime: JSON-backed

The active persistence layer is `SCIPDatabase` with in-memory Maps persisted to `.scip_database.json` (or `SCIP_DB_PATH` env var).

**Storage Mechanism:**
- Data held in-memory as JavaScript `Map` instances
- Atomic writes via temp file + `fs.renameSync()`
- Auto-load on initialization
- Backup/restore/prune operations

**Collections:**
| Collection | Description |
|------------|-------------|
| users | User accounts with roles, permissions, jurisdictions |
| departments | Municipal departments |
| reports | Citizen-submitted civic reports |
| incidents | Department-managed incident work orders |
| analyses | AI analysis results linked to reports |
| assignments | Officer assignment records |
| resolutions | Incident resolution records |
| inspections | Field inspection records |
| notifications | User notifications |
| feedbacks | Citizen feedback on resolved reports |
| auditLogs | Append-only audit hash-chain |
| ipSecurityLogs | IP security event logs |
| adminStates | Indian states/UTs |
| adminDistricts | Districts within states |
| adminSubDistricts | Sub-districts within districts |
| adminBlocks | Blocks within sub-districts |
| adminLocalities | Localities within blocks |
| administrativeBoundaries | GeoJSON boundaries |

### 4.2 Repository Layer

```
IScipRepository (interface)
├── JsonScipRepository (active/default)
│   └── SCIPDatabase (engine with Maps)
└── MongoScipRepository (scaffolded, gated)
    └── Mongoose models
```

The `db` export in `src/database/index.ts` delegates to the active repository. MongoDB is gated behind 5 explicit conditions and is NOT runtime-integrated by default.

### 4.3 MongoDB (Scaffolded, Not Runtime-Integrated)

- Mongoose models for all collections
- `MongoScipRepository` implements behavioral parity
- 5-gate isolation: `DATABASE_DRIVER=mongo`, non-production, `SCIP_MONGO_RUNTIME_INTEGRATED=true`, isolated local URI, connected to expected DB
- No split-brain risk — JSON remains default

---

## 5. Authentication & Authorization Architecture

### 5.1 Authentication

- **Token:** JWT with 7-day expiry, 32-character minimum secret
- **Hashing:** bcrypt with 10 salt rounds
- **Session:** Stateless JWT, session versioning for revocation
- **Validation:** `validateJwtConfigOnStartup()` fails closed in production if JWT config is missing/weak
- **IP Security:** Login/register/logout events logged with IP address

### 5.2 Authorization

**6 Roles:**
| Role | Description |
|------|-------------|
| citizen | Submit reports, view own reports, feedback |
| officer | Field officer — view assigned incidents, create inspections |
| dept_officer | Department desk — assign/resolve/review incidents |
| analyst | Analytics, intelligence, data export |
| authority | Cross-department monitoring, audit logs, system stats |
| admin | Full user/department management, all permissions |

**Permissions:** 42+ permissions including `report.create`, `report.read`, `report.update`, `report.delete`, `report.assign`, `incident.read`, `incident.create`, `incident.update`, `incident.resolve`, `incident.assign`, `incident.escalate`, `inspection.create`, `inspection.verify`, `analytics.read`, `intelligence.read`, `data.export`, `audit.read`, `model.evaluate`, `user.read`, `user.create`, `user.update`, `user.delete`, `admin.manage`, `image.read`, `image.upload`, location/geoanalytics/map permissions.

**Enforcement:** Backend `requirePermission` middleware + frontend `hasPermission` hook. Hiding a frontend button is NOT considered authorization — backend enforces all access control.

---

## 6. AI/ML Architecture

### 6.1 Local TypeScript Engine (Production Path)

| Component | Purpose | File |
|-----------|---------|------|
| TF-IDF Vectorizer | Text vectorization with fit/transform/cosine | `src/ai/tfidf.ts` |
| Text Preprocessor | Stopwords, stemming, n-grams | `src/ai/preprocessor.ts` |
| Classifier | 8-category TF-IDF centroid classification | `src/ai/classifier.ts` |
| Entity Extractor | Locations, infrastructure, hazards, temporal | `src/ai/classifier.ts:164` |
| Severity Determiner | Low/medium/high/critical keyword-based | `src/ai/classifier.ts:211` |
| Duplicate Detector | TF-IDF + Haversine + temporal composite scoring | `src/ai/duplicateDetector.ts` |
| Incident Clustering | DBSCAN-inspired spatio-temporal clustering | `src/ai/incidentClustering.ts` |
| Risk Scorer | 5 weighted factors, explainable [0-100] | `src/ai/riskScorer.ts` |
| Intelligence Agent | 10-tool agent for queries | `src/ai/scipAgent.ts` |
| Model Registry | Model versioning, promotion, selection | `src/ai/modelRegistry.ts` |
| Civic Dataset | 320 labeled entries across 8 categories | `src/ai/civicDataset.ts` |
| Dataset Manager | Registration, versioning, quality evaluation | `src/ai/datasetManager.ts` |
| Image Intelligence | Format detection, EXIF, dimensions, heuristic analysis | `src/ai/imageIntelligence.ts` |
| India Civic Intelligence | Schemes, escalation, PIN codes, ULB types | `src/ai/indiaCivicIntelligence.ts` |
| AI Service Adapter | Python FastAPI bridge with local TS fallback | `src/ai/aiServiceAdapter.ts` |

### 6.2 Optional Python FastAPI Service

- **File:** `ai_service/main.py`
- **Port:** 8000
- **Endpoints:** `/embed`, `/embed-batch`, `/semantic-similarity`, `/analyze-image`, `/health`
- **Status:** Standalone, NOT wired into runtime. Local TS engine is used by default.
- **Integration:** `aiServiceAdapter.ts` calls Python service when `AI_SERVICE_URL` is set, falls back to local engine

### 6.3 AI Pipeline (on report creation)

1. `createReport()` → `runAndStoreAIAnalysis()`
2. Classify report (TF-IDF centroid)
3. Extract entities (locations, infrastructure, hazards)
4. Determine severity (keyword-based)
5. Detect duplicates (similarity + spatial + temporal)
6. Cluster incidents (DBSCAN-inspired)
7. Compute risk score (5 weighted factors)
8. Store analysis linked to report

---

## 7. Security Architecture

### 7.1 Security Headers (Production)

| Header | Value |
|--------|-------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| Referrer-Policy | no-referrer |
| Permissions-Policy | geolocation=(), microphone=(), camera=() |
| Cross-Origin-Opener-Policy | same-origin |
| Cross-Origin-Resource-Policy | same-origin |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | Restrictive policy |

### 7.2 Audit Architecture

- **Hash-chain:** Append-only audit log with SHA-256 hash chaining
- **Integrity verification:** `verifyAuditIntegrity()` validates the entire chain
- **Redaction:** Audit details redact emails, tokens, phone numbers, long notes
- **IP Security Logs:** Login/register/logout events with IP addresses

### 7.3 Data Protection

- **Password:** bcrypt 10 rounds, 8-128 character validation
- **PIN:** Indian 6-digit format validation
- **JWT:** 32+ character secret, 7-day expiry, fail-closed validation
- **Account Deletion:** DPDP-compliant PII anonymization
- **CORS:** Origin-allowlisted, no wildcards

---

## 8. Deployment Architecture

### 8.1 Single-Instance (Recommended)

Express server serves both API (`/api/*`) and static frontend (`dist/`) in production mode. JSON database persists to disk volume.

### 8.2 Split Deployment

Frontend on Vercel static hosting, backend on Render/Railway/VPS with persistent disk.

### 8.3 Container (Docker)

```
services:
  scip-web:    Express + Node.js (port 3000)
  scip-mongo:  MongoDB 7 (port 27017, optional)
  scip-ai:     Python FastAPI (port 8000, optional)
```

---

## 9. Boundaries & Interfaces

### 9.1 Frontend ↔ Backend

- REST API over HTTPS
- JWT Bearer token authentication
- JSON request/response bodies
- Typed API client with error handling

### 9.2 Backend ↔ Database

- Repository interface (`IScipRepository`)
- JSON file-backed active implementation
- MongoDB scaffolded (gated)
- Atomic writes via temp file + rename

### 9.3 Backend ↔ AI Service

- Local TypeScript engine (in-process, default)
- Optional Python FastAPI via HTTP (when `AI_SERVICE_URL` set)
- Graceful fallback to local engine

### 9.4 Backend ↔ File System

- `.scip_database.json` for database persistence
- `backups/` directory for timestamped snapshots
- Image data stored as base64 in database (no separate file storage)

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| JSON DB is single-process | Cannot scale horizontally without shared storage | Run one backend instance; use persistent disk volume |
| MongoDB not runtime-integrated | No production MongoDB cutover | Keep `DATABASE_DRIVER=json` |
| Python AI service not integrated | Local TS engine is production AI path | Local TS engine is fully functional |
| No LLM / no trained model | Deterministic algorithms only | Documented limitation |
| No dedicated test runner | Tests are standalone `.mts` scripts | CI pipeline executes all tests |
| No email/SMS verification | Password reset is dev-hint only | Documented limitation |
| Leaflet map UI partial | Map components exist, UI could be enhanced | Map APIs fully functional |
