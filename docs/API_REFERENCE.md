# SCIP — API Reference

**Project:** Smart Community Intelligence Platform (SCIP)  
**Version:** 1.0 (Production Ready)  
**Date:** 2026-11-14  
**Base URL:** `http://localhost:3000/api` (development) / production domain (production)  
**Auth:** JWT Bearer token in `Authorization` header

---

## 1. Authentication (`/api/auth`)

### POST /api/register
Register a new citizen account. Public registration always assigns `citizen` role.

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string (8-128 chars)",
  "phone": "string (optional)",
  "stateId": "string (optional)",
  "districtId": "string (optional)",
  "subDistrictId": "string (optional)",
  "blockId": "string (optional)",
  "localityId": "string (optional)",
  "pinCode": "string (6 digits, optional)",
  "residenceAddress": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "user": { ... }, "token": "jwt" }
}
```

**Errors:** 400 (validation), 403 (privileged role), 409 (duplicate email)

---

### POST /api/login
Authenticate with email and password.

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": { "user": { ... }, "token": "jwt" }
}
```

**Errors:** 400 (missing credentials), 401 (invalid credentials), 403 (suspended / reset required)

---

### POST /api/demo-login
Development-only demo login. Requires `ENABLE_DEV_DEMO_LOGIN=true` and non-production.

**Request:** `{ "role": "UserRole" }`

**Response (200):** `{ success: true, data: { user, token } }`

---

### GET /api/auth/me
Get authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `{ success: true, data: { user: { ... } } }`

**Errors:** 401 (unauthenticated)

---

### POST /api/auth/logout
Invalidate session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `{ success: true, message: "Logged out successfully." }`

---

### POST /api/auth/change-password
Change password (requires old + new password).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "oldPassword": "string", "newPassword": "string (8-128 chars)" }
```

**Errors:** 400 (validation), 401 (wrong old password), 401 (unauthenticated)

---

### PUT /api/auth/profile
Update user profile (PIN code validated as Indian 6-digit).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "stateId": "string (optional)",
  "districtId": "string (optional)",
  "subDistrictId": "string (optional)",
  "blockId": "string (optional)",
  "localityId": "string (optional)",
  "pinCode": "string (optional)",
  "residenceAddress": "string (optional)"
}
```

---

### POST /api/auth/reset-password
Request password reset (email-based, enumeration-safe).

**Request:** `{ "email": "string" }`

**Response (200):** `{ success: true, message: "..." }` (always 200 to prevent enumeration)

---

### DELETE /api/auth/account
Delete account (DPDP right to be forgotten, PII anonymized).

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `{ success: true, message: "Account deleted successfully." }`

---

## 2. Reports (`/api/reports`)

### GET /api/reports
List reports with filtering. Role-scoped: citizens see own reports, officers see department-scoped, analysts/authority/admin see all.

**Query Params:** `category`, `status`, `urgency`, `myOnly` (boolean)

**Headers:** `Authorization: Bearer <token>`, Permission: `report.read`

**Response (200):**
```json
{
  "success": true,
  "data": [ { ...Report }, ... ],
  "meta": { "total": number }
}
```

---

### POST /api/reports
Create a new report. Triggers full AI pipeline (classification, entities, severity, duplicates, clustering, risk scoring).

**Headers:** `Authorization: Bearer <token>`, Permission: `report.create`

**Request:**
```json
{
  "title": "string (min 5 chars)",
  "description": "string (min 10 chars)",
  "category": "ReportCategory",
  "subcategory": "string (optional)",
  "locationName": "string",
  "latitude": "number",
  "longitude": "number",
  "urgency": "low | medium | high | critical",
  "images": ["string (base64 data URL)"] (optional, max 10),
  "stateId": "string (optional)",
  "districtId": "string (optional)",
  "subDistrictId": "string (optional)",
  "blockId": "string (optional)",
  "localityId": "string (optional)",
  "address": "string (optional)",
  "landmark": "string (optional)",
  "pinCode": "string (6 digits, optional)",
  "locationSource": "gps | manual_map | geocoded | preset (optional)",
  "locationAccuracyMeters": "number (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "report": { ...Report },
    "analysis": { ...AIAnalysis }
  }
}
```

