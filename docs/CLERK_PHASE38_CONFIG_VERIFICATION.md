# Clerk Phase 3.8 Configuration Verification

## Environment Variable Names (values not printed)
- VITE_CLERK_PUBLISHABLE_KEY: Frontend Clerk publishable key (pk_test_...)
- CLERK_SECRET_KEY: Backend Clerk secret key (sk_test_...)
- CLERK_AUTHORIZED_PARTIES: Comma-separated allowed origins for token verification
- DATABASE_DRIVER: json (default) or mongo
- SCIP_TEST_DB_PATH: Isolated test DB path (test mode only)

## Expected Frontend Origin
- http://localhost:3000 (Vite dev server default)

## Expected Backend Authorized Parties
- Should include http://localhost:3000
- Configured via CLERK_AUTHORIZED_PARTIES env var

## Checks

| Check | Status | Evidence |
|-------|--------|----------|
| VITE_CLERK_PUBLISHABLE_KEY defined | PASS | src/main.tsx line 6 |
| CLERK_SECRET_KEY defined | PASS | .env.example line 9 |
| Authorized parties configurable | PASS | auth.ts getAuthorizedParties() |
| Account linking route exists | PASS | linkingRoutes.ts |
| Onboarding creates citizen role | PASS | createClerkCitizen in scipDatabase |
| Frontend/backend same Clerk app | BLOCKED | Cannot verify without comparing key prefixes (not printed) |
| Live sign-in | BLOCKED | Requires real Clerk interaction |

## Mismatches / Missing
- CLERK_AUTHORIZED_PARTIES must be set to include http://localhost:3000 for local dev.
- If not set, tokens may be rejected (authorizedParties empty = no restriction, but Clerk may still reject origin).

## Account Linking
- New user flow: Clerk signup → backend verifies token → createClerkCitizen → citizen role.
- Existing user flow: linking request → OTP challenge → admin approval.
- No automatic linking by email alone (verified in code).

## Remaining Blockers
- Live Clerk sign-in not verified.
- User must confirm Clerk Dashboard settings match .env.
EOF