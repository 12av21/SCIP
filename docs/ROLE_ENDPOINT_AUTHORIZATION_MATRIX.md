# ROLE / ENDPOINT AUTHORIZATION MATRIX

**Project:** SCIP  
**Phase:** 12 — Security Closure & Migration Readiness  
**Date:** 2026-11-11  
**Status:** Evidence-based inventory (source-verified) + isolated test coverage summary. **Not an exhaustive runtime certification for every state/transition/edge case.**

## 1. Scope and method

- **Source of truth:** `src/server/middleware/auth.ts` (role permissions), `src/server/routes/*.ts`, `src/server/app.ts` (global controls), `scripts/security-smoke-test.mts`, `scripts/security-http-test.mts`.
- **Roles (6):** `citizen`, `officer`, `dept_officer`, `analyst`, `authority`, `admin`.
- **Conditions considered:** authentication, revoked/expired/invalid tokens, session revocation (`sv`), suspended accounts, credential-reset-required accounts, privilege escalation attempts (self-registration role escalation, role/status self-modification guards), citizen ownership, department isolation, field-officer assignment boundaries (where implemented/tested), incident lifecycle/state guards, and export permissions.
- **Validation environment:** isolated temp DB (`SCIP_DB_PATH`), ephemeral localhost server, test JWT secret; **`.scip_database.json` not used/modified**.

## 2. Permission map (from `middleware/auth.ts`)

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

**Notes:** `GET /api/admin/system-stats` uses `requireRole(['authority','admin'])` (not `admin.manage`). Some endpoints enforce additional ownership/department/state/business rules beyond RBAC.

## 3. Protected/public endpoint matrix

Legend: **Auth** = `authenticate` required; **Perm/Role** = middleware guard; **Add’l controls** = ownership/department/state/validation/safety gates. **Observed (isolated tests)** indicates representative automated assertions exist (not exhaustive).

