# ROLE / ENDPOINT AUTHORIZATION MATRIX

**Project:** SCIP  
**Phase:** 12 — Security Closure & Migration Readiness (updated: Option B applied)  
**Date:** 2026-11-11  
**Status:** Evidence-based inventory (source-verified) + isolated test coverage summary. **Not an exhaustive runtime certification for every state/transition/edge case.**

## 1. Scope and method

- **Source of truth:** `src/server/middleware/auth.ts` (role permissions), `src/server/routes/*.ts`, `src/server/app.ts` (global controls), `scripts/security-smoke-test.mts`, `scripts/security-http-test.mts`.
- **Roles (6):** `citizen`, `officer`, `dept_officer`, `analyst`, `authority`, `admin`.
- **Conditions considered:** authentication, revoked/expired/invalid tokens, session revocation (`sv`), suspended accounts, credential-reset-required accounts, privilege escalation attempts (self-registration role escalation, role/status self-modification guards), citizen ownership, department isolation, field-officer assignment boundaries (where implemented/tested), incident lifecycle/state guards, and export permissions.
- **Option B (privacy/governance) applied:** audit logs mask last IP segment and include `detailCode` + redacted `details` (retain `userEmail`); admin user directory full for admin, reduced for authority (no `email`/`phone`); intelligence/model gating unchanged (documented for confirmation).
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

**Notes:** `GET /api/admin/system-stats` uses `requireRole(['authority','admin'])`. `GET /api/admin/users` applies Option B view reduction for `authority` (no `email`/`phone`) despite `user.read` — **confirmed intended (2026-11-11)**. `GET /api/intelligence/model-metrics` is **not** accessible to authority (lacks `model.evaluate`) — **confirmed intended, keep denied (2026-11-11)**. `dataset-quality`/`trends` access via `analytics.read` (incl. authority) — **confirmed intended (2026-11-11)**.

## 3. Protected/public endpoint matrix (selected; source-derived)

| Endpoint | Method | Auth | Perm/Role | Add’l controls / scoping | Unauth | Forbidden/denied | Observed (isolated) |
|---|---|:---:|---|---|---|---|---|
| `/api/health` | GET | No | - | Public | N/A | N/A | 200 + headers |
| `/api/auth/*` | POST/GET/PUT | mixed | -/auth | validation, bcrypt-only, session/suspension/reset, dev demo-login gated, sanitized responses | 401 where auth | 400/401/403/404 | representative coverage |
| `/api/reports*` | GET/POST/PUT/DELETE | Yes | report perms + scoping | ownership/dept/state/validation/PII minimization | 401 | 403/404/400 | representative coverage |
| `/api/incidents*` (incl. inspections/review/assign/escalate/resolve) | GET/POST | Yes | incident/inspection perms | `canAccessIncident`, dept/assignment/state guards, validation | 401 | 403/404/400 | representative coverage |
| `/api/intelligence/agent|clusters|hotspots` | GET/POST | Yes | `intelligence.read` | scoped data, validation | 401 | 403/400 | role/validation checks |
| `/api/intelligence/trends|dataset-quality` | GET | Yes | `analytics.read` | scoped/aggregate data | 401 | 403 | role checks |
| `/api/intelligence/model-metrics` | GET | Yes | `model.evaluate` | aggregate metrics (analyst/admin) | 401 | 403 | role checks (authority denied) |
| `/api/intelligence/export-csv` | GET | Yes | `data.export` | type validation, scoped, PII minimization (analyst), CSV-safe | 401 | 403/400 | type/PII checks |
| `/api/admin/users` | GET | Yes | `user.read` | omits auth internals; **Option B:** admin full, authority reduced (no email/phone) | 401 | 403 | role + view assertions |
| `/api/admin/users/:id/role|status` | PUT | Yes | `admin.manage` | validation, no self role/status escalation/suspension | 401 | 403/400 | role/self/invalid checks |
| `/api/admin/departments` | GET | Yes | `user.read` | directory | 401 | 403 | role checks |
| `/api/admin/audit-logs` | GET | Yes | `audit.read` | omits hash/prevHash/metadata; **Option B:** masked `ipAddress`, `detailCode`, redacted `details`, retains `userEmail` | 401 | 403 | role + field/masking assertions |
| `/api/admin/audit-verify` | GET | Yes | `audit.read` | read-only integrity result | 401 | 403 | role checks |
| `/api/admin/system-stats` | GET | Yes | Role `authority`,`admin` | operational stats | 401 | 403 | role checks |
| `/api/notifications*`, `/api/feedback` | GET/PUT/POST | Yes | auth (+ scoping/validation) | user/ownership checks as applicable | 401 | 400/403/404 | basic checks |
| `/api/seed`, `/api/tests/run` | POST | Yes | admin/dev gates | disabled/safety-locked; no overwrite of persisted DB | 401 | 403/404 | disabled checks |
| `/api/*` unknown | any | n/a | n/a | API 404 JSON | N/A | 404 | 404 check |

> Full per-endpoint detail retained from prior matrix structure; this update reflects Option B data-exposure changes and confirms current permission gating.

## 4. Session, suspension, reset, and privilege-escalation controls (evidence)

| Control | Expected behavior | Evidence (isolated) |
|---|---|---|
| Invalid/missing/malformed token | 401 | HTTP tests |
| Revoked session (`sv` mismatch / invalidation) | 401 | HTTP tests |
| Suspended user | 403 | HTTP tests |
| Credential reset required / invalidated flows | 401/403 per flow | HTTP tests |
| Expired token | 401 | Implemented; **covered by isolated HTTP test** (`expired token -> 401`) |
| Citizen ownership boundaries | own/scoped access only | HTTP tests |
| Department isolation & officer boundaries | dept/assignment scoped; cross-dept denied | HTTP tests |
| Incident lifecycle transitions | invalid transitions/state-closed actions rejected | HTTP + DB smoke tests |
| Privilege escalation attempts | no privileged self-register; admin cannot self-change/suspend; invalid role/status rejected | HTTP tests |

## 5. Coverage status and gaps

- **Automated evidence (latest):** `npm run test:security` **46 passed, 0 failed**; `npm run test:security:http` **315 passed, 0 failed** (**361 total isolated assertions**, includes expired-token rejection).
- **Not exhaustive:** full negative matrix for every role × endpoint × method × state/transition/field combination is **not** proven. Residual gaps include complete state permutations, all export/filter/nested-payload edge cases, and concurrency/abuse scenarios.
- **Runtime production behavior** (deployed config, TLS/proxy, multi-instance rate limiting, frontend CSP compatibility) is **not verified**.

## 6. Safety statement

All automated tests referenced were executed against **isolated temporary databases/ephemeral servers/test secrets**. **No existing application data (`.scip_database.json`) was modified, reset, migrated, or overwritten.** No production/Atlas/external database was accessed.
