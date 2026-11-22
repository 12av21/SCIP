# SCIP Phase 20 Database Integrity Report

## Current SHA-256
CCA416B350B9718D68A47FBAAAC63FE0AA4F98B57BE1E465D4920FC70F53815F

## Baseline SHA-256
F743CCA936D2BF1F17D018DB2143D70EECC72B1B69FDDD3FDF2811E0BDA62B1E (git HEAD)

## JSON Syntax
VALID (parsed successfully)

## Semantic Comparison
- All collections except ipSecurityLogs: IDENTICAL (byte-for-byte JSON comparison)
- ipSecurityLogs: 85 → 219 (134 new entries from test/server runs)
- savedAt: changed (expected, timestamp of last write)

## Collection Counts
| Collection | Baseline | Current | Status |
|------------|----------|---------|--------|
| users | 10 | 10 | OK |
| departments | 4 | 4 | OK |
| reports | 29 | 29 | OK |
| incidents | 3 | 3 | OK |
| analyses | 29 | 29 | OK |
| inspections | 6 | 6 | OK |
| notifications | 30 | 30 | OK |
| feedbacks | 10 | 10 | OK |
| auditLogs | 173 | 173 | OK |
| ipSecurityLogs | 85 | 219 | GROWN (test runs) |
| adminStates | 36 | 36 | OK |
| adminDistricts | 20 | 20 | OK |
| adminSubDistricts | 6 | 6 | OK |
| adminBlocks | 5 | 5 | OK |
| adminLocalities | 6 | 6 | OK |
| administrativeBoundaries | 4 | 4 | OK |
| clerkLinks | 0 | 0 | OK |

## Conclusion
No data loss or corruption. All user, report, incident, and audit records are identical. ipSecurityLogs grew due to test/server activity (expected). The hash change is due to both formatting (pretty-print) and new IP security log entries.

## Files Modified
- None (read-only verification)
EOF