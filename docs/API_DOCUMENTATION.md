# SCIP — API Documentation

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-11  
**Base URL:** `/api`  
**Auth:** `Authorization: Bearer <JWT>` for protected endpoints (unless noted).  
**Status:** Evidence-based from route source (`src/server/routes/*.ts`, `src/server/app.ts`). Not exhaustive runtime certification.

## 1. Conventions

- **Response envelope (typical):** `{ success: boolean, message?: string, data?: any, meta?: any, errors?: any }` (varies by endpoint; check handlers for exact shape).
- **Validation errors:** generally `400` with `message`/`errors` (sanitized in production).
- **Auth failures:** `401` (missing/invalid/expired/revoked/malformed token, or auth-state enforcement failures per flow).
- **Authorization failures:** `403` (insufficient permission/role/scope/suspended/reset-required or boundary/state guard).
- **Not found:** `404` for missing resources; `/api/*` unknown paths return JSON `404`.
- **Rate limiting:** best-effort in-memory, single-process (`/api/auth`: 60/min, other `/api`: 300/min per IP bucket; disabled when `DISABLE_RATE_LIMIT=true` in tests).
- **Content limits:** JSON/urlencoded body limit `10mb`.
- **CORS:** allowed only for origins in `CORS_ORIGINS` (comma-separated). Preflight returns `204`.
- **Production notes:** JWT must be configured/strong; stack/details redacted in many error paths.

## 2. Authentication (`/api/auth`)

| Method | Path | Auth | Permission/Guard | Description | Key request fields | Success |
|---|---|---|---|---|---|---|
| POST | `/register` | No | Public (self-register forced to `citizen`) | Create citizen account | `name,email,password,phone?` (validated) | `201` sanitized user (no auth internals) |
| POST | `/login` | No | Public | Authenticate user | `email,password` | `200` token + sanitized user |
| POST | `/demo-login` | No | **Dev-only opt-in** (`ENABLE_DEV_DEMO_LOGIN=true`, non-production) else `404/disabled` | Demo session | role/demo payload as implemented | token + sanitized user (dev only) |
| GET | `/me` | Yes | `authenticate` | Current user profile | - | sanitized user |
| POST | `/logout` | Yes | `authenticate` | Invalidate session (version bump semantics as implemented) | - | success |
| POST | `/change-password` | Yes | `authenticate` (+ state checks) | Change own password | `currentPassword,newPassword` | success; session invalidation behavior as implemented |
| PUT | `/profile` | Yes | `authenticate` | Update allowed profile fields | allowlisted fields | sanitized user |
| POST | `/reset-password` | No | Public safe flow | Request credential reset workflow | `email` (and flow inputs as implemented) | generic/safe response (no enumeration intent) |

**Security:** bcrypt-only verification, session version (`sv`) checks, suspension and `credentialsResetRequired` enforcement in hardened paths, expired tokens rejected (`401`).

## 3. Reports (`/api/reports`)

| Method | Path | Auth | Permission | Description | Notes |
|---|---|---|---|---|---|
| GET | `/` | Yes | `report.read` | List reports (scoped/filtered) | Citizen sees own; officer/dept scoped per rules; query filters as implemented |
| GET | `/:id` | Yes | `report.read` | Report detail | Ownership/department/role scoping; analyst PII minimization in hardened paths |
| POST | `/` | Yes | `report.create` (+ rate/validation) | Submit report | Strict validation, category/location/geo/length checks; AI analysis pipeline invoked as implemented |
| PUT | `/:id` | Yes | `report.update` | Update report | Role/state/allowlist constrained; ownership/scoping enforced |
| DELETE | `/:id` | Yes | `report.update` (withdraw semantics per rules) | Withdraw/delete per policy | State/ownership/permission guards |
| POST | `/:id/reject` | Yes | Authorized review role/workflow | Reject report | Requires valid reason/state/permission |
| POST | `/:id/reanalyze` | Yes | `intelligence.read` (and report access) | Re-run AI analysis | Scoped to accessible report; decision-support output |

## 4. Incidents & inspections (`/api/incidents`)

| Method | Path | Auth | Permission | Description | Notes |
|---|---|---|---|---|---|
| GET | `/` | Yes | `incident.read` | List incidents | Scoped by role: citizen linked reports, officer/dept by assigned department, others per RBAC |
| GET | `/:id` | Yes | `incident.read` | Incident detail + linked reports | `canAccessIncident`; citizen/analyst data shaping/PII minimization as implemented |
| POST | `/from-cluster` | Yes | `incident.create` | Create incident from cluster | Validates cluster/report IDs exist |
| POST | `/:id/review` | Yes | `incident.update` | Human review (confirm/dismiss) | Notes required/bounded; dept/assignment boundary and state guards |
| POST | `/:id/assign` | Yes | `incident.assign` | Assign officer/department | Department isolation (esp. dept_officer), closed-state rejection, validation |
| POST | `/:id/escalate` | Yes | `incident.escalate` | Escalate to critical priority | Reason required/bounded; access/state guards |
| POST | `/:id/resolve` | Yes | `incident.resolve` | Resolve incident | Requires valid lifecycle state and action details; scoped |
| GET | `/:id/inspections` | Yes | `inspection.read` | List inspections | Incident access required; analyst lacks `inspection.read` by RBAC |
| POST | `/:id/inspection` | Yes | `inspection.create` | Submit field inspection | Officer/assignment/department/state checks, checklist/evidence validation |
| POST | `/:id/verify-inspection` | Yes | `inspection.verify` | Approve/reject inspection | Dept boundary and incident/inspection/state validation |