---

### GET /api/reports/:id
Get report by ID with AI analysis. Access controlled: citizens own reports, officers department-scoped, admin/all.

**Headers:** `Authorization: Bearer <token>`, Permission: `report.read`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "report": { ...Report },
    "analysis": { ...AIAnalysis | null }
  }
}
```

**Errors:** 404 (not found), 403 (forbidden)

---

### PUT /api/reports/:id
Update report (citizen-editable fields only: title, description, location, category, urgency, images).

**Headers:** `Authorization: Bearer <token>`, Permission: `report.update`

**Errors:** 403 (forbidden), 404 (not found), 400 (validation)

---

### DELETE /api/reports/:id
Withdraw/delete report.

**Headers:** `Authorization: Bearer <token>`, Permission: `report.delete`

---

### POST /api/reports/:id/reject
Reject report (authority/admin only).

**Headers:** `Authorization: Bearer <token>`, Permission: `report.update`

**Request:** `{ "reason": "string" }`

---

### POST /api/reports/:id/reanalyze
Re-run AI analysis on report.

**Headers:** `Authorization: Bearer <token>`, Permission: `report.update`

---

## 3. Incidents (`/api/incidents`)

### GET /api/incidents
List incidents with filtering.

**Query Params:** `status`, `category`, `priority`

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.read`

---

### GET /api/incidents/:id
Get incident by ID with linked reports.

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.read`

---

### POST /api/incidents/from-cluster
Create incident from a spatio-temporal cluster.

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.create`

**Request:** `{ "cluster": { ...SpatioTemporalCluster } }`

---

### POST /api/incidents/:id/review
Review incident (confirm/dismiss).

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.update`

**Request:** `{ "action": "confirm | dismiss", "notes": "string", "departmentId": "string (optional)", "officerId": "string (optional)" }`

---

### POST /api/incidents/:id/resolve
Resolve incident.

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.resolve`

**Request:** `{ "actionTaken": "string", "preventiveMeasures": "string (optional)", "costEstimate": "number (optional)" }`

---

