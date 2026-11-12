# SCIP — Database Migration Guide (Snapshot → MongoDB, Isolated)

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-11  
**Scope:** Isolated/local migration preparation and evidence only. **No runtime cutover. No production/Atlas/existing external DB.**

## 1. Migration objective and safety model

Migrate SCIP data from the file-backed JSON snapshot (`.scip_database.json` or a read-only copy) into an **isolated local MongoDB database** with:

- **Read-only source:** source file never modified/deleted/reset.
- **No destructive target ops:** migration uses idempotent upserts; no collection drops/deletes required for recorded runs.
- **Strict target controls:** refuses non-local/hosted/Atlas/unsafe targets; requires explicit target DB name and confirmation flag.
- **Verification:** SHA-256/count/duplicate/missing/reference/audit-chain checks before/after; idempotency re-run validation.
- **No cutover:** application runtime remains file-backed JSON until full repository parity, integration tests, and explicit approval.

## 2. Tools

| Script | Purpose | Writes DB? | Writes source? |
|---|---|---:|---:|
| `scripts/mongo-migration-tool.mts` | `analyze` / `plan` from snapshot (counts, hashes, refs, audit validity, schema notes) | No | No |
| `scripts/mongo-migration-execute.mts` | Guarded `dry-run` / `execute` into isolated MongoDB | Dry-run: No; Execute: Yes (isolated target only) | No |

## 3. Prerequisites

1. **MongoDB running locally** (isolated), e.g. Windows service `MongoDB`, TCP `127.0.0.1:27017`.
2. **Dedicated database:** `scip_dev` (or explicitly approved isolated dev DB). Do **not** use production/Atlas/shared/existing user databases.
3. **Dependencies installed:** `npm install` (includes `mongoose`).
4. **Environment (local, not committed):** e.g. `.env` with `MONGODB_URI=mongodb://127.0.0.1:27017/scip_dev` for connectivity checks/tools as needed; runtime `DATABASE_DRIVER` remains `json`.
5. **Source snapshot:** prefer a read-only copy for operations; **`.scip_database.json` must remain unchanged**.

## 4. Safety guards (enforced by execute script)

- Rejects hosted/unsafe URIs (`mongodb.net`, `mongodb+srv://`, invalid formats) and non-local targets as implemented.
- Requires `--target-db scip_dev` (explicit isolated target).
- Requires confirmation token: `--confirm MIGRATE_TO_ISOLATED_SCIP_DEV`.
- Does not log secrets/URIs in evidence outputs.
- No runtime cutover flags enabled by this process.

## 5. Migration workflow

### 5.1 Analyze (read-only)
```bash
npx tsx scripts/mongo-migration-tool.mts analyze --source .scip_database.json
```
Outputs entity counts, duplicates/missing ID checks, referential issue counts, audit-chain validity, source hash/size/mtime context.

### 5.2 Plan (read-only)
```bash
npx tsx scripts/mongo-migration-tool.mts plan --source .scip_database.json
```
Produces migration plan summary (target collections/index considerations, idempotency strategy) without connecting/writing.

### 5.3 Dry run (no DB writes)
```bash
npx tsx scripts/mongo-migration-execute.mts dry-run --source .scip_database.json --target-db scip_dev --confirm MIGRATE_TO_ISOLATED_SCIP_DEV
```
Validates guards, parses/verifies source, computes operations/checks, reports `DRY_RUN_OK` when safe.

### 5.4 Execute (isolated target only)
```bash
npx tsx scripts/mongo-migration-execute.mts execute --source .scip_database.json --target-db scip_dev --confirm MIGRATE_TO_ISOLATED_SCIP_DEV
```
Performs idempotent upserts into `scip_dev` collections with post-load verification.

### 5.5 Idempotency verification
Re-run execute with same source/target/confirm flags. Expect `upserted: 0`, `modified: 0` (or equivalent matched state), `errors: 0`, counts/refs/audit still valid.

## 6. Recorded execution evidence (2026-11-11, isolated)

**Source (read-only):** `.scip_database.json`  
- SHA-256: `262e382aecea305066df58b0d9dd634d84c3dc91d1d6a9101e701e557c649baa`  
- Size: `159534` bytes, mtime `2026-11-09 15:30:38`  
- Audit integrity: `isValid: true`, `checkedCount: 67`  
- Referential issues: `0` | Duplicates: `{}` | Missing IDs: `{}`

**Entity counts (source == target):**
| Collection | Count |
|---|---:|
| users | 8 |
| departments | 4 |
| reports | 28 |
| incidents | 3 |
| analyses | 28 |
| assignments | 0 |
| resolutions | 0 |
| inspections | 6 |
| notifications | 29 |
| feedbacks | 10 |
| auditLogs | 67 |
| riskScores | 0 |

**Results:**
- **Dry run:** `DRY_RUN_OK`
- **Execute:** `EXECUTED_ISOLATED_TARGET`, successful upserts, `errors: 0`, parity checks passed
- **Idempotent re-run:** matched existing documents, `upserted: 0`, `modified: 0`, `errors: 0`
- **Data integrity impact:** `.scip_database.json` unchanged; no prod/Atlas/external DB used

> This verifies **isolated snapshot load correctness and idempotency**, not application runtime behavior against MongoDB.

## 7. Post-migration verification checklist (isolated)

- [x] Source hash and counts captured (read-only)
- [x] Target DB is isolated local `scip_dev`
- [x] All entity counts match
- [x] No duplicates/missing IDs/referential issues introduced
- [x] Audit chain valid in source and consistent post-load expectations
- [x] Idempotent re-run stable
- [ ] **Runtime repository parity tests against MongoDB** (pending implementation)
- [ ] **Application end-to-end flows on Mongo-backed runtime** (pending)
- [ ] **Rollback/restore drill evidence in approved environment** (pending)
- [ ] **Cutover rehearsal and approval** (pending)

## 8. Cutover prerequisites (not met)

Do **not** cut over runtime to MongoDB until:

1. `mongoRepository.ts` achieves full behavioral parity (CRUD, workflows/state transitions, notifications/side effects, audit hash-chain/IDs/counters/transactions, AI persistence/metrics, seed/reset semantics as applicable).
2. Mongoose schemas/indexes/constraints/transactions validated for parity.
3. Route/service code is fully async-safe for repository operations.
4. Exhaustive isolated parity and regression tests pass (`typecheck`, security suites, workflow/e2e as applicable).
5. Backup/restore and rollback procedures verified.
6. Explicit project-owner approval for controlled cutover (still isolated/staged before any production consideration).

## 9. Rollback strategy (design intent)

- **Before cutover:** rollback is trivial (runtime remains JSON). Isolated Mongo data can be discarded/recreated.
- **After approved cutover (future):** maintain verified JSON/file backup snapshots, Mongo backup/restore procedures, feature-flag/driver switch to `json` fallback where safe, and reconciliation checks. Any rollback execution requires explicit approval and must preserve user data.

## 10. Operational cautions

- Never run migration scripts against `.scip_database.json` in write mode (scripts are read-only for source).
- Never target hosted/Atlas/production/shared databases.
- Never commit `.env` or credentials.
- Treat migration success as **database-load verification only** until runtime parity is proven.
