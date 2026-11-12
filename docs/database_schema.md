# SCIP — Database Schema

**Date:** 2026-11-11  
**Sources:** `src/types/scip.ts`, `src/database/models/*`, `src/database/scipDatabase.ts`, `scripts/mongo-migration-execute.mts` (snapshot structure).  
**Active runtime:** JSON collections in `.scip_database.json` (file-backed engine). **Mongoose models:** parity scaffolding for MongoDB (not runtime-integrated).

## 1. Entity overview

| Entity / Collection key | Primary key | Purpose | Notes |
|---|---|---|---|
| `users` | `id` | Accounts, roles, auth/session state | `passwordHash` internal; `sessionVersion`, `credentialsResetRequired` for session control |
| `departments` | `id` | Municipal departments | `code` unique business key |
| `reports` | `id` | Citizen observations | Linked to `citizenId`, optional `incidentId`, geo + status/category/urgency |
| `incidents` | `id` | Correlated/managed incidents | `reportIds[]`, workflow status/priority/severity, assignment/review/resolution fields |
| `analyses` | `reportId` | AI analysis per report | Classification, similarity, entities, risk, evidence |
| `assignments` | `id` | Incident/department/officer assignments | Workflow/status tracking |
| `resolutions` | `id` | Incident resolution records | Action, preventive measures, cost, verification |
| `inspections` | `id` | Field/department inspections | Checklist, evidence, verification/remarks |
| `notifications` | `id` | User notifications | `userId`, read state, type/link |
| `feedbacks` | `id` | User feedback | Rating/comments linked to report/incident/user |
| `auditLogs` | `id` | Tamper-evident audit events | Hash chain (`hash`,`prevHash`), canonical/legacy verification support |
| `riskScores` | `id` | Risk scoring records | Entity-targeted score/priority/factors/explanation |

Snapshot also contains `savedAt` metadata (non-entity).

## 2. Core field definitions (runtime types)

### 2.1 User (`users`)
- `id: string` (unique)
- `name, email: string` (`email` unique, normalized)
- `passwordHash?: string` (internal only; never exposed)
- `role: citizen | officer | dept_officer | analyst | authority | admin`
- `departmentId?, departmentName?, phone?`
- `status: active | suspended`
- `sessionVersion?: number`, `credentialsResetRequired?: boolean`
- `createdAt, updatedAt: string (ISO)`

### 2.2 Department (`departments`)
- `id, code: string` (unique), `name, description, headName, email, phone`
- `activeIncidentsCount: number`
- `categoriesCovered?: string[]`, `createdAt?: string`

### 2.3 Report (`reports`)
- `id, title, description`
- `category: ReportCategory` (Water & Drainage, Roads & Traffic, Public Sanitation, Power & Lighting, Parks & Environment, Structural Safety, Public Health, Noise & Disturbance)
- `subcategory?`, `locationName`, `latitude`, `longitude`
- `citizenId, citizenName, citizenEmail`
- `status: submitted | processing | analyzed | linked | under_review | assigned | resolved | closed`
- `urgency: low | medium | high | critical`
- `incidentId?`, `images?: string[]`
- `createdAt, updatedAt`

### 2.4 Incident (`incidents`)
- `id, title, description`, `category`
- `locationName, latitude, longitude, radiusMeters`
- `reportIds: string[]`
- `severity: low|medium|high|critical`
- `priority: P1_CRITICAL|P2_HIGH|P3_MEDIUM|P4_LOW|P1|P2|P3|P4`
- `confidence: number`, `status: potential|under_review|confirmed|in_progress|resolved|closed|dismissed`
- `isAIGenerated, humanReviewed`, review fields (`reviewedBy/At/Notes`)
- Assignment fields (`assignedDepartmentId/Name`, `assignedOfficerId/Name`)
- Resolution fields (`resolutionNotes`, `resolvedAt`), `evidence: string[]`
- `createdAt, updatedAt`

### 2.5 AIAnalysis (`analyses`, keyed by `reportId`)
- `reportId`, `categoryPredicted`, `categoryConfidence`, `keywords[]`
- `entities: { locations[], infrastructure[], hazards[], temporal[] }`
- `sentiment`, `duplicateProbability`, `topSimilarReports[]`
- `possibleIncident`, `incidentClusterId?`
- `severityIndicator`, `riskScore`, `evidence[]`, `uncertaintyNotes?`, `confidence`, `processedAt`

