# SCIP Phase 21 Test Database Isolation

## Root Cause
Tests/server runs without NODE_ENV=test use the default .scip_database.json. The isolated DB path (SCIP_TEST_DB_PATH) only activates in test mode. Security tests and server runs added IP security log entries to the primary DB.

## Existing Isolation Mechanism
- index.ts: SCIP_TEST_DB_PATH honored only when NODE_ENV=test
- Refuses to use .scip_database.json in test mode
- JsonScipRepository accepts storageFile param

## Recommendation
- All test scripts must set NODE_ENV=test + SCIP_TEST_DB_PATH
- Server runs for testing must use isolated DB path
- Never run tests against production DB

## Verification
- typecheck: PASS
- build: PASS
- DB hash: unchanged during this phase
- No primary records modified
EOF