# SCIP — Database Design

**Project:** Smart Community Intelligence Platform (SCIP)  
**Version:** 1.0 (Production Ready)  
**Date:** 2026-11-14  
**Status:** Accurate description of the implemented database schema

---

## 1. Overview

SCIP uses a file-backed JSON database as the default runtime persistence layer. The `SCIPDatabase` class manages in-memory `Map` collections that are persisted to `.scip_database.json` (or `SCIP_DB_PATH` environment variable). Atomic writes use a temp file + `fs.renameSync()` pattern.

MongoDB scaffolding exists (Mongoose models + `MongoScipRepository`) but is gated behind 5 explicit isolated conditions and is NOT runtime-integrated by default.

---

## 2. Storage Architecture

### 2.1 Active Runtime: JSON-backed

| Property | Value |
|----------|-------|
| Engine | `SCIPDatabase` (in-memory Maps) |
| Persistence File | `.scip_database.json` or `SCIP_DB_PATH` |
| Write Strategy | Temp file + atomic rename |
| Auto-load | Yes, on initialization |
| Backup | Timestamped JSON snapshots |
| Restore | From backup file (isolated instance for verification) |
| Prune | Retention-based backup cleanup |

### 2.2 MongoDB (Scaffolded, Gated)

| Property | Value |
|----------|-------|
| ODM | Mongoose |
| Models | All collections modeled |
| Repository | `MongoScipRepository` (behavioral parity) |
| Runtime Integration | Not active (5-gate isolation) |
| Default | JSON-backed |

---

## 3. Schema: Core Collections

### 3.1 Users

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique user ID |
| name | string | Yes | Display name |
| email | string | Yes | Unique email (lowercased) |
| passwordHash | string | Yes | bcrypt hash |
| role | UserRole | Yes | citizen, officer, dept_officer, analyst, authority, admin |
| phone | string | No | Phone number |
| departmentId | string | No | Assigned department |
| stateId | string | No | Jurisdiction state |
| districtId | string | No | Jurisdiction district |
| subDistrictId | string | No | Jurisdiction sub-district |
| blockId | string | No | Jurisdiction block |
| localityId | string | No | Jurisdiction locality |
| pinCode | string | No | Indian 6-digit PIN |
| residenceAddress | string | No | Residence address |
| status | 'active' \| 'suspended' | Yes | Account status |
| sessionVersion | number | Yes | Session invalidation counter |
| credentialsResetRequired | boolean | Yes | Password reset required flag |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 3.2 Departments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique department ID |
| name | string | Yes | Department name |
| description | string | No | Department description |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 3.3 Reports

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique report ID (REP-YYYY-NNN) |
| title | string | Yes | Report title (min 5 chars) |
| description | string | Yes | Detailed description (min 10 chars) |
| category | ReportCategory | Yes | 8 municipal categories |
| subcategory | string | No | Subcategory |
| locationName | string | Yes | Location description |
| latitude | number | Yes | Latitude (-90 to 90) |
| longitude | number | Yes | Longitude (-180 to 180) |
| citizenId | string | Yes | Submitting user ID |
| citizenName | string | Yes | Citizen name |
| citizenEmail | string | Yes | Citizen email |
| status | ReportStatus | Yes | submitted, analyzed, under_review, linked, assigned, resolved, rejected, withdrawn, closed |
| urgency | UrgencyLevel | Yes | low, medium, high, critical |
| images | string[] | No | Base64 image data URLs (max 10) |
| stateId | string | No | Report location state |
| districtId | string | No | Report location district |
| subDistrictId | string | No | Report location sub-district |
| blockId | string | No | Report location block |
| localityId | string | No | Report location locality |
| address | string | No | Street address |
| landmark | string | No | Landmark |
| pinCode | string | No | Indian PIN code |
| locationSource | string | No | gps, manual_map, geocoded, preset |
| locationAccuracyMeters | number | No | GPS accuracy |
| locationConfirmedAt | string | No | ISO timestamp |
| incidentId | string | No | Linked incident ID |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

**Report Categories:** Water & Drainage, Roads & Traffic, Public Sanitation, Power & Lighting, Parks & Environment, Structural Safety, Public Health, Noise & Disturbance

**Report Statuses:** submitted, analyzed, under_review, linked, assigned, resolved, rejected, withdrawn, closed

**Urgency Levels:** low, medium, high, critical

