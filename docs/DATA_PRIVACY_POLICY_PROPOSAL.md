# DATA PRIVACY & EXPOSURE POLICY PROPOSAL (Phase 12)

**Project:** SCIP  
**Date:** 2026-11-11  
**Status:** **Proposal only — no unresolved governance decisions made on behalf of the project owner.**  
**Basis:** Source inspection of server routes, middleware, database/types, and isolated test observations. This is not a legal/compliance determination.

## 1. Purpose

Inventory sensitive/personal/internal data currently returned or logged by APIs, identify exposure paths, and propose role-based minimization options with implications. Final policy choices require project-owner/governance approval.

## 2. Data categories inventoried

| Category | Examples in SCIP | Primary locations |
|---|---|---|
| Citizen identity/contact PII | `citizenName`, `citizenEmail`, report owner fields, user `email`, `phone`, `name` | `Report` records; `GET /api/reports`, `GET /api/reports/:id`, linked reports in incidents, `GET /api/admin/users`, audit actor fields, exports |
| Location data | `locationName`, `latitude`, `longitude`, geospatial clusters/hotspots | Reports/incidents/intelligence endpoints/exports |
| User account/admin data | role, status, department, `createdAt/updatedAt`, (sensitive internals: `passwordHash`, `sessionVersion`, `credentialsResetRequired` — **must never be exposed**) | `User` model, auth/admin endpoints, DB helpers |
| Audit actor/trace data | `userId`, `userEmail`, `userRole`, `ipAddress`, `details`, `action`, `module`, `recordId`, timestamps, hash chain fields | `AuditLog`; `GET /api/admin/audit-logs`, `GET /api/admin/audit-verify`, audit writes |
| Internal incident/operational details | `reviewNotes`, `resolutionNotes`, assignment/department/officer fields, inspection observations/checklists/recommendations/photos refs, priorities/severity/confidence/evidence | Incident/inspection endpoints, exports, notifications/messages |
| Intelligence/model metrics & analytics | classifier metrics, confusion/per-category stats, dataset quality signals, cluster/hotspot/trend aggregates, agent briefings/tool outputs | `/api/intelligence/*` |
| Authentication/session material | JWTs, passwords, reset/change-password inputs, session versions | Request/response handling (must not be logged/exposed) |
| Infrastructure/secrets | `JWT_SECRET`, `MONGODB_URI`, connection strings, API keys | Env/config/runtime (must not be logged/exposed) |

## 3. Current endpoint exposure inventory (observed from source)

> “Current behavior” reflects implemented code at time of review; isolated tests validate selected minimization/redaction behaviors (not every field on every response).

