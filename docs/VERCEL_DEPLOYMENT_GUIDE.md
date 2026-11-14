# SCIP — Vercel Deployment Guide

**Project:** Smart Community Intelligence Platform (SCIP)  
**Target:** Vercel (frontend) + separate backend hosting (Express API)  
**Status:** Production deployment guidance  
**Date:** 2026-11-14

---

## 1. Architecture Overview

SCIP is a full-stack application:

| Component | Technology | Deployment Target |
|-----------|-----------|-------------------|
| Frontend | React 19 + Vite + Tailwind | Vercel (static hosting) |
| Backend API | Express 4 + Node.js | Separate service (Render, Railway, VPS, etc.) |
| Persistence | File-backed JSON (`.scip_database.json`) | Persistent disk volume (not on Vercel) |
| AI Engine | Local TypeScript (in-process) | Runs with backend |

**Important:** Vercel's serverless functions are ephemeral and do not provide persistent disk storage for `.scip_database.json`. The backend must be hosted on a platform with persistent disk (e.g., Render web service, Railway, Docker VPS).

---

## 2. Prerequisites

- GitHub repository connected to Vercel
- Node.js >= 20
- A separate hosting platform for the Express backend with persistent disk
- Strong `JWT_SECRET` (>= 32 characters)
- `CORS_ORIGINS` set to your Vercel frontend URL

---

## 3. Frontend Deployment on Vercel

### 3.1 Connect Repository

1. Push your code to GitHub
2. In Vercel dashboard: **Add New Project** → Import your SCIP repository
3. Configure the following settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `./` (or `frontend` if you move the frontend) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Development Command | `npm run dev` |

### 3.2 Environment Variables (Vercel)

Add these in **Project Settings → Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `VITE_API_BASE_URL` | `https://your-backend-url.com/api` | Production |

> ⚠️ Do NOT add `JWT_SECRET` or other backend secrets to Vercel frontend env. Those belong to the backend service.

### 3.3 Deploy

1. Click **Deploy**
2. Vercel will build the Vite project and deploy the `dist/` output
3. Your frontend will be available at `https://your-project.vercel.app`

---

## 4. Backend Deployment (Separate Service)

The Express backend cannot run on Vercel's Hobby tier serverless functions due to:
- No persistent disk for `.scip_database.json`
- No long-running process support (serverless functions are ephemeral)
- WebSocket/HMR not needed in production but long-lived connections are limited

### Option A: Render Web Service (Recommended with Vercel)

See `docs/RENDER_DEPLOYMENT_GUIDE.md` for full Render setup.

### Option B: Docker on VPS / Railway / Fly.io

Use the provided `Dockerfile`:

```bash
docker build -t scip-platform .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET=your-strong-secret \
  -e CORS_ORIGINS=https://your-vercel-app.vercel.app \
  -e SCIP_TRUST_PROXY=true \
  -v /path/to/persistent/data:/app/data \
  scip-platform
```

### Option C: Vercel Functions (Advanced, Not Recommended for Production)

You can convert Express API routes to Vercel serverless functions, but this:
- Loses persistent disk for JSON DB
- Requires significant refactoring
- Not recommended for production civic data

---

## 5. CORS Configuration

Set `CORS_ORIGINS` on your backend to allow your Vercel frontend:

```
CORS_ORIGINS=https://your-project.vercel.app
```

For multiple environments (preview, production):

```
CORS_ORIGINS=https://your-project.vercel.app,https://your-project-git-branch-yourrepo.vercel.app
```

---

## 6. Build Configuration

### vite.config.ts

Ensure your Vite config outputs to `dist/` and sets the correct base path:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
```

The existing `npm run build` already outputs to `dist/` which Vercel detects automatically.

---

## 7. Environment Variable Summary

| Variable | Where | Production Value |
|----------|-------|-----------------|
| `NODE_ENV` | Backend | `production` |
| `PORT` | Backend | `3000` (or Render-assigned) |
| `JWT_SECRET` | Backend | Strong random string, >= 32 chars |
| `CORS_ORIGINS` | Backend | `https://your-vercel-app.vercel.app` |
| `SCIP_TRUST_PROXY` | Backend | `true` (if behind Vercel/proxy) |
| `DATABASE_DRIVER` | Backend | `json` |
| `VITE_API_BASE_URL` | Frontend (Vercel) | `https://your-backend-url.com/api` |

---

## 8. Health Check

Your backend exposes `GET /api/health` (unauthenticated) for uptime monitoring. Configure your hosting platform's health check to hit this endpoint.

For combined frontend + backend health:

```
GET https://your-backend-url.com/api/health
```

Returns JSON with status, storage info, audit chain validity, uptime, and memory usage.

---

## 9. Limitations & Warnings

| Limitation | Mitigation |
|------------|------------|
| No persistent disk on Vercel | Host backend on Render/Railway/VPS with volume |
| JSON DB is single-process | Run one backend instance; do not scale to multiple replicas without shared storage |
| No built-in CI/CD on Vercel frontend | Use GitHub Actions (`.github/workflows/ci.yml`) for quality gates |
| No MongoDB runtime integration | Keep `DATABASE_DRIVER=json`; MongoDB is scaffolded but not runtime-integrated |

---

## 10. Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Connect repo to Vercel, set build command `npm run build`, output dir `dist`
- [ ] Add `VITE_API_BASE_URL` to Vercel env vars
- [ ] Deploy frontend on Vercel
- [ ] Deploy backend to Render (see `RENDER_DEPLOYMENT_GUIDE.md`) or Docker host
- [ ] Set `CORS_ORIGINS` on backend to your Vercel URL
- [ ] Set `JWT_SECRET`, `NODE_ENV=production` on backend
- [ ] Test `GET /api/health` on backend
- [ ] Test frontend → backend API calls