### 3.4 AI Analyses

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique analysis ID |
| reportId | string | Yes | Linked report ID |
| categoryPredicted | string | Yes | AI-predicted category |
| categoryConfidence | number | Yes | Confidence score (0-1) |
| severityIndicator | string | Yes | low, medium, high, critical |
| riskScore | number | Yes | Risk score (0-100) |
| duplicateProbability | number | Yes | Duplicate probability (0-1) |
| keywords | string[] | No | Extracted keywords |
| entities | object | No | { locations, infrastructure, hazards, temporal } |
| possibleIncident | boolean | No | Linked to incident cluster |
| topSimilarReports | array | No | Similar reports with distance |
| processedAt | string | Yes | ISO timestamp |
| modelVersion | string | Yes | AI model version |

### 3.5 Incidents

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique incident ID (INC-YYYY-NNN) |
| title | string | Yes | Incident title |
| description | string | Yes | Incident description |
| category | string | Yes | Incident category |
| priority | IncidentPriority | Yes | P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW |
| status | string | Yes | pending, confirmed, in_progress, resolved, dismissed, closed |
| assignedDepartmentId | string | No | Assigned department |
| assignedOfficerId | string | No | Assigned officer |
| reportIds | string[] | Yes | Linked report IDs |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

**Incident Priorities:** P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW

### 3.6 Assignments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique assignment ID |
| incidentId | string | Yes | Incident ID |
| officerId | string | Yes | Officer user ID |
| officerName | string | Yes | Officer name |
| departmentId | string | Yes | Department ID |
| notes | string | No | Assignment notes |
| assignedBy | string | Yes | Assigning user ID |
| assignedAt | string | Yes | ISO timestamp |

### 3.7 Resolutions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique resolution ID |
| incidentId | string | Yes | Incident ID |
| resolverId | string | Yes | Resolving user ID |
| actionTaken | string | Yes | Action taken description |
| preventiveMeasures | string | No | Preventive measures |
| costEstimate | number | No | Estimated cost |
| resolvedAt | string | Yes | ISO timestamp |

### 3.8 Inspections

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique inspection ID |
| incidentId | string | Yes | Incident ID |
| officerId | string | Yes | Inspecting officer ID |
| verifiedStatus | string | Yes | verified_match, disputed, partial |
| observations | string | Yes | Inspection observations |
| checklist | object | Yes | Verification checklist |
| evidencePhotos | string[] | No | Evidence photo URLs |
| recommendedAction | string | No | Recommended action |
| createdAt | string | Yes | ISO timestamp |

**Inspection Checklist:** physicalVerification, safetyHazardAssessed, structuralDamageChecked, utilityImpactVerified (all boolean)

### 3.9 Notifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique notification ID |
| userId | string | Yes | Target user ID |
| title | string | Yes | Notification title |
| message | string | Yes | Notification message |
| type | string | Yes | Notification type |
| read | boolean | Yes | Read status |
| createdAt | string | Yes | ISO timestamp |

### 3.10 Feedbacks

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique feedback ID |
| reportId | string | No | Linked report |
| incidentId | string | No | Linked incident |
| userId | string | Yes | Feedback author |
| rating | number | Yes | Rating (1-5) |
| comments | string | Yes | Feedback comments |
| createdAt | string | Yes | ISO timestamp |

### 3.11 Audit Logs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique audit log ID |
| action | AuditAction | Yes | Action type |
| module | string | Yes | Module name |
| userId | string | Yes | User ID |
| userEmail | string | Yes | User email |
| userRole | string | Yes | User role |
| ipAddress | string | Yes | IP address |
| details | string | Yes | Action details |
| hash | string | Yes | SHA-256 hash |
| prevHash | string | No | Previous hash |
| timestamp | string | Yes | ISO timestamp |

**Hash-chain:** Each entry's hash = SHA-256(prevHash + action + module + userId + timestamp + details)

### 3.12 IP Security Logs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique log ID |
| eventType | AuthEventType | Yes | Event type |
| success | boolean | Yes | Success/failure |
| userId | string | Yes | User ID |
| userEmail | string | Yes | User email |
| userRole | string | Yes | User role |
| ipAddress | string | Yes | IP address |
| timestamp | string | Yes | ISO timestamp |
| hash | string | Yes | SHA-256 hash |
| prevHash | string | No | Previous hash |

---

## 4. Schema: India Administrative Hierarchy

