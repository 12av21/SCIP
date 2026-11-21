# SCIP Phase 7.1 Clerk Configuration Remediation

## Configuration Added
- CLERK_AUTHORIZED_PARTIES=http://localhost:3000 in .env.example

## Format
- Comma-separated origins
- Parsed by getAuthorizedParties() in auth.ts
- Passed to Clerk verifyToken as authorizedParties option

## Security
- Empty list = no origin restriction (Clerk default)
- Non-empty = strict origin check on tokens
- No secrets exposed

## Tests
- typecheck: PASS
- security-smoke: 45 PASS
- build: PASS

## Live Auth Status
- BLOCKED (requires user Clerk Dashboard interaction)

## Remaining Manual Steps
1. User sets CLERK_AUTHORIZED_PARTIES in .env
2. User enables email auth in Clerk Dashboard
3. User signs up and verifies
EOF