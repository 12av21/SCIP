# SCIP Feature Functionality Matrix

## Status Legend
FUNCTIONAL | PARTIAL | UI ONLY | BACKEND ONLY | NOT IMPLEMENTED | BLOCKED | UNVERIFIED

## Features

| Feature | Frontend | Backend API | Service | DB | Auth | Permission | Status | Evidence |
|---------|----------|-------------|---------|-----|------|-----------|--------|----------|
| Login/Signup | AuthModal.tsx | /api/auth/* | auth.ts | users | Clerk Bearer | public | FUNCTIONAL (UI) / BLOCKED (live) | AuthModal, AuthContext |
| Citizen Dashboard | CitizenDashboard.tsx | /api/reports?myOnly | scipDatabase | reports | Clerk | report.read | FUNCTIONAL | 11+7+45 tests |
| Report Submission | SubmitReportView.tsx | POST /api/reports | reportRoutes | reports | Clerk | report.create | FUNCTIONAL (backend) / BLOCKED (live) | typecheck, security tests |
| Report Tracking | TrackReportView.tsx | GET /api/reports/:id | reportRoutes | reports | Clerk | report.read | FUNCTIONAL | E2E smoke |
| Image Upload | SubmitReportView.tsx | POST /api/image/upload | imageRoutes | imageStore | Clerk | image.upload | FUNCTIONAL | magic-byte validation |
| Image GET Auth | N/A | GET /api/image/:id | imageRoutes | imageStore | Clerk | image.read | FUNCTIONAL | ownership check added |
| AI Classification | N/A | (post-create) | scipDatabase | aiAnalysis | N/A | N/A | FUNCTIONAL (TS fallback) | classifier.ts |
| Notifications | GovernmentHeader.tsx | /api/notifications | miscRoutes | notifications | Clerk | N/A | FUNCTIONAL | code inspection |
| Officer Dashboard | FieldOfficerDashboard.tsx | /api/incidents | incidentRoutes | incidents | Clerk | incident.read | UNVERIFIED | no tests |
| Dept Officer Dashboard | DeptOfficerDashboard.tsx | /api/incidents | incidentRoutes | incidents | Clerk | incident.read | UNVERIFIED | no tests |
| Analyst Dashboard | AnalystDashboard.tsx | /api/intelligence/* | intelligenceRoutes | reports | Clerk | analytics.read | UNVERIFIED | no tests |
| Authority Dashboard | AuthorityDashboard.tsx | /api/intelligence/* | intelligenceRoutes | reports | Clerk | analytics.read | UNVERIFIED | no tests |
| Admin Panel | AdminPanelView.tsx | /api/admin/* | adminRoutes | users | Clerk | admin.* | UNVERIFIED | no tests |
| Profile Management | AccountLinkingModal.tsx | /api/auth/profile | authRoutes | users | Clerk | profile.update | PARTIAL | code inspection |
| Account Linking | AccountLinkingModal.tsx | /api/linking/* | linkingRoutes | clerkLinks | Clerk | N/A | FUNCTIONAL | clerk-linking tests |
| Audit Logs | AdminPanelView.tsx | /api/admin/audit-logs | adminRoutes | auditLogs | Clerk | audit.read | UNVERIFIED | security tests |
| Report Export | AnalystDashboard.tsx | /api/intelligence/export-csv | intelligenceRoutes | reports | Clerk | analytics.export | UNVERIFIED | no tests |
| Geospatial | GeospatialMap.tsx | /api/map/* | mapRoutes | reports | Clerk | map.read | UNVERIFIED | code inspection |

## Summary
- FUNCTIONAL (verified): 8 features
- PARTIAL: 1
- UNVERIFIED: 9
- BLOCKED (live auth): 1 (login live)

## Key Blockers
- Live Clerk authentication requires user interaction
- Officer/admin/analyst/authority dashboards not tested (require auth)
- Gemini/Python AI not configured
EOF