### 4.1 Admin States

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | State ID (ST-XX) |
| name | string | Yes | State/UT name |
| type | 'state' \| 'union_territory' | Yes | Administrative type |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 4.2 Admin Districts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | District ID (DIST-XX-YY) |
| stateId | string | Yes | Parent state ID |
| name | string | Yes | District name |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 4.3 Admin Sub-Districts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Sub-district ID |
| districtId | string | Yes | Parent district ID |
| name | string | Yes | Sub-district name |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 4.4 Admin Blocks

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Block ID |
| subDistrictId | string | Yes | Parent sub-district ID |
| name | string | Yes | Block name |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 4.5 Admin Localities

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Locality ID |
| blockId | string | Yes | Parent block ID |
| name | string | Yes | Locality name |
| type | 'village' \| 'town' \| 'urban_locality' \| 'city' | Yes | Locality type |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

### 4.6 Administrative Boundaries

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Boundary ID |
| level | LocationLevel | Yes | Boundary level |
| parentId | string \| null | No | Parent boundary |
| name | string | Yes | Boundary name |
| geometry | GeoJSON | Yes | Boundary geometry |
| isActive | boolean | Yes | Active status |
| createdAt | string | Yes | ISO timestamp |
| updatedAt | string | Yes | ISO timestamp |

---

## 5. Indexes & Constraints

### 5.1 Unique Constraints

| Collection | Field(s) | Description |
|------------|----------|-------------|
| users | email | Unique email address |
| reports | id | Unique report ID |
| incidents | id | Unique incident ID |
| departments | id | Unique department ID |

### 5.2 Query Indexes (In-Memory Maps)

All collections use JavaScript `Map` keyed by `id`, providing O(1) lookup by ID. Additional filtering is done in-memory on query.

### 5.3 Referential Integrity

Referential integrity is maintained at the application level:
- Reports reference citizenId (must exist in users)
- Incidents reference reportIds (must exist in reports)
- Assignments reference incidentId and officerId (must exist)
- AI analyses reference reportId (must exist in reports)
- Audit logs reference userId (must exist in users)

The `validateDataIntegrity()` endpoint checks for orphaned records.

---

## 6. Data Integrity Validation

The `/api/database/integrity` endpoint validates:

| Check | Description |
|-------|-------------|
| Audit chain valid | Hash-chain integrity verification |
| Orphaned analyses | AI analyses for non-existent reports |
| Orphaned incidents | Incidents referencing non-existent reports |
| Duplicate report IDs | Duplicate ID detection |
| Invalid categories | Reports with invalid category values |

---

## 7. Storage Information

The `/api/database/storage` endpoint returns:

| Field | Description |
|-------|-------------|
| storageFile | Path to database file |
| storageExists | Whether file exists |
| storageSizeBytes | File size in bytes |
| storageSizeMB | File size in MB |
| recordCounts | Per-collection record counts |
| lastPersistedAt | Last persistence timestamp |

---

## 8. MongoDB Models (Scaffolded)

All JSON collections have corresponding Mongoose models in `src/database/models/`:

| Model | Collection |
|-------|------------|
| UserModel | users |
| ReportModel | reports |
| IncidentModel | incidents |
| DepartmentModel | departments |
| NotificationModel | notifications |
| FeedbackModel | feedbacks |
| AuditLogModel | auditLogs |
| InspectionModel | inspections |
| AIAnalysisModel | aianalyses |
| ResolutionModel | resolutions |
| AssignmentModel | assignments |
| CounterModel | counters |
| AdminStateModel | adminstates |
| AdminDistrictModel | admindistricts |
| AdminSubDistrictModel | adminsubdistricts |
| AdminBlockModel | adminblocks |
| AdminLocalityModel | adminlocalities |
| AdministrativeBoundaryModel | administrativeboundaries |
| IPSecurityLogModel | ipsecuritylogs |

---

## 9. Migration

No automated migration system exists. Schema changes must be handled manually with backward-compatible data transformation. The `resetToSeedData()` function can reseed from seed data (development only).

### 9.1 Safe Operations

- `createBackup()` — Timestamped snapshot before any changes
- `restoreFromBackup()` — Isolated verification (does not modify active DB)
- `pruneBackups()` — Retention-based cleanup
- `validateDataIntegrity()` — Pre/post-change validation

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single-process JSON DB | Cannot scale horizontally | Run one instance; use persistent disk |
| No automated migrations | Manual schema changes | Use backup/restore for safety |
| MongoDB not runtime-integrated | No production MongoDB cutover | Keep `DATABASE_DRIVER=json` |
| No connection pooling | File-based I/O | Single-process architecture |
