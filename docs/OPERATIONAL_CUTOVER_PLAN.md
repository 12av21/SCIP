# SCIP Operational Cutover Plan (MongoDB Runtime)

**Project:** SCIP  
**Date:** 2026-11-13  
**Status:** **PLAN ONLY — NO CUTOVER EXECUTED.** Requires explicit project-owner approval (Gate A-D) before any action. No production/Atlas/existing database connection; no modification of .scip_database.json.

## 1. Purpose and scope
Define the controlled, reversible path from the current file-backed JSON runtime to the explicitly gated MongoDB runtime, preserving the existing app, six-role system, workflows, and user data.

## 2. Current state (verified, isolated)
- Active runtime: file-backed JSON (JsonScipRepository over SCIPDatabase); default/fallback.
- Mongo runtime: full behavioral parity in MongoScipRepository (audit chain, user/admin, notifications, feedback, report/incident/inspection workflows, AI analysis, metrics) with transactions and counter-backed IDs.
- Gated enablement (src/database/index.ts): DATABASE_DRIVER=mongo + SCIP_MONGO_RUNTIME_INTEGRATED=true + non-production + local isolated scip_dev|scip_test* URI + connected target. No split-brain.
- Isolated evidence: 
pm run test:security:http with SCIP_TEST_DRIVER=mongo = 303/303 PASS on ephemeral DB; smoke 46/46; HTTP JSON 315/315; build PASS; .scip_database.json unchanged.

## 3. Pre-cutover prerequisites (all must pass)
- [ ] Gate A: design/plan + entity mapping + repository plan approved by project owner.
- [ ] Gate B: isolated Mongo target provisioned (local scip_dev only), credentials handled outside repo, network access controls.
- [ ] Gate C: read-only source extraction + write to isolated target only (no prod/existing data).
- [ ] Gate D: runtime switch after parity/restore/rollback evidence.
- [ ] Quiesced source snapshot frozen and integrity-checked (hash recorded).
- [ ] No concurrent writes to source during cutover window.
- [ ] Backup artifacts verified; rollback rehearsed in isolated environment.

## 4. Cutover phases
1. **Freeze/quiesce** source file-backed runtime; record snapshot hash.
2. **Pre-migration backup** of .scip_database.json (read-only, secure, checksum).
3. **Target backup** (mongodump/snapshot) before cutover; retention policy defined by owner.
4. **Migration run** (idempotent upserts; no destructive deletes) and reconciliation (counts, refs, audit chain).
5. **Post-migration verification**: counts, checksums, audit verify, smoke workflows, isolated security suites.
6. **Controlled enablement**: set DATABASE_DRIVER=mongo + SCIP_MONGO_RUNTIME_INTEGRATED=true + local isolated URI + connected target; confirm /api/health reports ctive=mongo, mongoRepositoryIntegrated=true, no fallback.
7. **Post-cutover monitoring period** with sign-off recorded.

## 5. Rollback triggers and actions
| Trigger | Action | Owner/approval |
|---|---|---|
| Parity mismatch, integrity failure, critical regression | Abort cutover; keep/restore file-backed runtime as active source | Project owner + ops |
| Post-cutover defect within rollback window | Revert config (disable migration flag); restore pre-cutover Mongo snapshot or known-good file-backed snapshot | Project owner + ops |
| Data corruption suspicion | Freeze writes, preserve evidence, restore last verified backup, run integrity/parity checks | Project owner + ops |

## 6. Restore test plan (isolated)
- [ ] Restore target backup into separate isolated environment.
- [ ] Run 
pm run typecheck, 
pm run build, isolated security suites against restored environment.
- [ ] Verify app boot, auth, critical read/write workflows, audit verification on restored data.
- [ ] Confirm no connection to production/existing user data during restore tests.
- [ ] Document restore duration, steps, and gaps.

## 7. Explicit non-claims
- Not production ready. Not security verified. Not runtime-verified for exhaustive scenarios. Not a substitute for penetration testing, compliance audit, or operational readiness review.
- No deployment/push/commit actions implied. No secrets, JWTs, API keys, or PII logged or published.

## 8. Safety statement
No cutover executed. No MongoDB/Atlas/production database connected. .scip_database.json and existing application data unchanged.
