# SCIP API Documentation

## Authentication
All endpoints require `Authorization: Bearer <clerk_token>` except where noted. Token verified via Clerk SDK.

## Modules

### Auth (authRoutes.ts)
- GET /api/auth/me - current user
- POST /api/auth/logout
- PUT /api/auth/profile - update profile
- DELETE /api/auth/account

### Reports (reportRoutes.ts)
- GET /api/reports - list (filter: citizenId, status, category, urgency, incidentId)
- GET /api/reports/:id - get by ID
- POST /api/reports - create (title, description, category, locationName, latitude, longitude, urgency, images, stateId, districtId, etc.)
- PUT /api/reports/:id - update
- DELETE /api/reports/:id - withdraw
- POST /api/reports/:id/reject - reject
- POST /api/reports/:id/reanalyze - reanalyze

### Incidents (incidentRoutes.ts)
- GET /api/incidents - list
- GET /api/incidents/:id - get by ID
- POST /api/incidents/from-cluster - create from cluster
- POST /api/incidents/:id/review - review
- POST /api/incidents/:id/resolve - resolve
- POST /api/incidents/:id/assign - assign officer
- POST /api/incidents/:id/escalate - escalate
- GET /api/incidents/:id/inspections - list inspections
- POST /api/incidents/:id/inspections - create inspection
- POST /api/incidents/:id/inspections/:iid/verify - verify inspection

### Admin (adminRoutes.ts)
- GET /api/admin/users - list users
- PUT /api/admin/users/:id/role - update role
- PUT /api/admin/users/:id/status - update status
- POST /api/admin/users - create user
- GET /api/admin/departments - list departments
- GET /api/admin/audit-logs - list audit logs
- GET /api/admin/audit-verify - verify audit integrity
- GET /api/admin/system-stats - system stats
- POST /api/admin/backup - create backup
- GET /api/admin/backups - list backups
- POST /api/admin/prune - prune backups
- POST /api/admin/restore-rehearsal - restore rehearsal

### Linking (linkingRoutes.ts)
- POST /api/linking/request - create linking request
- POST /api/linking/onboard - onboard new citizen
- GET /api/linking/status - linking status
- POST /api/linking/cancel - cancel
- POST /api/linking/challenge - submit challenge
- GET /api/linking/admin/pending - pending links (admin)
- POST /api/linking/admin/:id/approve - approve
- POST /api/linking/admin/:id/reject - reject

### Images (imageRoutes.ts)
- POST /api/image/upload - upload base64 data URL
- GET /api/image/metadata/:id - metadata
- POST /api/image/analyze - analyze
- GET /api/image/:id - serve image (owner/privileged only)

### Map (mapRoutes.ts)
- GET /api/map/reports - reports for map
- GET /api/map/incidents - incidents for map
- GET /api/map/hotspots - hotspots
- GET /api/map/clusters - clusters
- GET /api/map/boundaries - boundaries
- GET /api/map/jurisdiction - jurisdiction
- GET /api/map/stats - stats

### Intelligence (intelligenceRoutes.ts)
- GET /api/intelligence/agent - agent
- GET /api/intelligence/clusters - clusters
- GET /api/intelligence/hotspots - hotspots
- GET /api/intelligence/trends - trends
- GET /api/intelligence/model-metrics - model metrics
- GET /api/intelligence/dataset-quality - dataset quality
- GET /api/intelligence/semantic-evaluation - semantic eval
- GET /api/intelligence/export-csv - CSV export

### Geoanalytics (geoanalyticsRoutes.ts)
- GET /api/geoanalytics/overview
- GET /api/geoanalytics/state-distribution
- GET /api/geoanalytics/district-distribution
- GET /api/geoanalytics/locality-distribution
- GET /api/geoanalytics/hotspots
- GET /api/geoanalytics/resolution-time
- GET /api/geoanalytics/pending-concentration

### Misc (miscRoutes.ts)
- GET /api/notifications - user notifications
- POST /api/notifications/:id/read - mark read
- POST /api/notifications/read-all - mark all read
- GET /api/feedback - feedback list
- POST /api/feedback - submit feedback

### Verification (verificationRoutes.ts)
- POST /api/verification/send-email
- POST /api/verification/verify-email
- POST /api/verification/send-sms
- POST /api/verification/verify-sms
- GET /api/verification/status
- POST /api/verification/resend

### India Civic (indiaCivicRoutes.ts)
- GET /api/india-civic/schemes
- GET /api/india-civic/escalation-path
- GET /api/india-civic/jurisdiction/pincode
- GET /api/india-civic/intelligence
- GET /api/india-civic/ulb-types
- GET /api/india-civic/ulb

### Database (databaseRoutes.ts)
- GET /api/database/storage
- GET /api/database/integrity
- GET /api/database/health

### IP Logs (iplogRoutes.ts)
- GET /api/iplog
- GET /api/iplog/:id
- POST /api/iplog
- DELETE /api/iplog (retention)

### Location (locationRoutes.ts)
- GET /api/location/states
- GET /api/location/districts/:stateId
- GET /api/location/subdistricts/:districtId
- GET /api/location/blocks/:subDistrictId
- GET /api/location/localities/:blockId

## Total Endpoints: 130

## Security
- Bearer token via Clerk SDK
- requirePermission middleware per endpoint
- canAccessReport for ownership
- Rate limiting (300 req/15min unauth, 60 auth)
- CSP headers
- Upload: 10MB limit, base64 data URL
- Image GET: owner/privileged only

## Error Format
All errors return: { success: false, message: string, errors: string[] }
EOF