# DATA PRIVACY & EXPOSURE POLICY PROPOSAL (Phase 12)

**Project:** SCIP  
**Date:** 2026-11-11 (updated with Option B implementation)  
**Status:** **Option B (Balanced governance) — SELECTED/IMPLEMENTED for feasible in-repo controls; role-scope confirmation items documented.**  
**Basis:** Source inspection of server routes, middleware, database/types, and isolated test observations. This is not a legal/compliance determination.

## 1. Purpose

Inventory sensitive/personal/internal data currently returned or logged by APIs, document the adopted minimization controls (Option B), and record remaining role-scope confirmations and implications. Final operational/governance acceptance requires project-owner sign-off.

## 2. Adopted policy (Option B) — implemented in-repo

| Area | Implemented behavior | Code / evidence |
|---|---|---|
| Hardened omissions (kept) | Auth/admin responses omit `passwordHash`, `sessionVersion`, `credentialsResetRequired`; audit-log list omits `hash`, `prevHash`, `metadata`; analyst report/linked-report/eligible export PII minimization retained | `authRoutes.ts`, `adminRoutes.ts`, prior Phase 4/5 hardening; isolated tests |
| Audit logs (`GET /api/admin/audit-logs`, `audit.read`) | Retains `userEmail` and `details` for governance; **masks last IP segment** (`maskIp`); adds structured **`detailCode`** (`AUDIT_<ACTION>`); redacts known-sensitive patterns in `details` (emails, bearer/JWT-like tokens, long quoted strings, phone-like patterns, narrative after `Notes/Reason:` labels; bounded length) | `src/server/routes/adminRoutes.ts`; HTTP tests assert `detailCode`, masked `ipAddress`, retained governance fields |
| Admin users (`GET /api/admin/users`, `user.read`) | **Admin:** full directory fields (excluding credential/session internals). **Authority:** reduced directory view (excludes direct contact fields `email`, `phone`, in addition to internals) | `src/server/routes/adminRoutes.ts`; HTTP tests assert admin retains `email`, authority omits `email`/`phone` |
| Intelligence/model metrics | Permission gating unchanged: `model-metrics` requires `model.evaluate`; `dataset-quality`/`trends` require `analytics.read`; exports require `data.export` | `intelligenceRoutes.ts`, `middleware/auth.ts` |

**Validation (isolated):** `typecheck` PASS, `test:security` **46/46 PASS**, `test:security:http` **314/314 PASS** (**360 total**). `.scip_database.json` unchanged.

## 3. Data categories inventoried

| Category | Examples in SCIP | Primary locations |
|---|---|---|
| Citizen identity/contact PII | `citizenName`, `citizenEmail`, report owner fields, user `email`, `phone`, `name` | `Report` records; report/incident views & exports (role/scoped); `GET /api/admin/users` (admin full, authority reduced) |
| Location data | `locationName`, `latitude`, `longitude`, geospatial clusters/hotspots | Reports/incidents/intelligence endpoints/exports |
| User account/admin data | role, status, department, timestamps; sensitive internals (`passwordHash`, `sessionVersion`, `credentialsResetRequired`) **never exposed** | `User` model, auth/admin endpoints |
| Audit actor/trace data | `userId`, `userEmail`, `userRole`, `ipAddress` (masked in list), `details` (redacted), `detailCode`, action/module/record/timestamps | `AuditLog`; `GET /api/admin/audit-logs`, `GET /api/admin/audit-verify` |
| Internal incident/operational details | review/resolution/assignment/inspection notes and evidence fields | Incident/inspection endpoints, exports, notifications |
| Intelligence/model metrics & analytics | classifier metrics, confusion/per-category stats, dataset quality, clusters/hotspots/trends, agent outputs | `/api/intelligence/*` |
| Authentication/session material | JWTs, passwords, reset/change inputs, session versions | Must not be logged/exposed |
| Infrastructure/secrets | `JWT_SECRET`, `MONGODB_URI`, connection strings, API keys | Must not be logged/exposed |

## 4. Current endpoint exposure (post–Option B)

| Endpoint(s) | Data returned / behavior | Roles | Notes |
|---|---|---|---|
| `POST /api/auth/register|login|demo-login`, `GET /api/auth/me` | Sanitized user (no password/session internals); token on auth flows | public/auth/dev-gated | Demo-login dev-only/opt-in |
| `GET /api/reports*`, incident linked reports | Scoped access; analyst omits citizen name/email in hardened paths | per RBAC+scoping | Not exhaustively proven for every nested field |
| `GET /api/intelligence/export-csv` | Scoped/validated; analyst report export omits citizen PII columns; CSV-safe | `data.export` | PII policy per role as implemented |
| `GET /api/admin/users` | Omits auth internals; **admin:** includes email/phone; **authority:** omits email/phone | `user.read` (admin, authority) | Option B implemented |
| `GET /api/admin/audit-logs` | Omits hash/prevHash/metadata; retains `userEmail`, `details` (redacted), masked `ipAddress`, adds `detailCode` | `audit.read` (admin, authority) | Option B implemented |
| `GET /api/admin/audit-verify` | Integrity result only | `audit.read` | Read-only |
| `GET /api/intelligence/model-metrics` | Classifier/model evaluation metrics | `model.evaluate` (analyst, admin) | **Authority lacks access (see §5)** |
| `GET /api/intelligence/dataset-quality`, `/trends` | Aggregate analytics signals | `analytics.read` (dept_officer, analyst, authority, admin) | Policy scope as implemented |
| `GET /api/admin/system-stats` | Runtime/db counts (no secrets) | authority, admin | Role-guarded |

## 5. Role-scope confirmations (project-owner confirmed 2026-11-11)

| Item | Current implementation | Decision/status |
|---|---|---|
| Authority access to `GET /api/admin/users` | Allowed via `user.read`; **reduced view (no email/phone)** under Option B | **Confirmed intended** (project owner, 2026-11-11) |
| Authority access to audit logs | Allowed via `audit.read`; receives `userEmail`, redacted `details`, masked `ipAddress`, `detailCode` | **Confirmed intended** (project owner, 2026-11-11) |
| Authority access to `model-metrics` (`/api/intelligence/model-metrics`) | **Not permitted** (`model.evaluate` not granted to authority; currently analyst/admin only) | **Confirmed intended — keep denied** (project owner, 2026-11-11) |
| Authority access to `dataset-quality` / `trends` | Permitted via `analytics.read` (and authority has `data.export`) | **Confirmed intended** (project owner, 2026-11-11) |

> Option B selected and confirmed: `model.evaluate` / `analytics.read` gating and the above exposure scopes are documented and approved as currently implemented. Any future change (e.g. granting authority `model.evaluate`) requires explicit approval and corresponding implementation/test/doc updates.

## 6. Residual privacy/governance risks

1. **Redaction is pattern-based, not perfect:** free-form `details`/notes may still contain sensitive content not matching current patterns; structured logging/codes should be preferred long-term.
2. **Not exhaustively proven:** all nested intelligence/agent payloads and future fields require ongoing schema/response review and regression tests.
3. **Admin full directory:** includes contact/identity fields by necessity; access is RBAC-gated but remains sensitive.
4. **Logs/exports outside audited paths:** system/runtime logs and all export/reporting surfaces need continued review.

## 7. Safety statement

Policy implemented from repository inspection and isolated validation only. **No existing application data was modified, and no production data was accessed.** Governance acceptance/confirmation of role scopes in §5 remains with the project owner.
