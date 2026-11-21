# Clerk phone_number Parameter Fix

## Root Cause
`src/context/AuthContext.tsx` `register()` passed `phoneNumber: params.phone` to Clerk's `signUp.create()`. Clerk rejects this parameter when phone number authentication is not enabled in the Clerk Dashboard.

## Fix
Removed `phoneNumber` from the Clerk `signUp.create()` payload. Phone number is still collected in the signup form and can be stored as a SCIP profile field during onboarding, but is no longer sent to Clerk as an authentication identifier.

## Affected Files
- src/context/AuthContext.tsx (register function)

## Tests
- typecheck: PASS
- build: not re-run (no build-affecting change)

## Remaining Blockers
- Live Clerk sign-in still requires user to complete Clerk Dashboard email verification settings.
- Phone number profile storage in SCIP not yet wired (phone collected but not persisted to SCIP profile during onboarding).
EOF