# Clerk Sign-In Rejection Investigation

## Root Cause (Hypothesis)
Clerk Dashboard records `sign_in.rejected` with no useful error. Likely causes:
1. Frontend publishable key and backend secret key belong to different Clerk applications or environments.
2. Authorized parties / allowed origins mismatch between frontend origin and backend `CLERK_AUTHORIZED_PARTIES`.
3. Email verification or OTP flow not completed.
4. Account-linking state: Clerk user exists but no SCIP account linked.

## Affected Files
- src/main.tsx (Clerk provider init)
- src/context/AuthContext.tsx (token retrieval)
- src/server/middleware/auth.ts (token verification)
- src/server/routes/linkingRoutes.ts (account linking)
- src/components/views/AuthModal.tsx (sign-in UI)
- src/components/views/AccountLinkingModal.tsx (linking UI)

## Configuration Required From User
- Verify CLERK_SECRET_KEY and VITE_CLERK_PUBLISHABLE_KEY belong to the same Clerk application.
- Verify CLERK_AUTHORIZED_PARTIES includes the frontend origin (http://localhost:3000).
- Complete email verification in Clerk Dashboard if required.
- Check Clerk Dashboard sign-in settings (allowed strategies: password, email code, etc.).

## Tests Executed
- typecheck: PASS
- build: PASS
- frontend: 7 PASS
- phase32: 11 PASS

## Clerk Dashboard Action Required

When attempting sign-up, Clerk returns:
"phone_number is not a valid parameter for this request. Please ensure the appropriate settings are enabled in the Clerk Dashboard."

This means the frontend code or Clerk SDK is sending `phone_number` in the sign-up request, but phone number authentication is not enabled in the Clerk Dashboard.

### Fix (User action in Clerk Dashboard)
1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to User & Authentication → Email, Phone, Username
4. Enable "Phone number" as an identifier (or disable phone in your app if not needed)
5. Save changes

### Code-side alternative
If phone number is not needed, ensure the signup form does not collect/pass phone_number to Clerk's signUp.create(). Check AuthModal.tsx and AccountLinkingModal.tsx for any phone field being passed to Clerk.
- Live Clerk sign-in cannot be verified without user completing Clerk Dashboard configuration and email verification.
- No automation framework available for browser E2E.

## Manual Clerk Dashboard Verification Steps
1. Open Clerk Dashboard → your application.
2. Go to API Keys → confirm publishable and secret keys match the .env values.
3. Go to Sessions → check authorized parties include http://localhost:3000.
4. Go to User & Authentication → Email, Phone, Username → verify enabled strategies.
5. Attempt sign-in and check Logs for detailed rejection reason.
6. Check if email verification is required and complete it.
EOF