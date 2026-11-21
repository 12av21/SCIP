# SCIP MongoDB Migration Plan

## Source
- File: .scip_database.json
- SHA-256: (computed at runtime)
- Collections: 19
- Total records: 1022

## Strategy
- Deterministic IDs preserved from source
- Upsert by source ID (idempotent)
- Conflict detection before write
- Resume via checkpoint file
- No destructive operations

## Collections
users, departments, reports, incidents, analyses, assignments, resolutions, inspections, notifications, feedbacks, auditLogs, ipSecurityLogs, clerkLinks, adminStates, adminDistricts, adminSubDistricts, adminBlocks, adminLocalities, administrativeBoundaries

## Safety
- No execution without operator approval
- Dry-run is read-only
- Source file never modified
EOF