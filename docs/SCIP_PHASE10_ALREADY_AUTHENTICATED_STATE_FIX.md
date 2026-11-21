# SCIP Phase 10 Already-Authenticated State Fix

## Root Cause
AuthModal did not check isAuthenticated. When a user was already signed in, the sign-in form remained visible.

## Fix
Added useEffect in AuthModal that closes the modal and navigates to the correct role dashboard when isAuthenticated && user.

## Files Modified
- src/components/views/AuthModal.tsx

## Tests
- typecheck: PASS

## Live Verification
- BLOCKED (requires user)

## DB
- .scip_database.json: unchanged
EOF