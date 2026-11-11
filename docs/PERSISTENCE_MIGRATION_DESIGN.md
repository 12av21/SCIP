# Persistence Migration Design (Phase 6)

This document captures the Phase 6 persistence migration design for SCIP. **Design only — no data migration, no runtime repository cutover, no connection to production/existing databases, and no modification of .scip_database.json.**

- Current active store: file-backed in-memory engine (src/database/scipDatabase.ts -> .scip_database.json, atomic rename persist, single-process).
- Mongoose models/connection exist (src/database/models/*, src/database/mongoConnection.ts) but are not integrated into runtime routes/services.

## Options
- **A. Constrained single-process JSON:** interim hardening only (write serialization, single-instance constraint, quiesced backups, API pagination). No multi-process safety, no DB transactions/constraints.
- **B. Integrated MongoDB/Mongoose repositories (recommended long-term):** explicit repositories, schema/index/transaction parity, server-side queries/pagination, standard backup/restore. Requires replica set for multi-document transactions (as applicable), isolated parity testing, and operator-approved offline migration.

## Prerequisites before any implementation/migration
1. Explicit approval and isolated test database (never production/existing user data).
2. Repository abstraction and parity implementation for all SCIPDatabase behaviors/invariants.
3. Offline, read-only-source migration tooling to empty isolated target + reconciliation and rollback plan.
4. Dual-run verification, backup/restore drills, and approved cutover.

See docs/SECURITY_REMEDIATION_REPORT.md (Phase 6 section) for the full analysis and status labels.