| Endpoint | Method | Auth | Perm/Role | Add’l controls / scoping | Unauth expected | Missing perm/forbidden expected | Observed (isolated tests) |
|---|---|:---:|---|---|---|---|---|
| `/api/health` | GET | No | - | Public health info only | N/A | N/A | 200 + headers |
| `/api/auth/register` | POST | No | - | Citizen-only public registration; validation; no privileged role self-assign | N/A | 403 on privileged role | 400/403 cases |
| `/api/auth/login` | POST | No | - | Credential validation; suspended/reset-required handling; generic auth errors | N/A | 401/403 cases | missing creds 400, fail paths exercised |
| `/api/auth/demo-login` | POST | No | - | **Dev-only opt-in** (`ENABLE_DEV_DEMO_LOGIN` + non-prod), else disabled/404 | N/A | 403/404 | disabled by default |
| `/api/auth/me` | GET | Yes | - | Returns sanitized user (no `passwordHash/sessionVersion/credentialsResetRequired`) | 401 | N/A | all roles 200 sanitized |
| `/api/auth/logout` | POST | Yes | - | Invalidates sessions (best-effort) | 401 | N/A | 200, token invalid after logout 401 |
| `/api/auth/change-password` | POST | Yes | - | Validates payload; verifies old password; rotates credentials/sessions | 401 | 400/401 | unauth/invalid/wrong-old checks |
| `/api/auth/profile` | PUT | Yes | - | Validated editable fields only | 401 | 400 | unauth/invalid payload checks |
| `/api/auth/reset-password` | POST | No | - | Enumeration-safe response; validated email; server-side reset workflow | N/A | 400 on invalid input | missing/invalid/unknown handled |
| `/api/reports` | GET | Yes | `report.read` | Citizen scoped to self; officer/dept_officer scoped to dept-linked incidents; filters validated in usage | 401 | 403 role/perm as applicable | role lists/scoping checks |
| `/api/reports/:id` | GET | Yes | `report.read` | Ownership/department access checks; analyst PII minimization in hardened path | 401 | 403/404 | own/other/scoped/PII checks |
| `/api/reports` | POST | Yes | `report.create` | Strict validation/allowlists; citizen submission path | 401 | 403 for non-creators | invalid 400, role denials |
| `/api/reports/:id` | PUT | Yes | `report.update` | Citizen own + editable states/fields; staff limited status allowlists; dept boundary checks | 401 | 403/404/400 | unauth/other/role/validation/state cases |
| `/api/reports/:id` | DELETE | Yes | `report.update` | Citizen own withdraw or admin per rules; closed/resolved guards | 401 | 403/404/400 | role/ownership/state checks |
| `/api/reports/:id/reject` | POST | Yes | `incident.update` | Access/scoping checks; reason validation; closed-state guard | 401 | 403/404/400 | unauth/role/validation/unknown/closed checks |
| `/api/reports/:id/reanalyze` | POST | Yes | `intelligence.read` | Access/scoping checks | 401 | 403/404 | unauth/role/unknown checks |
| `/api/incidents` | GET | Yes | `incident.read` | Scoped by role (citizen linked, officer/dept by department, privileged broader) | 401 | 403 role/perm as applicable | list/scoping checks |
| `/api/incidents/:id` | GET | Yes | `incident.read` | `canAccessIncident`; citizen linked-report filtering; analyst linked-report PII omission | 401 | 403/404 | active/unassigned/cross-dept/PII checks |
| `/api/incidents/from-cluster` | POST | Yes | `incident.create` | Payload validation; referenced report existence checks | 401 | 403 | unauth/validation/role denials |
| `/api/incidents/:id/review` | POST | Yes | `incident.update` | Access/department/state guards; action/notes validation | 401 | 403/400/404 | unauth/role/validation/state/unknown checks |
| `/api/incidents/:id/resolve` | POST | Yes | `incident.resolve` | Access/department/state/workflow guards; action validation | 401 | 403/400/404 | role/validation/state/unknown checks |
| `/api/incidents/:id/inspections` | GET | Yes | `inspection.read` | `canAccessIncident` + incident existence | 401 | 403/404 | role/scoping checks (incl. analyst 403) |
| `/api/incidents/:id/inspection` | POST | Yes | `inspection.create` | Access checks; officer assignment boundary where applicable; payload/state guards | 401 | 403/400/404 | role/validation/unknown/state checks |
| `/api/incidents/:id/verify-inspection` | POST | Yes | `inspection.verify` | Access/department/ownership-of-inspection/state guards; payload validation | 401 | 403/400/404 | role/validation/unknown/mismatch checks |
| `/api/incidents/:id/assign` | POST | Yes | `incident.assign` | Access/department/state guards; officer/dept/notes validation | 401 | 403/400/404 | unauth/role/validation/unknown checks |
| `/api/incidents/:id/escalate` | POST | Yes | `incident.escalate` | Access/department/state guards; reason validation | 401 | 403/400/404 | unauth/role/validation/unknown checks |
| `/api/intelligence/agent` | POST | Yes | `intelligence.read` | Query/specificTool validation; scoped data context | 401 | 403/400 | role/validation checks |
| `/api/intelligence/clusters` | GET | Yes | `intelligence.read` | Scoped data | 401 | 403 | role checks |
| `/api/intelligence/hotspots` | GET | Yes | `intelligence.read` | Scoped data | 401 | 403 | role checks |
| `/api/intelligence/trends` | GET | Yes | `analytics.read` | Scoped data | 401 | 403 | role checks |
| `/api/intelligence/model-metrics` | GET | Yes | `model.evaluate` | Aggregate metrics (policy scope open) | 401 | 403 | role checks |
| `/api/intelligence/dataset-quality` | GET | Yes | `analytics.read` | Aggregate metrics (policy scope open) | 401 | 403 | role checks |
| `/api/intelligence/export-csv` | GET | Yes | `data.export` | `type` must be `reports|incidents` (400 invalid/absent-handling per impl); scoped; analyst report PII omitted; CSV formula neutralization | 401 | 403/400 | type/default/incidents/PII header checks |
| `/api/admin/users` | GET | Yes | `user.read` | Sensitive internal fields omitted in hardened response | 401 | 403 | role checks + field omission |
| `/api/admin/users/:id/role` | PUT | Yes | `admin.manage` | Allowed roles; cannot change own role | 401 | 403/400 | role/self/invalid checks |
| `/api/admin/users/:id/status` | PUT | Yes | `admin.manage` | `active|suspended`; cannot suspend self | 401 | 403/400 | role/self/invalid checks |
| `/api/admin/departments` | GET | Yes | `user.read` | Department directory | 401 | 403 | role checks |
| `/api/admin/audit-logs` | GET | Yes | `audit.read` | Query bounds/caps; hash/prevHash/metadata omitted in list response (current behavior) | 401 | 403 | role checks + field omission |
| `/api/admin/audit-verify` | GET | Yes | `audit.read` | Read-only integrity verification result | 401 | 403 | role checks |
| `/api/admin/system-stats` | GET | Yes | Role: `authority`,`admin` | Runtime/system/db counts (no secret values exposed) | 401 | 403 | role checks |
| `/api/notifications` | GET | Yes | - | User-scoped notifications | 401 | N/A | unauth/auth checks |
| `/api/notifications/:id/read` | PUT | Yes | - | ID validation; user-scoped update (impl) | 401 | 400 | validation check |
| `/api/notifications/read-all` | POST | Yes | - | User-scoped | 401 | N/A | unauth/auth checks |
| `/api/feedback` | POST | Yes | - | Validation; citizen ownership checks for linked report/incident when provided | 401 | 400/403/404 | unauth/invalid checks |
| `/api/seed` | POST | Yes | Admin role gate in handler (dev-only opt-in) | **Disabled in prod**; requires `ENABLE_DEV_SEED`, non-prod; refuses if persisted DB exists; no overwrite of existing app DB | 401 | 403 | unauth/disabled checks |
| `/api/tests/run` | POST | Yes | Admin gate in handler (dev-only opt-in path) | **Disabled** (safety) even when opted-in; isolated tests used instead | 401 | 403/404 | unauth/disabled checks |
| `/api/*` (unknown) | any | n/a | n/a | API 404 JSON | N/A | 404 | 404 JSON check |

