# SCIP — Render Deployment Guide

**Project:** Smart Community Intelligence Platform (SCIP)  
**Target:** Render (full-stack: Express backend + React frontend)  
**Status:** Production deployment guidance  
**Date:** 2026-11-14

---

## 1. Architecture Overview

Render can host the complete SCIP stack as a single **Web Service** with a **Persistent Disk**:

| Component | Technology | Render Service |
|-----------|-----------|----------------|
| Backend API | Express 4 + Node.js | Web Service |
| Frontend | React 19 + Vite (static `dist/`) | Served by Express in production |
| Persistence | File-backed JSON (`.scip_database.json`) | Render Persistent Disk |
| AI Engine | Local TypeScript (in-process) | Runs with backend |

**Single-service approach:** The Express server serves both the API (`/api/*`) and static frontend (`dist/`) in production mode. A Render Persistent Disk stores `.scip_database.json` and `backups/`.

---

## 2. Prerequisites

- GitHub repository connected to Render
- Node.js >= 20 (auto-detected from `package.json`)
- Strong `JWT_SECRET` (>= 32 characters)
- Render account with permission to create Web Services and Disks

---

## 3. Create the Render Web Service

### 3.1 Connect Repository

1. In Render dashboard: **New → Web Service**
2. Connect your GitHub repository
3. Select the SCIP repository

### 3.2 Configure Service Settings

| Setting | Value |
|---------|-------|
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `NODE_ENV=production npx tsx server.ts` |
| Node Version | 20 |
| Instance Type | Starter (or higher for production) |
| Region | Choose closest to your users |

### 3.3 Add Persistent Disk

1. In the Render service dashboard: **Disks → Add Disk**
2. Mount path: `/app/data`
3. Size: 1 GB minimum (adjust based on expected data volume)

This disk stores `.scip_database.json` and the `backups/` directory.

### 3.4 Environment Variables

Add in **Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | No (Render provides `PORT`) |
| `JWT_SECRET` | Strong random string, >= 32 chars | Yes |
| `DATABASE_DRIVER` | `json` | Yes |
| `SCIP_DB_PATH` | `/app/data/.scip_database.json` | Recommended |
| `SCIP_TRUST_PROXY` | `true` | Yes (Render is behind a proxy) |
| `CORS_ORIGINS` | Your frontend URL(s) | Yes |

> ⚠️ Set `SCIP_DB_PATH` to `/app/data/.scip_database.json` so the database lives on the persistent disk.

### 3.5 Deploy

1. Click **Create Web Service**
2. Render will build and deploy
3. Your API will be available at `https://your-service.onrender.com`

---

## 4. Docker Deployment on Render (Alternative)

If you prefer Docker, use the provided `Dockerfile`:

1. **New → Web Service** → Deploy existing image from a registry, OR
2. Connect GitHub and use Docker build

Render will use the root `Dockerfile`:

```
FROM node:20-alpine
...
CMD ["npx", "tsx", "server.ts"]
```

Add the same environment variables and attach a persistent disk at `/app/data`.

---

## 5. Optional: AI Service (Python FastAPI)

SCIP includes an optional Python FastAPI AI microservice (`ai_service/`) that is **not required** for production. The local TypeScript AI engine runs in-process with the backend.

If you want to deploy the AI service separately on Render:

1. **New → Web Service**
2. Root directory: `ai_service`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set `AI_SERVICE_URL` on your backend to point to the AI service URL

Or use Docker with the provided `ai_service/Dockerfile`.

---

## 6. Optional: Frontend on Vercel + Backend on Render

For a split deployment (frontend on Vercel, backend on Render):

1. Deploy frontend to Vercel (see `VERCEL_DEPLOYMENT_GUIDE.md`)
2. Deploy backend to Render (this guide)
3. Set `CORS_ORIGINS` on Render backend to your Vercel URL:
   ```
   CORS_ORIGINS=https://your-project.vercel.app
   ```
4. Set `VITE_API_BASE_URL` on Vercel frontend:
   ```
   VITE_API_BASE_URL=https://your-service.onrender.com/api
   ```

---

## 7. Health Check

Render automatically health-checks your service. SCIP exposes:

```
GET /api/health
```

Returns JSON with:
- `status`: `"OK"` or `"DEGRADED"`
- `storageExists`: whether the DB file exists
- `storageSizeMB`: database file size
- `auditChainValid`: audit log integrity
- `uptimeSeconds`: process uptime
- `memory`: heap usage

Configure Render's health check to use `GET /api/health`.

---

## 8. Backups & Persistence

The JSON database file and backups live on the Render Persistent Disk at `/app/data/`:

- `.scip_database.json` — active database
- `backups/` — timestamped backup snapshots

### Backup Strategy

Use the built-in backup endpoint:

```bash
# Create a backup (requires admin/auth authority token)
POST /api/admin/backup
```

Backups are stored in `/app/data/backups/`. Download them periodically to off-site storage.

### Disk Persistence Warning

Render Persistent Disks are tied to a specific region. If you migrate regions, you must migrate the disk data. Do not rely on Render disk as your only backup — export backups regularly.

---

## 9. Environment Variable Summary

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `NODE_ENV` | `production` | Enables CSP, HSTS, redacted errors |
| `PORT` | `3000` (Render-assigned) | Render overrides with its own PORT |
| `JWT_SECRET` | `>= 32 random chars` | Store in Render env, never in repo |
| `DATABASE_DRIVER` | `json` | Do not change to `mongo` without approval |
| `SCIP_DB_PATH` | `/app/data/.scip_database.json` | On persistent disk |
| `SCIP_TRUST_PROXY` | `true` | Render is behind a reverse proxy |
| `CORS_ORIGINS` | `https://your-frontend.com` | Comma-separated allowlist |
| `AI_SERVICE_URL` | (optional) | Only if deploying Python AI service separately |

---

## 10. Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Connect repo to Render as Web Service
- [ ] Set build command: `npm ci && npm run build`
- [ ] Set start command: `NODE_ENV=production npx tsx server.ts`
- [ ] Add persistent disk at `/app/data`
- [ ] Add environment variables (JWT_SECRET, CORS_ORIGINS, etc.)
- [ ] Set `SCIP_DB_PATH=/app/data/.scip_database.json`
- [ ] Set `SCIP_TRUST_PROXY=true`
- [ ] Deploy and verify `GET /api/health` returns `{"status":"OK"}`
- [ ] Test frontend → backend API calls
- [ ] Set up automated backups via `/api/admin/backup`

---

## 11. Related Documents

- `docs/DEPLOYMENT_GUIDE.md` — General deployment guide
- `docs/VERCEL_DEPLOYMENT_GUIDE.md` — Vercel frontend deployment
- `docs/SECURITY_AUDIT_REPORT.md` — Security hardening checklist
- `docs/KNOWN_LIMITATIONS.md` — Known limitations and constraints
- `Dockerfile` — Container definition
- `ai_service/Dockerfile` — AI service container (optional)
