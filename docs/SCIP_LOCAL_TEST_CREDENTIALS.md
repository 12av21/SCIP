# SCIP Local Test Credentials (DEVELOPMENT ONLY)

WARNING: These credentials are for local development testing only. Never use in production.

Database: Isolated test DB (SCIP_TEST_DB_PATH=tmp/manual_test_db.json)
Driver: JSON (file-backed) unless Mongo enabled
Auth: Native (AUTH_PROVIDER=native)

## Test Accounts
| Role | Email | Password | Dashboard |
|---|---|---|---|
| Citizen | citizen@test.scip | TestPass123! | citizen-dashboard |
| Field Officer | officer@test.scip | TestPass123! | field-officer-dashboard |
| Dept Officer | dept@test.scip | TestPass123! | dept-officer-dashboard |
| Analyst | analyst@test.scip | TestPass123! | analyst-dashboard |
| Authority | authority@test.scip | TestPass123! | intel-dashboard |
| Admin | admin@test.scip | TestPass123! | admin-panel |

Account creation method: Native registration endpoint (POST /api/auth/register) defaults to citizen role. Privileged roles must be assigned via admin operations (existing authorized mechanism).

Note: Native registration always creates citizen. To create privileged test accounts, use existing admin user management or seed data. Do not hardcode in production.

## Login URL
http://localhost:3000

## Environment
NODE_ENV=development
AUTH_PROVIDER=native
VITE_AUTH_PROVIDER=native
SCIP_FORCE_TEST_DB=1
SCIP_TEST_DB_PATH=tmp/manual_test_db.json
EOF