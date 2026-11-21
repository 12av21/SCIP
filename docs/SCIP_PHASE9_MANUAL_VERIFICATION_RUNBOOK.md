# SCIP Phase 9 Manual Verification Runbook

## Steps (User Action Required)
1. Set CLERK_AUTHORIZED_PARTIES=http://localhost:3000 in .env
2. Start: NODE_ENV=test SCIP_TEST_DB_PATH=tmp/test.db npm run dev -- --port 3001
3. Open http://localhost:3000
4. Sign up with test email
5. Complete OTP verification
6. Sign in - verify dashboard loads
7. Refresh - session persists
8. Sign out - redirects to login
9. Test each role dashboard (requires 6 test accounts)
10. Verify unauthorized access returns 401/403

## Do Not
- Share OTPs or tokens
- Use production data
- Modify .scip_database.json
EOF