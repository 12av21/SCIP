# SCIP Production Readiness Audit

## Overall: NOT READY for production (live auth BLOCKED)

## Infrastructure
- Frontend: Vite + React (SPA)
- Backend: Express (server.ts)
- DB: JSON file-backed (default) or MongoDB (opt-in)
- AI: TS deterministic (fallback), optional Gemini/Python

## Environment Variables Required
- VITE_CLERK_PUBLISHABLE_KEY (frontend)
- CLERK_SECRET_KEY (backend)
- CLERK_AUTHORIZED_PARTIES (backend, origins)
- DATABASE_DRIVER (json/mongo)
- MONGODB_URI (if mongo)
- SCIP_MONGO_RUNTIME_INTEGRATED (if mongo)

## Security
- Clerk Bearer auth: implemented
- RBAC: 6 roles, permission matrix
- Rate limiting: implemented
- CSP: implemented (csp.ts)
- Upload validation: magic bytes (Phase 3)
- Image GET auth: owner/privileged (Phase 3.1)

## Database
- JSON: file-backed, sync persist (blocking)
- MongoDB: opt-in, not parity-verified
- No transactions in JSON repo

## Blockers
1. Live Clerk auth unverified
2. 6-role dashboard unverified
3. Profile/Audit/Export/Geospatial unverified
4. No health endpoint (requires auth - 401 without token)
5. Sync persist blocks event loop
6. No production monitoring/logging service

## DB Hash
- F743CCA936D2BF1F17D018DB2143D70EECC72B1B69FDDD3FDF2811E0BDA62B1E (unchanged)
EOF