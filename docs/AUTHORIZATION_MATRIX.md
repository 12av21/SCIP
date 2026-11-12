# SCIP — Authorization Matrix

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-11 (Option B applied/confirmed)  
**Primary source:** `src/server/middleware/auth.ts`, `src/server/routes/*.ts`  
**Companion detail:** `docs/ROLE_ENDPOINT_AUTHORIZATION_MATRIX.md` (endpoint-level evidence table)

## 1. Roles

| Role | Intent (high-level) |
|---|---|
| `citizen` | Submit/manage own reports, view own scoped data/notifications, provide feedback |
| `officer` | Field operations on assigned/department-scoped incidents/reports; inspections |
| `dept_officer` | Department desk operations: review/assign/escalate/resolve/verify within department boundaries |
| `analyst` | Read intelligence/analytics/model signals and scoped operational data (PII-minimized in hardened paths) |
| `authority` | Governance/oversight: read/manage escalated workflows, exports, audit access, reduced user directory (Option B) |
| `admin` | Administrative control, full permitted management, audit/system access (subject to guards) |

## 2. Permission grants by role

Legend: **Y** = granted, **-** = not granted.

| Permission | citizen | officer | dept_officer | analyst | authority | admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `user.read` | - | - | - | - | Y | Y |
| `user.create` | - | - | - | - | - | Y |
| `user.update` | - | - | - | - | - | Y |
| `user.delete` | - | - | - | - | - | Y |
| `report.create` | Y | - | - | - | - | Y |
| `report.read` | Y | Y | Y | Y | Y | Y |
| `report.update` | Y | - | Y | - | Y | Y |
| `report.delete` | - | - | - | - | - | Y |
| `report.assign` | - | - | Y | - | Y | Y |
| `incident.read` | Y | Y | Y | Y | Y | Y |
| `incident.create` | - | - | Y | - | Y | Y |
| `incident.update` | - | Y | Y | - | Y | Y |
| `incident.assign` | - | - | Y | - | Y | Y |
| `incident.resolve` | - | - | Y | - | Y | Y |
| `incident.escalate` | - | - | Y | - | Y | Y |
| `inspection.create` | - | Y | - | - | - | Y |
| `inspection.verify` | - | - | Y | - | - | Y |
| `inspection.read` | - | Y | Y | Y | Y | Y |
| `feedback.create` | Y | - | - | - | - | Y |
| `analytics.read` | - | - | Y | Y | Y | Y |
| `intelligence.read` | - | - | - | Y | Y | Y |
| `audit.read` | - | - | - | - | Y | Y |
| `model.evaluate` | - | - | - | Y | - | Y |
| `data.export` | - | - | Y | Y | Y | Y |
| `admin.manage` | - | - | - | - | - | Y |

## 3. Confirmed policy decisions (Option B, 2026-11-11)

| Area | Decision |
|---|---|
| `GET /api/admin/users` (authority, `user.read`) | **Allowed with reduced directory view** (no `email`, no `phone`; no auth/session internals) |
| `GET /api/admin/audit-logs` (authority, `audit.read`) | **Allowed** with masked last IP segment, `detailCode`, redacted `details`, retained `userEmail` (no `hash/prevHash/metadata`) |
| `GET /api/intelligence/model-metrics` (`model.evaluate`) | **Authority denied** (analyst/admin only) — confirmed intended |
| `GET /api/intelligence/dataset-quality`, `/trends` (`analytics.read`) | **Authority allowed** — confirmed intended |
| `GET /api/admin/system-stats` | `authority` or `admin` role required (route guard) |

## 4. Endpoint-to-permission summary (selected)

| Endpoint group | Method(s) | Permission/role gate | Additional scoping/notes |
|---|---|---|---|
| `/api/health` | GET | Public | - |
| `/api/auth/*` | mixed | Public or `authenticate` | registration citizen-only, demo-login dev-gated, session/suspension/reset checks |
| `/api/reports` | GET/POST | `report.read` / `report.create` | ownership/department/role scoping, validation |
| `/api/reports/:id` | GET/PUT/DELETE | `report.read` / `report.update` | state/ownership/allowlists, analyst PII minimization |
| `/api/reports/:id/reject` | POST | authorized workflow/permission | reason/state checks |
| `/api/reports/:id/reanalyze` | POST | `intelligence.read` + access | scoped |
| `/api/incidents` | GET | `incident.read` | citizen linked, officer/dept assigned, etc. |
| `/api/incidents/:id` | GET | `incident.read` | `canAccessIncident`, linked-report shaping |
| `/api/incidents/from-cluster` | POST | `incident.create` | validated cluster/report IDs |
| `/api/incidents/:id/review` | POST | `incident.update` | notes/state/department/assignment guards |
| `/api/incidents/:id/assign` | POST | `incident.assign` | department isolation, closed-state rejection |
| `/api/incidents/:id/escalate` | POST | `incident.escalate` | reason/state/access guards |
| `/api/incidents/:id/resolve` | POST | `incident.resolve` | lifecycle/state and scope checks |
| `/api/incidents/:id/inspections` | GET | `inspection.read` | incident access required |
| `/api/incidents/:id/inspection` | POST | `inspection.create` | officer/assignment/department/state checks |
| `/api/incidents/:id/verify-inspection` | POST | `inspection.verify` | dept boundary, inspection/incident validation |
| `/api/intelligence/agent|clusters|hotspots` | POST/GET | `intelligence.read` | scoped data |
| `/api/intelligence/trends|dataset-quality` | GET | `analytics.read` | aggregate/scoped |
| `/api/intelligence/model-metrics` | GET | `model.evaluate` | analyst/admin only |
| `/api/intelligence/export-csv` | GET | `data.export` | type validation, scoped, PII-safe, CSV-safe |
| `/api/admin/users` | GET | `user.read` | Option B view minimization |
| `/api/admin/users/:id/role|status` | PUT | `admin.manage` | no self role/status escalation |
| `/api/admin/departments` | GET | `user.read` | - |
| `/api/admin/audit-logs` | GET | `audit.read` | Option B masking/redaction/detailCode |
| `/api/admin/audit-verify` | GET | `audit.read` | read-only |
| `/api/admin/system-stats` | GET | role `authority`,`admin` | - |
| `/api/notifications*`, `/api/feedback` | GET/PUT/POST | `authenticate` (+ validation/scoping) | user-owned/validated |
| `/api/seed`, `/api/tests/run` | POST | admin/dev-gated (safety locked) | disabled/refused in protected contexts |

## 5. Enforcement layers

1. **Authentication:** JWT verification, `sessionVersion`/revocation checks, suspension/reset enforcement.
2. **Authorization:** role permission map (`hasPermission` / `requirePermission` / `requireRole`).
3. **Resource scoping:** ownership, department assignment, incident/report linkage (`canAccessIncident`, report filters).
4. **State/workflow guards:** lifecycle/status checks (review, assign, resolve, escalate, inspect, verify).
5. **Input/output controls:** validation/allowlists/length limits, PII minimization/redaction/masking, export/type/CSV safety.
6. **Operational controls:** dev-only endpoint gating, in-memory rate limits, API 404/safe errors, headers/CORS.

## 6. Evidence and gaps

- **Isolated evidence:** 361 assertions passed (representative positive/negative cases, including expired-token rejection and Option B assertions).
- **Not proven:** exhaustive role×endpoint×method×state matrix, all concurrency/abuse paths, and deployed runtime policy enforcement.
- **Status:** authorization substantially hardened and partially verified; **not SECURITY VERIFIED / PRODUCTION READY**.
