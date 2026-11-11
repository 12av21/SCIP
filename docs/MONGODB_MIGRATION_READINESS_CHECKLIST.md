# MongoDB Migration Readiness Checklist (Phase 12)

**Project:** SCIP  
**Date:** 2026-11-11  
**Status:** **READINESS / PLANNING ONLY — NO MIGRATION EXECUTED.**  
**Inputs:** `docs/PERSISTENCE_MIGRATION_DESIGN.md`, `src/database/scipDatabase.ts`, `src/database/models/*`, `src/database/mongoConnection.ts`, `src/types/scip.ts`, route/service behavior.  
**Constraints honored:** No MongoDB/Atlas/production connection, no runtime integration/cutover, no modification of `.scip_database.json`, no seed/destructive operations.

## 1. Readiness gate (must be satisfied before any implementation/migration)

- [ ] **Explicit project-owner approval** for Phase 6 runtime work and target environment
- [ ] **Isolated target database/environment** provisioned (never production/existing user data)
- [ ] **Approved maintenance window and rollback authority**
- [ ] **Current file-backed data frozen/backed up** (quiesced snapshot) for migration source (read-only use)
- [ ] **No concurrent writes** to source during extraction/cutover window (single-process stop/quiesce plan)
- [ ] **Security/privacy policy decisions finalized** (audit field exposure, metrics scope) as applicable
- [ ] **Test secrets and credentials managed outside repo**; `.scip_database.json` and prod data untouched

**Current gate status:** **NOT MET** (explicit approval and isolated target not granted in this phase).

## 2. Current-state summary

| Aspect | Current state | Migration implication |
|---|---|---|
| Runtime persistence | File-backed in-memory engine, atomic JSON persist (`.scip_database.json` / `SCIP_DB_PATH`) | Repository abstraction/cutover required |
| Concurrency model | Single-process, in-memory maps | Mongo path must define write concurrency, idempotency, and transaction boundaries |
| Mongoose artifacts | Connection manager + schemas/models (`User`, `Report`, `Incident`, auxiliary models) exist but **not integrated** | Parity gaps must be closed before use |
| Audit integrity | App-level hash chain, canonical+legacy verification, no rewrite-on-load | Hash computation/serialization parity and append ordering must be preserved exactly |
| IDs/counters | Application-generated IDs in DB layer (implementation-specific) | ID/counter strategy must be deterministic and collision-safe in multi-process context |

## 3. Entity mapping (proposed)

| Runtime entity / collection (current) | Proposed Mongo collection | Source of truth (types/model) | Mapping notes / parity checks |
|---|---|---|---|
| Users | `users` | `src/types/scip.ts` `User`, `models/User.ts` | Include `sessionVersion`, `credentialsResetRequired`, `status`, role, department, timestamps; **never store/return plaintext passwords**; verify hash fields and auth semantics |
| Departments | `departments` | `Department` type, auxiliary model | Preserve IDs/codes and category coverage if present |
| Reports | `reports` | `Report`, `models/Report.ts` | Preserve coordinates, status/category/urgency enums, citizen linkage, incident linkage, timestamps |
| Incidents | `incidents` | `Incident`, `models/Incident.ts` | Preserve reportIds array, workflow status, priority/severity/confidence, assignment/review/resolution fields |
| Assignments | `assignments` (if persisted separately) or embedded/derived per parity | `Assignment` type | Confirm current in-memory/file persistence behavior and API expectations |
| Inspections | `inspections` | `InspectionRecord` type | Preserve checklist/evidence/recommendation/verification fields and incident linkage |
| Resolutions | `resolutions` (if separate) or incident fields per parity | `Resolution` type | Map to current behavior without changing workflow semantics |
| Notifications | `notifications` | auxiliary model/type | User linkage, read state, ordering semantics |
| Feedback | `feedback` | auxiliary model/type | Ownership/linkage validation parity |
| Audit logs | `auditlogs` | `AuditLog`, auxiliary model | **Critical:** preserve `id,timestamp,action,module,recordId,userId,userEmail,userRole,ipAddress,details,hash,prevHash` semantics and chain ordering; verify canonical/legacy compatibility policy |
| AI analyses / derived caches | `analyses` or persisted structure per current DB | `AIAnalysis` and in-memory maps | Confirm whether/how analyses are persisted and required for parity |
| Counters/sequences | `counters` (recommended) | DB ID generation behavior | Required for deterministic ID generation under concurrency |

> **Action:** produce field-level mapping matrix during implementation (types ↔ Mongoose schema ↔ migration transform ↔ validators/defaults).

## 4. Repository implementation plan (no runtime cutover yet)

1. **Introduce repository interfaces** mirroring `SCIPDatabase` behaviors (queries, mutations, guards, audit append/verify, scoping helpers as needed).
2. **Implement Mongo repositories** with schema validation, indexes, pagination, and equivalent business invariants (not just CRUD).
3. **Preserve API contracts** and authorization/scoping/PII-minimization behavior.
4. **Wire behind feature flag/config** (e.g. explicit storage backend selector) — **disabled by default**; no auto-migration on startup.
5. **Add isolated parity/integration tests** running against a dedicated test MongoDB (never prod/existing data).
6. **Performance/load sanity checks** for list/query/export paths on representative isolated datasets.

## 5. Index strategy (proposed baseline)