### 2.6 Assignment (`assignments`)
- `id, incidentId, departmentId, departmentName, officerId, officerName, assignedBy`
- `notes`, `status: assigned|in_progress|completed`, `assignedAt`

### 2.7 Inspection (`inspections`)
- `id, incidentId, officerId, officerName`
- `verifiedStatus: verified_match|disputed|partial`
- `observations`, `checklist { physicalVerification, safetyHazardAssessed, structuralDamageChecked, utilityImpactVerified }`
- `evidencePhotos[]`, `recommendedAction`, `inspectionDate`, `createdAt`
- Department verification: `departmentVerified?, departmentRemarks?, verifiedByOfficerId/Name?, verifiedAt?`

### 2.8 Resolution (`resolutions`)
- `id, incidentId, resolvedBy, actionTaken`
- `preventiveMeasures?`, `equipmentUsed?[]`, `costEstimate?`
- `citizenVerified: boolean`, `resolvedAt`

### 2.9 Notification (`notifications`)
- `id, userId, title, message`
- `type: report_status|incident_alert|assignment|resolution|system`
- `read: boolean`, `link?`, `createdAt`

### 2.10 Feedback (`feedbacks`)
- `id, reportId?, incidentId?, userId, userName, rating (1-5), comments, createdAt`

### 2.11 AuditLog (`auditLogs`)
- `id, timestamp, action, module (auth|reports|incidents|intelligence|admin|security)`
- `recordId?, userId, userEmail, userRole, ipAddress, details`
- Integrity: `hash?, prevHash?`, `metadata?`
- Chain: genesis-aware verification; canonical JSON hashing for new entries, legacy pipe format accepted for historical compatibility (no rewrite-on-verify)

### 2.12 RiskScore (`riskScores`)
- `id`, `entityType: report|incident|cluster`, `entityId`
- `score (0-100)`, `priority`, `factors[] { factor, weight, score, description }`
- `explanation`, `computedAt`

## 3. Relationships (logical)

- `reports.citizenId` → `users.id` (citizen ownership)
- `reports.incidentId` ↔ `incidents.reportIds[]` (linkage; consistency enforced in domain logic)
- `analyses.reportId` → `reports.id` (1:1 analytical record per report in current model)
- `incidents.assignedDepartmentId` → `departments.id`; `assignedOfficerId` → `users.id`
- `assignments.incidentId` → `incidents.id`; `assignments.officerId/departmentId` → users/departments
- `inspections.incidentId` → `incidents.id`; `inspections.officerId` → `users.id`
- `resolutions.incidentId` → `incidents.id`
- `notifications.userId` → `users.id`
- `feedbacks.userId/reportId/incidentId` → related entities (validated in flows)
- `auditLogs.userId/recordId` → contextual references (not strict FK in JSON engine)

## 4. Mongoose model mapping (scaffold)

- Models in `src/database/models/`: `User.ts`, `Department`/`AuditLog`/`Notification`/`Feedback`/`Assignment`/`Inspection`/`Resolution`/`AIAnalysis`/`RiskScore` in `AuxiliaryModels.ts`, `Report.ts`, `Incident.ts`, exported via `index.ts`.
- Schemas use string timestamps and explicit IDs for parity with JSON runtime; indexes defined for common lookups (`id` unique, role/status/email/category/status/date/geo as applicable).
- **Parity status:** structurally scaffolded and partially aligned; **full runtime behavioral parity, constraints/transactions, and query equivalence not verified**.

## 5. Snapshot/migration evidence (read-only source, isolated target)

Source: `.scip_database.json` (SHA-256 `262e382aecea305066df58b0d9dd634d84c3dc91d1d6a9101e701e557c649baa`, 159534 bytes, unchanged).  
Entities/counts: users 8, departments 4, reports 28, incidents 3, analyses 28, assignments 0, resolutions 0, inspections 6, notifications 29, feedbacks 10, auditLogs 67, riskScores 0.  
Audit chain: valid (67). Referential checks: 0 issues. Isolated `scip_dev` load: idempotent upserts with matching target counts and 0 errors (no runtime cutover).
