# SCIP Feature Verification Plan

## 19 Features Covered

### FUNCTIONAL (8)
1. Login/Signup UI - AuthModal, AuthContext, /api/auth - evidence: typecheck
2. Citizen Dashboard - CitizenDashboard.tsx, /api/reports?myOnly - 11+7+45 tests
3. Report Submission (backend) - SubmitReportView, POST /api/reports - security tests
4. Report Tracking - TrackReportView, GET /api/reports/:id - E2E smoke
5. Image Upload - SubmitReportView, POST /api/image/upload - magic-byte validation
6. Image GET Auth - imageRoutes, GET /api/image/:id - ownership check
7. AI Classification (TS) - classifier.ts - code inspection
8. Notifications - GovernmentHeader, /api/notifications - code inspection

### UNVERIFIED (9)
9. Officer Dashboard - FieldOfficerDashboard, /api/incidents - needs auth + API tests
10. Dept Officer Dashboard - DeptOfficerDashboard, /api/incidents - needs auth
11. Analyst Dashboard - AnalystDashboard, /api/intelligence - needs auth
12. Authority Dashboard - AuthorityDashboard, /api/intelligence - needs auth
13. Admin Panel - AdminPanelView, /api/admin - needs auth
14. Profile Management - AccountLinkingModal, /api/auth/profile - needs auth
15. Audit Logs - AdminPanelView, /api/admin/audit-logs - needs auth
16. Report Export - AnalystDashboard, /api/intelligence/export-csv - needs auth
17. Geospatial - GeospatialMap, /api/map - needs auth

### PARTIAL (1)
18. Account Linking - AccountLinkingModal, /api/linking - phone_number fix done, live test needed

### BLOCKED (1)
19. Login live auth - AuthModal, Clerk SDK - requires user Clerk Dashboard interaction

## Verification Phases

### Phase 1: Auth (BLOCKED → user action)
- Unblock: user enables email auth in Clerk Dashboard
- Exit: real sign-in success

### Phase 2: Officer/Dept/Auth/Analyst/Admin Dashboards
- Requires: live auth token
- Test: API calls with token, verify RBAC
- Exit: all dashboards load with correct data

### Phase 3: Profile, Audit, Export, Geospatial
- Requires: live auth token
- Test: API calls, verify data
- Exit: all pass

### Phase 4: E2E Browser
- Requires: Playwright + live auth
- Exit: browser tests pass

## Safety
- No source code modified
- No DB modified
- All work preserved
EOF