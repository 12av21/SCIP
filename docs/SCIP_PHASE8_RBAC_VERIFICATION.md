# SCIP Phase 8 RBAC Verification

## Route-to-Permission Audit
- All /api/* use authenticate middleware
- requirePermission per endpoint
- canAccessReport for ownership
- Image GET: owner/privileged (Phase 3.1)

## Test Results
- security-smoke: 45 PASS
- Unauth POST /api/reports → 401 (live server test)

## Cross-Role: BLOCKED (requires live auth)
## DB: unchanged
EOF