### POST /api/incidents/:id/assign
Assign officer to incident.

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.assign`

**Request:**
```json
{
  "departmentId": "string (optional)",
  "officerId": "string",
  "officerName": "string",
  "notes": "string (optional)"
}
```

---

### POST /api/incidents/:id/escalate
Escalate incident.

**Headers:** `Authorization: Bearer <token>`, Permission: `incident.escalate`

**Request:** `{ "reason": "string" }`

---

### POST /api/incidents/:id/inspection
Create field inspection.

**Headers:** `Authorization: Bearer <token>`, Permission: `inspection.create`

**Request:**
```json
{
  "verifiedStatus": "verified_match | disputed | partial",
  "observations": "string",
  "checklist": {
    "physicalVerification": boolean,
    "safetyHazardAssessed": boolean,
    "structuralDamageChecked": boolean,
    "utilityImpactVerified": boolean
  },
  "evidencePhotos": ["string"] (optional),
  "recommendedAction": "string (optional)"
}
```

---

### POST /api/incidents/:id/verify-inspection
Verify/approve inspection (department officer).

**Headers:** `Authorization: Bearer <token>`, Permission: `inspection.verify`

**Request:** `{ "inspectionId": "string", "departmentRemarks": "string", "isApproved": boolean }`

---

### GET /api/incidents/:id/inspections
List inspections for incident.

**Headers:** `Authorization: Bearer <token>`, Permission: `inspection.read`

---

### POST /api/incidents/:id/flag-review
Flag incident for review.

**Headers:** `Authorization: Bearer <token>`

**Request:** `{ "reason": "string", "reviewType": "string (optional)" }`

---

### GET /api/incidents/jurisdiction
Get jurisdiction for coordinates.

**Query:** `lat`, `lng`

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/incidents/recommended-officers
Get recommended officers for location.

**Query:** `lat`, `lng`, `departmentId (optional)`

**Headers:** `Authorization: Bearer <token>`

---

## 4. Intelligence (`/api/intelligence`)

### GET /api/intelligence/clusters
Get incident clusters.

**Headers:** `Authorization: Bearer <token>`, Permission: `intelligence.read`

---

### GET /api/intelligence/hotspots
Get geographic hotspots.

**Headers:** `Authorization: Bearer <token>`, Permission: `intelligence.read`

---

### GET /api/intelligence/trends
Get trend analysis.

**Headers:** `Authorization: Bearer <token>`, Permission: `intelligence.read`

---

### GET /api/intelligence/model-metrics
Get AI model evaluation metrics.

**Headers:** `Authorization: Bearer <token>`, Permission: `model.evaluate`

---

### GET /api/intelligence/dataset-quality
Get civic dataset quality metrics.

**Headers:** `Authorization: Bearer <token>`, Permission: `intelligence.read`

---

### GET /api/intelligence/export-csv
Export intelligence data as CSV.

**Headers:** `Authorization: Bearer <token>`, Permission: `data.export`

---

### POST /api/intelligence/agent
Run SCIP Intelligence Agent query.

**Headers:** `Authorization: Bearer <token>`, Permission: `intelligence.read`

**Request:** `{ "query": "string", "specificTool": "string (optional)" }`

---

## 5. Admin (`/api/admin`) — authority/admin only

### GET /api/admin/users
List users (role-scoped PII: admin sees email/phone, authority sees reduced view).

**Permission:** `admin.manage` (authority can read)

---

### PUT /api/admin/users/:id/role
Change user role.

**Permission:** `admin.manage`

**Request:** `{ "role": "UserRole" }`

---

### PUT /api/admin/users/:id/status
Suspend/activate user account.

**Permission:** `admin.manage`

**Request:** `{ "status": "active | suspended" }`

---

### POST /api/admin/users
Privileged member registration (admin only).

**Permission:** `admin.manage`

**Request:** `{ "name", "email", "password", "role", "phone (optional)", "departmentId (optional)" }`

---

### GET /api/admin/departments
List departments.

**Permission:** `user.read`

---

### GET /api/admin/audit-logs
List audit logs (redacted: emails, tokens, phones, notes removed).

**Permission:** `audit.read`

**Query:** `module`, `action`, `userId`, `limit`

---

### GET /api/admin/audit-verify
Verify audit hash-chain integrity.

**Permission:** `audit.read`

---

### GET /api/admin/system-stats
Get system statistics (memory, uptime, record counts).

**Permission:** `authority` or `admin`

---

### POST /api/admin/backup
Create database backup.

**Permission:** `admin.manage`

**Request:** `{ "backupDir": "string (optional)" }`

---

### GET /api/admin/backups
List backups.

**Permission:** `admin.manage`

---

### DELETE /api/admin/backups/prune
Prune old backups.

**Permission:** `admin.manage`

**Request:** `{ "retentionCount": "number", "backupDir": "string (optional)" }`

---

### POST /api/admin/restore-rehearsal
Isolated restore verification (does not modify active DB).

**Permission:** `admin.manage`

**Request:** `{ "backupFile": "string" }`

---

## 6. Locations (`/api/locations`)

### GET /api/locations/states
List Indian states/UTs.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/locations/districts?stateId=
List districts for a state.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/locations/sub-districts?districtId=
List sub-districts for a district.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/locations/blocks?subDistrictId=
List blocks for a sub-district.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/locations/localities?blockId=
List localities for a block.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/locations/boundaries
Get administrative boundaries (GeoJSON).

**Headers:** `Authorization: Bearer <token>`

**Query:** `level (optional)`

---

## 7. Map (`/api/map`)

### GET /api/map/reports
Coordinate-filtered reports (role-scoped).

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

### GET /api/map/incidents
Coordinate-filtered incidents (role-scoped).

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

### GET /api/map/hotspots
Grid-based density hotspots.

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

**Query:** `minReports`, `radiusMeters`

---

### GET /api/map/clusters
DBSCAN incident clusters.

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

### GET /api/map/boundaries
GeoJSON admin boundaries.

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

### GET /api/map/jurisdiction
Coordinate → jurisdiction resolution.

**Query:** `lat`, `lng`

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

### GET /api/map/stats
Category/urgency breakdown with geo coverage.

**Headers:** `Authorization: Bearer <token>`, Permission: `map.read`

---

## 8. Image Intelligence (`/api/image`)

### POST /api/image/upload
Upload image (base64 data URL).

**Headers:** `Authorization: Bearer <token>`, Permission: `image.upload`

**Request:**
```json
{
  "dataUrl": "string (base64 data URL)",
  "source": "upload | url | camera (optional)",
  "uploadedBy": "string (optional)",
  "description": "string (optional)"
}
```

---

### GET /api/image/metadata/:id
Get image metadata (EXIF, dimensions, format).

**Headers:** `Authorization: Bearer <token>`, Permission: `image.read`

---

### POST /api/image/analyze
Analyze image (objects, scene labels, damage indicators, OCR hints).

**Headers:** `Authorization: Bearer <token>`, Permission: `image.read`

**Request:** `{ "imageId": "string (optional)", "dataUrl": "string (optional)", "description": "string (optional)" }`

---

### GET /api/image/:id
Serve image file.

**Headers:** `Authorization: Bearer <token>`, Permission: `image.read`

---

## 9. India Civic Intelligence (`/api/india/civic`)

### GET /api/india/civic/schemes
List all civic schemes.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/schemes/:category
Get schemes for a report category.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/escalation-path
Get escalation matrix by category/severity.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/jurisdiction/pincode/:pin
Resolve PIN code jurisdiction.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/intelligence/:reportId
Generate full civic intelligence for a report.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/ulb-types
List ULB types.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/india/civic/ulb
List/create urban local bodies.

**Headers:** `Authorization: Bearer <token>`

---

## 10. Database Management (`/api/database`) — authority/admin only

### GET /api/database/storage
Get storage size, record counts, last persisted.

**Headers:** `Authorization: Bearer <token>`, Permission: `authority` or `admin`

---

### GET /api/database/integrity
Validate data integrity (audit chain, orphans, duplicates).

**Headers:** `Authorization: Bearer <token>`, Permission: `authority` or `admin`

---

### GET /api/database/health
Combined database health snapshot.

**Headers:** `Authorization: Bearer <token>`, Permission: `authority` or `admin`

---

## 11. Miscellaneous (`/api`)

### GET /api/health
Health check (unauthenticated).

**Response (200):** `{ success: true, message: "SCIP API is healthy." }`

---

## 12. Email & SMS Verification (`/api/verification`)

SCIP provides provider-independent email and SMS verification for account activation. Public registration creates **unverified** accounts; email verification is required to activate. SMS verification is optional but recommended for full account activation. Unverified accounts are blocked from write operations by middleware (`requireVerification`).

All endpoints are enumeration-safe: invalid or non-existent emails/phones return generic success messages to prevent account enumeration.

### POST /api/verification/send-email — Send email verification token

**Request:**
```json
{ "email": "string" }
```

**Response (200):**
```json
{ "success": true, "message": "Verification email sent. Please check your inbox." }
```

**Behavior:**
- Enumeration-safe: always returns success even if email doesn't match an account
- 24-hour token expiry, SHA-256 hashed token storage
- 60-second resend cooldown, max 5 verification attempts
- Email body/content never logged when OTP/verification keywords detected

**Errors:** 429 (resend cooldown or attempt limit exceeded), 500 (delivery failure)

---

### POST /api/verification/verify-email — Verify email with token

**Request:**
```json
{ "email": "string", "token": "string" }
```

**Response (200):**
```json
{ "success": true, "message": "Email verified successfully." }
```

**Errors:** 400 (invalid input), 400 (invalid/expired token), 429 (attempt limit exceeded)

---

### POST /api/verification/send-sms — Send SMS OTP

**Request:**
```json
{ "phone": "string" }
```

**Response (200):**
```json
{ "success": true, "message": "Verification SMS sent. Please check your messages." }
```

**Behavior:**
- Enumeration-safe
- 6-digit cryptographically secure OTP, 10-minute expiry, SHA-256 hashed
- 60-second resend cooldown, max 5 verification attempts
- OTP value never logged

**Errors:** 429 (resend cooldown or attempt limit exceeded), 500 (delivery failure)

---

### POST /api/verification/verify-sms — Verify phone with OTP

**Request:**
```json
{ "phone": "string", "otp": "string" }
```

**Response (200):**
```json
{ "success": true, "message": "Phone verified successfully." }
```

**Errors:** 400 (invalid input), 400 (invalid/expired OTP), 429 (attempt limit exceeded)

---

### GET /api/verification/status — Get verification status

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "emailVerified": boolean,
    "phoneVerified": boolean,
    "verificationAttempts": number,
    "lastVerificationSentAt": "string (ISO) | undefined",
    "emailVerificationTokenExpiresAt": "string (ISO) | undefined",
    "phoneVerificationOtpExpiresAt": "string (ISO) | undefined"
  }
}
```

