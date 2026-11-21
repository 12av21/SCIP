# SCIP MongoDB Migration Inventory

## Source: .scip_database.json

| Collection | Records | Target |
|---|---|---|
| users | 10 | users |
| departments | 4 | departments |
| reports | 29 | reports |
| incidents | 3 | incidents |
| analyses | 29 | analyses |
| assignments | 0 | assignments |
| resolutions | 0 | resolutions |
| inspections | 6 | inspections |
| notifications | 30 | notifications |
| feedbacks | 10 | feedbacks |
| auditLogs | 173 | auditLogs |
| ipSecurityLogs | 692 | ipSecurityLogs |
| clerkLinks | 0 | clerkLinks |
| adminStates | 36 | adminStates |
| adminDistricts | 20 | adminDistricts |
| adminSubDistricts | 6 | adminSubDistricts |
| adminBlocks | 5 | adminBlocks |
| adminLocalities | 6 | adminLocalities |
| administrativeBoundaries | 4 | administrativeBoundaries |

## Migration Status
- Dry-run inventory: COMPLETE
- Migration execution: NOT STARTED (awaiting operator approval)
- MongoDB active: YES (connected to scip_dev)
- Native auth: PASS (cookie-based JWT)

## Blockers
- Migration script not yet created (scripts/migrate-json-to-mongodb.mts)
- Operator approval required before execution
EOF