## 4. Session, suspension, reset, and privilege-escalation controls (evidence)

| Control | Expected behavior | Evidence (isolated) |
|---|---|---|
| Invalid/missing/malformed token | 401 on protected endpoints | HTTP tests (`unauthenticated * -> 401`, invalid token cases in suite coverage) |
| Revoked session (`sv` mismatch / invalidation) | 401 | HTTP smoke/integration assertions for logout/session invalidation/revoked token |
| Suspended user | 403 (authz/account state) | HTTP tests (suspended account token rejected) |
| Credential reset required / invalidated by reset flow | 401/403 per flow | HTTP tests (reset/invalidation rejection) |
| Expired token | 401 | **Implemented** in JWT verification path; **not explicitly time-advanced in recorded automated tests** (gap) |
| Citizen ownership boundaries | Access limited to own reports/incidents/notifications/feedback context as applicable | HTTP tests (citizen scoped lists/detail/update/reject/delete/feedback cases) |
| Department isolation & officer boundaries | Officer/dept_officer limited to department/assignment scope; cross-dept/unassigned denied | HTTP tests (out-of-scope incident/report/list/assign/inspect cases) |
| Incident lifecycle transitions | Closed/resolved/dismissed incidents reject invalid review/assign/escalate/resolve/inspect/verify actions | HTTP + DB smoke guard tests |
| Privilege escalation attempts | Public register cannot create privileged role; admin cannot change/suspend self; invalid role/status rejected | HTTP tests (register privileged role 403, admin self/invalid guards) |

## 5. Coverage status and gaps

- **Automated evidence:** `npm run test:security` **46 passed, 0 failed**; `npm run test:security:http` **307 passed, 0 failed** (**353 total isolated assertions**) at time of Phase 12 validation (see Phase 12 report).
- **Not exhaustive:** full negative matrix for every role × endpoint × HTTP method × state/transition/field combination is **not** fully proven. Examples of residual gap areas: explicit expired-token expiry simulation, every possible incident/report state permutation per role, all export/filter edge cases, and complete concurrency/abuse scenarios.
- **Runtime production behavior** (deployed config, real TLS/proxy, multi-instance rate limiting, frontend CSP compatibility) is **not verified** in this workspace.

## 6. Safety statement

All automated tests referenced were executed against **isolated temporary databases/ephemeral servers/test secrets**. **No existing application data (`.scip_database.json`) was modified, reset, migrated, or overwritten.** No production/Atlas/external database was accessed.