---

### POST /api/verification/resend — Resend verification (email or SMS)

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "channel": "email | sms" }
```

**Response (200):**
```json
{ "success": true, "message": "Verification email resent." }
```

**Errors:** 429 (resend cooldown), 400 (invalid channel), 404 (user not found)

---

## 13. Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": ["Specific error detail 1", "Specific error detail 2"]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Too many requests |
| 500 | Internal server error |

---

## 13. Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 60 requests | 1 minute |
| All other endpoints | 300 requests | 1 minute |

**Header:** `Retry-After` may be included on 429 responses.

**Env:** `DISABLE_RATE_LIMIT=true` disables rate limiting (test only).

---

## 14. Security Headers (Production)

| Header | Value |
|--------|-------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| Referrer-Policy | no-referrer |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | Restrictive (default-src 'self', etc.) |
| Cross-Origin-Opener-Policy | same-origin |
| Cross-Origin-Resource-Policy | same-origin |

---

## 15. TypeScript Type Definitions

All types are defined in `src/types/scip.ts`. Key types:

- `User`, `UserRole`, `UserPermission`
- `Report`, `ReportCategory`, `ReportStatus`, `UrgencyLevel`
- `Incident`, `IncidentPriority`
- `AIAnalysis`
- `Assignment`, `Resolution`, `InspectionRecord`
- `Notification`, `Feedback`
- `AuditLog`, `AuditAction`
- `IPSecurityLog`, `AuthEventType`
- `AdminState`, `AdminDistrict`, `AdminSubDistrict`, `AdminBlock`, `AdminLocality`, `AdministrativeBoundary`, `LocationLevel`
- `ImageMetadata`, `ImageAnalysis`, `ImageUploadResult`, `ImageSource`
- `CivicScheme`, `UrbanLocalBody`, `CivicEscalationLevel`, `PinCodeJurisdiction`, `IndiaCivicIntelligence`
- `ModelEvaluationMetrics`, `ModelRegistry` types
- `SpatioTemporalCluster`, `AgentBriefing`
- `User` verification fields: `emailVerified`, `phoneVerified`, `emailVerificationTokenHash`, `phoneVerificationOtpHash`, `verificationAttempts`, `lastVerificationSentAt`
- `UserStatus`: `'active' | 'suspended' | 'unverified'`