## 5. Intelligence & analytics (`/api/intelligence`)

| Method | Path | Auth | Permission | Description | Notes |
|---|---|---|---|---|---|
| POST | `/agent` | Yes | `intelligence.read` | Multi-tool intelligence query/briefing | Query required/bounded; scoped data; optional `specificTool` string |
| GET | `/clusters` | Yes | `intelligence.read` | Spatio-temporal clusters | Computed over scoped reports |
| GET | `/hotspots` | Yes | `intelligence.read` | Location hotspots/density | Scoped aggregation |
| GET | `/trends` | Yes | `analytics.read` | Category/status/daily/incident trends | Scoped; authority permitted via `analytics.read` (confirmed) |
| GET | `/model-metrics` | Yes | `model.evaluate` | Classifier evaluation metrics | Analyst/admin only; **authority denied (confirmed intended)** |
| GET | `/dataset-quality` | Yes | `analytics.read` | Dataset quality signals | Heuristic/diagnostic, not certification |
| GET | `/export-csv` | Yes | `data.export` | Export `reports` or `incidents` CSV | `type` must be `reports|incidents` if provided (invalid -> `400`); scoped; analyst report export omits citizen PII columns; CSV formula neutralization |

## 6. Administration (`/api/admin`)

| Method | Path | Auth | Permission/Role | Description | Notes (Option B) |
|---|---|---|---|---|---|
| GET | `/users` | Yes | `user.read` | List users | Omits auth/session internals; **admin:** full directory incl. email/phone; **authority:** reduced (no email/phone) |
| PUT | `/users/:id/role` | Yes | `admin.manage` | Change user role | Valid roles only; cannot change own role |
| PUT | `/users/:id/status` | Yes | `admin.manage` | Activate/suspend user | Cannot suspend self |
| GET | `/departments` | Yes | `user.read` | List departments | - |
| GET | `/audit-logs` | Yes | `audit.read` | List audit logs | Omits `hash/prevHash/metadata`; returns `userEmail`, redacted `details`, masked `ipAddress`, `detailCode`; supports filters/limit (capped) |
| GET | `/audit-verify` | Yes | `audit.read` | Verify audit chain integrity | Read-only result |
| GET | `/system-stats` | Yes | role `authority` or `admin` | Runtime/system/db summary | No secrets; operational counts/memory |

## 7. Miscellaneous (`/api`)

| Method | Path | Auth | Permission/Guard | Description | Notes |
|---|---|---|---|---|---|
| GET | `/health` | No | Public | Service/persistence/AI readiness status | Reports active/requested driver, Mongo status, `mongoRepositoryIntegrated` (currently false at runtime) |
| GET | `/notifications` | Yes | `authenticate` | User notifications + unread count | Scoped to authenticated user |
| PUT | `/notifications/:id/read` | Yes | `authenticate` | Mark notification read | Ownership/scoping enforced |
| POST | `/notifications/read-all` | Yes | `authenticate` | Mark all read | - |
| POST | `/feedback` | Yes | `authenticate` (+ validation/scoping) | Submit feedback | Rating 1–5; citizens restricted to own report/incident where applicable |
| POST | `/seed` | Yes | Admin + dev opt-in + safety checks | Development seed | Disabled/locked in prod; refuses if persisted DB exists; not for production |
| POST | `/tests/run` | Yes | Admin/dev gates but functionally disabled | In-process test runner | **Disabled** to prevent data mutation; use isolated scripts/CI |

## 8. Error/status summary

| Status | Meaning (typical) |
|---|---|
| 200/201 | Success / created |
| 204 | CORS preflight |
| 400 | Validation/input/state error |
| 401 | Unauthenticated, invalid/expired/revoked token |
| 403 | Forbidden (RBAC, scope, suspension/reset, dev-gate denial) |
| 404 | Resource or API route not found / gated dev endpoint unavailable |
| 409 | Conflict/safety refusal (e.g. seed refused) |
| 429 | Rate limited |
| 500 | Server error (message redacted in production) |

## 9. Evidence and limitations

- **Isolated validation:** 361 assertions passed (46 smoke + 315 HTTP) covering representative auth/RBAC/scoping/validation/hardening cases; not an exhaustive role×endpoint×state matrix.
- **Runtime:** JSON persistence active; Mongo repository not runtime-integrated/cut over.
- **Production certification:** not provided by this document.
