# SCIP — Smart Community Intelligence Platform

> **An AI-Assisted Municipal Community Intelligence & Decision Support Platform**  
> *Transforming citizen ground observations into structured municipal intelligence with Responsible AI governance.*

---

## 📌 1. Project Vision & Responsible AI Charter

**SCIP is NOT simply a complaint-ticketing or grievance redressal system.**

In traditional municipal portals, citizen complaints remain isolated tickets. A dozen citizens reporting flooded streets, overflowing culverts, stalled vehicles, and blocked intersections are handled as twelve disjoint tickets, frequently sent to different departments with duplicate effort and delayed emergency response.

SCIP bridges this divide by transforming individual citizen observations into **structured municipal intelligence**:

```
Community Report (Observation)
       ↓
Data Preprocessing (Tokenization, Stopwords, Stemming)
       ↓
AI/ML Analysis (TF-IDF Vector Space, Category Centroids)
       ↓
Relationship & Duplicate Detection (Cosine Similarity, Haversine Distance)
       ↓
Spatio-Temporal Incident Clustering (DBSCAN 500m / 48h Window)
       ↓
Explainable Multi-Factor Risk & Priority Scoring (P1-P4)
       ↓
Decision Support & Evidence Retrieval
       ↓
HUMAN-IN-THE-LOOP REVIEW (Authority Officer Confirmation / Dismissal)
       ↓
Departmental Operational Dispatch & Remediation
```

### 🛡️ The Inviolable Responsible AI Principle

1. **A community report is an observation:** Citizens report sensory observations (e.g. *"Water accumulation near market entrance"*).
2. **An AI-generated incident is an analytical interpretation:** Machine learning algorithms correlate proximate observations and hypothesize potential underlying infrastructure failures (e.g. *"Potential Incident: Concentrated Drainage Failure at Sector 4"*).
3. **An AI recommendation is NOT a final administrative decision:** Municipal authority officers must review evidence, corroborate physical ground reality, and formally confirm or dismiss incidents before municipal work orders are executed.

---

## 🏗️ 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express.js 4, TypeScript (`tsx` runtime engine)
- **Database Architecture:** MongoDB & Mongoose-compatible schema engine with transactional indexing, audit logging hooks, and seed persistence
- **AI/ML Pipeline:**
  - NLP Text Preprocessing (Tokenization, domain stopwords pruning, Porter-style stemming, n-grams)
  - TF-IDF Vectorizer (L2-normalized feature representation)
  - Cosine Similarity & Vector Matching Engine
  - Haversine Geospatial Formula (Great-Circle Distance in meters)
  - Spatio-Temporal DBSCAN Clustering ($Eps_{\text{spatial}} = 550\text{m}$, $Eps_{\text{temporal}} = 48\text{h}$, $\text{Sim}_{\text{semantic}} \ge 0.35$)
  - Multi-Factor Explainable Risk Scoring Engine (Hazard, Density, Infrastructure impact, Escalation velocity, Historical recurrence)
  - SCIP Intelligence Agent orchestrating 10 specialized intelligence tools
- **Security & RBAC:**
  - Password hashing via `bcryptjs`
  - JWT tokens with role claims
  - Granular permissions enforcement (`report.create`, `incident.resolve`, `audit.read`, etc.)
  - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
  - Immutable Audit Logging tracking action, module, user, timestamp, and IP address

---

## 🤖 3. SCIP Multi-Tool Intelligence Agent

The SCIP Intelligence Agent orchestrates 10 specialized tools:

1. **Classification Tool:** Supervised centroid classifier for 8 municipal categories.
2. **Entity Extraction Tool:** Extracts locations, infrastructure components, hazards, and temporal patterns.
3. **Similarity Tool:** Vector cosine similarity lookup across corpus.
4. **Duplicate Detection Tool:** Multi-factor duplicate probability combining text similarity, geographic distance, and time delta.
5. **Geospatial Analysis Tool:** Bounding box density and radius analysis.
6. **Incident Clustering Tool:** DBSCAN spatio-temporal clustering engine.
7. **Trend Analysis Tool:** Category distributions, daily intake volumes, and recurring hotspot detection.
8. **Risk Analysis Tool:** Multi-factor transparent risk breakdown.
9. **Evidence Retrieval Tool:** Retrieves raw citizen observations corroborating an incident.
10. **Intelligence Report Tool:** Synthesizes structured decision briefings with explicit uncertainty declarations.

---

## 👥 4. Pre-Configured Test Accounts (Roles & Permissions)

The platform comes pre-seeded with authenticated accounts representing every level of the municipal governance hierarchy:

| Role | Name | Email | Password | Access Capabilities |
|---|---|---|---|---|
| **Admin** | Adarsh Verma | `admin@scip.gov` | `AdminPass123!` | Full system administration, RBAC, audit logs, diagnostics |
| **Authority** | Dr. Rajesh Gupta | `director@scip.gov` | `DirectorPass123!` | Human review confirmation/dismissal, departmental dispatch |
| **Officer** | Vikram Sharma | `officer.sharma@scip.gov` | `OfficerPass123!` | Field investigation, incident resolution, assignment tracking |
| **Officer** | Sunita Patel | `officer.patel@scip.gov` | `OfficerPass123!` | Water & Sewerage field supervision |
| **Citizen** | Priya Sharma | `citizen.jane@scip.gov` | `CitizenPass123!` | Observation submission, report tracking, feedback submission |

