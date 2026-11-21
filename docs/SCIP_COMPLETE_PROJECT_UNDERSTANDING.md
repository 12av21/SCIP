# SCIP Complete Project Understanding

## Overview
Smart Community Intelligence Platform (SCIP) - civic issue reporting and management platform with 6 roles (citizen, field_officer, dept_officer, analyst, authority, admin).

## Architecture
- Frontend: React 18 + TypeScript + Vite + Tailwind
- Backend: Express + TypeScript (server.ts entry)
- Database: JSON file-backed (default) or MongoDB (opt-in)
- Auth: Clerk (Bearer token)
- AI: TypeScript deterministic classifier (fallback), optional Gemini/Python

## Key Modules
- src/components/views/ (33 views including dashboards per role)
- src/server/routes/ (15 route files)
- src/database/ (scipDatabase, jsonRepository, mongoRepository)
- src/ai/ (18 AI modules)
- src/services/apiClient.ts
- src/context/AuthContext.tsx

## Roles & Dashboards
- Citizen: CitizenDashboard
- Field Officer: FieldOfficerDashboard
- Dept Officer: DeptOfficerDashboard
- Analyst: AnalystDashboard
- Authority: AuthorityDashboard
- Admin: AdminPanelView

## Test Infrastructure
- e2e/ (Playwright, 6 tests)
- scripts/ (security, frontend, submission regression)
- Typecheck + build pass

## Known Gaps
- Live Clerk auth requires user interaction (BLOCKED)
- Gemini/Python AI not configured
- No automated browser auth tests
- MongoDB not runtime-enabled by default
EOF