| Collection | Proposed indexes | Purpose |
|---|---|---|
| `users` | unique `id`, unique `email` (normalized), `role`, `status`, `departmentId` | auth lookup, admin filters, scoping |
| `reports` | unique `id`, `citizenId`, `status`, `category`, `urgency`, `incidentId`, `createdAt` desc, geo index if geo queries needed | list/filter/scoping/timeline |
| `incidents` | unique `id`, `status`, `category`, `priority`, `assignedDepartmentId`, `assignedOfficerId`, `createdAt` desc | queues/scoping/workflows |
| `inspections` | unique `id`, `incidentId`, `officerId`, `createdAt` desc | incident inspection retrieval/verification |
| `assignments` | unique `id`, `incidentId`, `departmentId`, `officerId` | workflow/history |
| `notifications` | unique `id`, `userId`, `read`, `createdAt` desc | user inbox queries |
| `feedback` | unique `id`, `userId`, `reportId`, `incidentId`, `createdAt` desc | scoped feedback queries |
| `auditlogs` | unique `id`, `timestamp`/append order key, `module`, `action`, `userId`, optional compound for filters | governance queries and integrity verification order |
| `departments` | unique `id`, unique `code` | lookups/admin |
| `counters` | unique `_id`/name | atomic sequence allocation |

**Note:** finalize with query plans and write/read patterns from actual route usage; avoid over-indexing.

## 6. Referential integrity and consistency strategy

- **Application-level integrity (current parity):** enforce existence/ownership/department/state checks as in `scipDatabase` and routes.
- **Mongo constraints:** unique indexes for business keys; required fields/enum validation in schemas.
- **Cross-document consistency:** use transactions for multi-document operations **where required and supported** (replica set). If standalone Mongo is used, document non-transactional risks and compensating safeguards.
- **No cascading destructive behavior** without explicit safeguards; preserve auditability.
- **Incident/report linkage:** maintain bidirectional consistency (`incidentId` on reports, `reportIds` on incidents) via controlled transactional/retry logic.

## 7. Data parity verification plan (pre-cutover, isolated)

- [ ] **Record counts** per entity/collection match source snapshot
- [ ] **Per-record checksum/hash comparison** for stable serialized representations (excluding approved runtime-only fields)
- [ ] **ID/set equality** for all primary entities and relationships (report↔incident, inspections↔incidents, notifications↔users, etc.)
- [ ] **Audit chain parity:** verify hash chain validity and identical ordered audit semantics in target (or documented, approved differences — none expected)
- [ ] **Permission/scoping parity tests:** rerun isolated security suites against Mongo-backed implementation
- [ ] **Spot/manual sampling** for sensitive and workflow-critical records
- [ ] **Export parity checks** (counts/headers/scoping/PII rules) on isolated data

## 8. Backup and restore strategy

- **Pre-migration backup:** quiesced copy of `.scip_database.json` (and any related artifacts) stored securely, read-only, integrity-checked (hash recorded).
- **Target backups:** MongoDB backups/snapshots (e.g. `mongodump`/managed snapshots) before cutover and after successful validation; retention policy defined by owner.
- **Configuration backup:** environment/config manifests (without secrets committed).
- **Verification:** backup integrity checksums and catalog of backup timestamps/locations.

## 9. Restore test plan (isolated)

- [ ] Restore target backup into a **separate isolated environment**
- [ ] Run `npm run typecheck`, `npm run build`, and isolated security suites against restored environment (with safe test config)
- [ ] Verify application boot, auth, critical read/write workflows, and audit verification on restored data
- [ ] Confirm no connection to production/existing user data during restore tests
- [ ] Document restore duration, steps, and any gaps

## 10. Rollback plan

| Trigger | Action | Owner/approval |
|---|---|---|
| Parity mismatch, integrity failure, critical regression, or operational issue | **Abort cutover**; keep/restore file-backed runtime as active source | Project owner + ops |
| Post-cutover defect within rollback window | Repoint app to known-good file-backed snapshot (if compatible) or restore pre-cutover Mongo snapshot and revert config; disable migration flag | Project owner + ops |
| Data corruption suspicion | Freeze writes, preserve evidence, restore last verified backup, run integrity/parity checks | Project owner + ops |

**Requirements:** rollback steps rehearsed in isolated environment; no destructive actions on original production/user data.

## 11. Cutover checklist (only after all gates pass)

- [ ] All parity, security, functional, and restore tests **PASS** in isolated target
- [ ] Approved rollback artifacts available and verified
- [ ] Monitoring/logging and access controls configured for target environment
- [ ] Maintenance/quiesce window executed; source snapshot finalized
- [ ] Migration run completed and reconciled
- [ ] Post-migration verification (counts, checksums, audit verify, smoke workflows) completed
- [ ] Controlled enablement of Mongo-backed runtime (feature/config switch)
- [ ] Post-cutover monitoring period and sign-off recorded
- [ ] Documented outcome and any deviations

## 12. Explicit approval gates (no execution without approval)

1. **Gate A — Design/plan approval:** approve entity mapping, repository plan, and this checklist.
2. **Gate B — Environment approval:** approve isolated Mongo target, credentials handling, and network access controls.
3. **Gate C — Migration execution approval:** approve read-only source extraction and write to isolated target only.
4. **Gate D — Cutover approval:** approve runtime switch after parity/restore/rollback evidence.
5. **Gate E — Production approval (separate):** only after independent security/operational readiness evidence.

## 13. Current migration status

- **Implemented:** design documentation, Mongoose schemas/connection scaffolding (non-integrated), isolated DB-path/test harness support.
- **Not implemented:** runtime repository integration, migration tooling/execution, parity run, backup/restore drill, cutover.
- **Declaration:** **MIGRATION READY: NO** (planning/readiness documented; execution blocked pending approvals and implementation).

## 14. Safety statement

No migration was executed. No MongoDB/Atlas/production database was connected. **`.scip_database.json` and existing application data were not modified, reset, migrated, or overwritten.**