| Endpoint(s) | Data potentially returned | Current behavior / notes | Roles (guarded) | Tests observed |
|---|---|---|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/demo-login` (dev-only), `GET /api/auth/me` | User identity fields, role, department, phone (if present), token (login/register/demo) | **Sanitized auth user** omits `passwordHash`, `sessionVersion`, `credentialsResetRequired` in hardened responses | public/authenticated/dev-gated | Yes (`/me` sanitized for roles) |
| `PUT /api/auth/profile`, `POST /api/auth/change-password`, `POST /api/auth/logout`, `POST /api/auth/reset-password` | Success/error messages; no token/password echo intended | Reset flow enumeration-safe; no token leakage in production path by design | auth/public as applicable | Partial (validation/flows/statuses) |
| `GET /api/reports`, `GET /api/reports/:id` | Report content, location, citizen identity fields (depending on role), AI analysis on detail | **Analyst PII minimization** removes `citizenName`/`citizenEmail` in hardened report views; citizen/owner and staff scoping enforced; officer/dept scoped by department linkage | `report.read` + scoping | Yes (scoping + analyst omission) |
| `PUT/DELETE/POST reject/reanalyze /api/reports/*` | Updated/sanitized report objects or messages | Role/state/ownership guards; response sanitization follows role in key paths | `report.update` / `incident.update` / `intelligence.read` | Partial |
| `GET /api/incidents`, `GET /api/incidents/:id` | Incident details, linked reports, assignments, notes, evidence, inspection context (separate endpoint) | **Analyst linked-report PII omission** (`citizenName`/`citizenEmail`) in hardened detail path; citizen linked-report scoping; officer/dept department boundaries | `incident.read` + scoping | Yes (active/unassigned/scoping/PII cases) |
| `POST /api/incidents/*` (review/resolve/assign/escalate/from-cluster), `GET/POST inspections`, `POST verify-inspection` | Incident/inspection workflow data, notes, remarks, recommendations, status transitions | Access/state/validation guards; responses include operational incident/inspection records as implemented | incident/inspection permissions + scoping | Partial/representative |
| `GET /api/intelligence/agent|clusters|hotspots|trends` | Aggregated/scoped analytical outputs; may include locations/categories/counts/IDs and derived intelligence | Scoped by user role/department/citizenship context in helpers; **not a full PII redaction audit for every nested field** | `intelligence.read` / `analytics.read` | Role access checks; limited content assertions |
| `GET /api/intelligence/model-metrics` | Classifier evaluation metrics, per-category/confusion/sample details (aggregate/technical) | Permission-gated; **no direct citizen contact fields by design**, but aggregate/model data sensitivity is a policy question | `model.evaluate` | Role checks only |
| `GET /api/intelligence/dataset-quality` | Dataset quality/aggregate signals | Permission-gated; aggregate scope policy open | `analytics.read` | Role checks only |
| `GET /api/intelligence/export-csv` | Reports or incidents CSV (scoped) | `type` validated; analyst report export omits `CitizenName`; admin/authorized roles may include PII columns per implementation; CSV injection neutralized | `data.export` | Yes (type/default/PII header cases) |
| `GET /api/admin/users` | User directory records (identity/contact/role/status/department/metadata as stored, excluding sensitive internals) | **Omits `passwordHash`, `sessionVersion`, `credentialsResetRequired`**; still returns user identity/contact fields (e.g. email/phone/name) needed for admin/governance workflows — policy-sensitive | `user.read` | Yes (sensitive-internal omission) |
| `GET /api/admin/departments` | Department records | Operational directory data | `user.read` | Yes (role checks) |
| `GET /api/admin/audit-logs` | Audit entries: `id,timestamp,action,module,recordId,userId,userEmail,userRole,ipAddress,details` (current) | **Omits hash/prevHash/metadata** from list response; **retains `userEmail`, `ipAddress`, `details`** for governance/audit usability — **explicit policy decision required** | `audit.read` | Yes (field omission/retention checks) |
| `GET /api/admin/audit-verify` | Integrity result (`isValid`, `checkedCount`, optional broken id) | No secret material; reveals chain health status | `audit.read` | Yes (role checks) |
| `GET /api/admin/system-stats` | Runtime/platform/memory/db counts | No credentials/secrets; operational metadata only | `authority`,`admin` | Yes (role checks) |
| `GET/PUT/POST /api/notifications*` | Notification title/message/type/link/read state (may reference records/incidents) | User-scoped; content may include operational context | authenticated user | Basic checks |
| `POST /api/feedback` | Submitted feedback and linkage fields | Validated; citizen ownership checks for linked entities where provided | authenticated | Basic checks |
| `GET /api/health` | Service status/version/timestamp | Public operational status only | public | Yes |

## 4. Identified privacy/governance gaps (no decisions made)

1. **Audit log actor/network/details exposure:** `userEmail`, `ipAddress`, and free-form `details` are returned to `audit.read` roles (admin/authority) for governance utility. This may exceed least-privilege needs depending on policy.
2. **Admin user directory contact fields:** `user.read` consumers (admin/authority) can view user records including contact/identity fields (with sensitive auth internals removed). Acceptable for administration, but should be explicitly approved and minimized where possible.
3. **Analyst/intelligence nested data:** analyst PII minimization is implemented in key report/incident/export paths, but **not formally proven for every intelligence/agent/aggregate payload and future fields**.
4. **Aggregate model/dataset metrics scope:** `model-metrics` and `dataset-quality` are permission-gated; whether all currently permitted roles should access them in production is a policy choice.
5. **Cross-role operational notes/details:** incident review/resolution/inspection narratives may contain personal or sensitive information entered by users/staff; exposure follows endpoint access/scoping rules but content-level redaction is not implemented.

## 5. Proposed role-based exposure options and implications

### Option A — Strict minimization (privacy-first)
- **Audit logs:** mask `userEmail` (or show hashed/partial), mask/truncate `ipAddress`, redact/tokenize `details`; provide break-glass/full-detail endpoint only for `admin` with justification logging.
- **Admin users:** hide `email`/`phone` from `authority` unless separately authorized; keep for `admin` only.
- **Intelligence/model metrics:** restrict `model-metrics` and sensitive dataset diagnostics to `admin`/`analyst` as approved; aggregate-only for others.
- **Exports:** default no direct citizen identifiers for all non-admin roles; explicit approved export mode for PII.
- **Implications:** strongest privacy posture; may hinder investigations, support, governance traceability, and existing UI workflows; requires UX/API and test changes.

### Option B — Balanced governance (recommended baseline for review)
- Keep current hardened omissions (`passwordHash`, session internals, hash chain fields in list, analyst report PII in key paths).
- **Audit logs:** retain `userEmail` and `details` for `audit.read` roles but **mask last octet/segment of `ipAddress`** and introduce structured detail codes + redaction for known-sensitive patterns.
- **Admin users:** allow full directory for `admin`; provide reduced view for `authority` (or confirm current `user.read` scope as intended).
- **Intelligence/model metrics:** keep `model.evaluate` / `analytics.read` gating but document and approve exact role scope (`authority` currently lacks `model.evaluate` in code; confirm intended).
- **Implications:** preserves operational/governance utility with targeted minimization; requires policy sign-off and modest implementation/test updates.

### Option C — Current behavior with explicit risk acceptance
- Formally accept current exposures for approved roles/environments after documented risk review and compensating controls (access logging, training, environment restrictions).
- **Implications:** minimal code change; higher privacy/compliance risk if roles or deployment context change; requires written owner approval.

## 6. Recommendations (non-binding)

1. **Project owner to select/approve** one option (or hybrid) for audit logs, user directory, intelligence/model metrics, and exports.
2. Apply **least privilege** and **purpose limitation** per role; prefer structured audit `details` over free-form PII-bearing text.
3. Add **response-schema tests** to prevent accidental reintroduction of sensitive fields.
4. Treat **logs, error payloads, and exports** as data-exposure surfaces subject to the same policy.
5. Reassess policy before any production deployment, external integration, or persistence migration.

## 7. Safety statement

This proposal was produced from repository inspection and isolated validation context only. **No existing application data was modified, and no production data was accessed.** No governance decision has been finalized by this document.
