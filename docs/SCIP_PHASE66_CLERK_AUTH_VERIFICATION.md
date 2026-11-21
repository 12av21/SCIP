# SCIP Phase 6.6 Clerk Auth Verification

## Configuration Audit
- VITE_CLERK_PUBLISHABLE_KEY: defined (pk_test_...)
- CLERK_SECRET_KEY: defined (sk_test_...)
- CLERK_AUTHORIZED_PARTIES: must include http://localhost:3000
- Account linking: implemented (linkingRoutes.ts)
- Citizen onboarding: createClerkCitizen in scipDatabase
- RBAC: 6 roles preserved

## Test Readiness (Playwright)
- Sign-in page render: PASS (e2e tests)
- Sign-up page render: PASS
- Unauthenticated API rejection: PASS (401, Phase 3.5)

## Live Auth Status: BLOCKED
Requires user to:
1. Enable email auth in Clerk Dashboard
2. Sign up with real email
3. Complete OTP verification
4. Sign in
5. Verify session persists on refresh

## Manual Verification Steps
1. Set CLERK_AUTHORIZED_PARTIES=http://localhost:3000 in .env
2. Start: NODE_ENV=test SCIP_TEST_DB_PATH=tmp/test.db npm run dev -- --port 3001
3. Open http://localhost:3000
4. Click Sign Up, enter email + password
5. Complete email OTP
6. Verify redirect to dashboard
7. Refresh page - session should persist
8. Sign out
9. Verify protected routes redirect to login

## Commands Run
- npx playwright test (e2e/): 6 PASS
- npm run typecheck: PASS
- npm run build: PASS

## Database
- .scip_database.json: UNCHANGED

## Secrets
- No secrets exposed in any doc or output
EOF