*Note: You can instantly switch between test roles using the top navigation bar's **"Role:"** dropdown menu.*

---

## 🚀 5. Getting Started & Development Commands

### Prerequisites
- Node.js $\ge 20$
- npm or bun

### 1. Installation
```bash
git clone https://github.com/12av21/SCIP_MASTER.git
cd SCIP_MASTER
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default parameters are pre-configured (set strong, environment-specific values; never commit real secrets):
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-with-a-strong-random-secret-at-least-32-chars
MONGODB_URI=mongodb://127.0.0.1:27017/scip
```

### 3. Start Development Server
```bash
# Starts full-stack Express server with integrated Vite middleware on port 3000:
npm run dev
```
Open your browser at: `http://localhost:3000`

### 4. Build for Production
```bash
# Validates TypeScript types and produces optimized production client bundle:
npm run build
```

### 5. Typecheck & Linting
```bash
npm run typecheck
```

### 6. Isolated Automated Validation
```bash
npm run test:security
npm run test:security:http
npm run test:security:all
```
Run in a dedicated test environment only (isolated temp DB/test secrets). In-process runtime test execution (`/api/tests/run`) is disabled to protect application data.

---

## 🌐 6. REST API Reference

All backend endpoints are mounted under `/api/*` and return consistent JSON structures:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": {}
}
```

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register citizen or officer account
- `POST /api/auth/login` — Authenticate and receive JWT bearer token
- `POST /api/auth/demo-login` — Switch active role for development evaluation
- `GET /api/auth/me` — Retrieve active authenticated user profile
- `POST /api/auth/logout` — Revoke session and log audit event

### Reports (`/api/reports`)
- `GET /api/reports` — List reports with category, status, urgency, or citizen filters
- `POST /api/reports` — Submit new observation with automated AI analysis pipeline
- `GET /api/reports/:id` — Retrieve report details and stored AI analysis
- `PUT /api/reports/:id` — Update report
- `POST /api/reports/:id/reanalyze` — Re-execute NLP classification and similarity pipeline

### Incidents (`/api/incidents`)
- `GET /api/incidents` — List municipal incidents (potential, confirmed, in-progress, resolved)
- `GET /api/incidents/:id` — Retrieve incident dossier and all linked citizen reports
- `POST /api/incidents/from-cluster` — Convert AI spatio-temporal cluster into incident proposal
- `POST /api/incidents/:id/review` — **Human Review Boundary:** Confirm or dismiss incident with accountability notes
- `POST /api/incidents/:id/resolve` — Submit field resolution, equipment used, and cost estimate

### Intelligence & Analytics (`/api/intelligence`)
- `POST /api/intelligence/agent` — Execute multi-tool SCIP Intelligence Agent query
- `GET /api/intelligence/clusters` — Execute Spatio-Temporal DBSCAN clustering
- `GET /api/intelligence/hotspots` — Calculate geospatial density hotspots
- `GET /api/intelligence/trends` — Return longitudinal volume and category trends

### Governance & Administration (`/api/admin`)
- `GET /api/admin/users` — List platform users
- `PUT /api/admin/users/:id/role` — Update user role (Admin only)
- `GET /api/admin/departments` — List municipal departments and active work orders
- `GET /api/admin/audit-logs` — Query immutable audit trail with module and action filters
- `GET /api/admin/system-stats` — Runtime memory, uptime, and engine diagnostics

### System Verification (`/api/health`)
- `GET /api/health` — Platform health check
- `POST /api/tests/run` — **Disabled in-app/in-process** (safety control). Use isolated automated suites: `npm run test:security`, `npm run test:security:http`, `npm run test:security:all`.

---

## 🧪 7. Automated Validation & Security Audit

SCIP uses isolated, non-mutating automated validation (temporary database, ephemeral server, test-only secrets) and CI checks to protect application data. Key areas covered:

1. Authentication, session revocation/suspension, and credential-reset enforcement
2. RBAC permission boundaries and role-based access controls
3. Ownership/department scoping and PII minimization in hardened responses/exports
4. Input validation, allowlists, workflow/state guards, and safe error behavior
5. Audit integrity verification and tamper-detection checks (isolated fixtures/copies)
6. Security headers, CORS/preflight behavior, endpoint lockdown (seed/tests/demo-login), and health/404 handling
7. Typecheck and production build validation

Run in a dedicated test environment:
```bash
npm run typecheck
npm run test:security
npm run test:security:http
npm run test:security:all
npm run build
```
CI workflow: `.github/workflows/ci.yml`.

---

## 🏛️ Responsible Municipal Intelligence
*“Observations from citizens. Interpretations from AI. Decisions from humans.”*
