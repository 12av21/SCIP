# SCIP Phase 5 Browser & Auth Readiness

## Automation Infrastructure
- No Playwright, Cypress, or Selenium installed.
- No browser automation dependencies in package.json.
- Vite dev server + Express backend available.
- Isolated DB via SCIP_TEST_DB_PATH (test mode only).

## Dependencies Found
- None for browser automation.
- Installing would require user approval.

## Test Architecture (Proposed)
1. Landing page render
2. Auth modal (login/signup)
3. Submit Report form validation
4. Citizen Dashboard render
5. Track Report lookup
6. Unauthorized access handling

## Clerk Configuration Requirements
- VITE_CLERK_PUBLISHABLE_KEY (frontend)
- CLERK_SECRET_KEY (backend)
- CLERK_AUTHORIZED_PARTIES=http://localhost:3000
- Email verification enabled in Clerk Dashboard
- Phone auth: either enable in Dashboard or remove from signup (FIXED: removed from Clerk payload)

## Blocked Tests
- All browser E2E: no automation framework
- Live Clerk sign-up/sign-in: requires user interaction

## Manual Actions Required
1. Enable email auth in Clerk Dashboard
2. Set CLERK_AUTHORIZED_PARTIES in .env
3. Perform manual browser walkthrough

## Remaining Risks
- No automated browser regression coverage
- Live auth unverified
- No CI pipeline for E2E
EOF