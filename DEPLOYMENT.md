# SCIP — Deployment & Operations Guide

> **Smart Community Intelligence Platform (SCIP)**  
> Production deployment instructions for containers, cloud providers, and standalone servers.

---

## 1. Quick Start via Docker Compose (Recommended)

To run the complete SCIP stack including the Web frontend/backend, MongoDB database, and Python AI microservice:

```bash
# Clone the repository
git clone https://github.com/12av21/SCIP_MASTER.git
cd SCIP_MASTER

# Launch all 3 services in isolated containers
docker-compose up -d --build
```

The application will be accessible at `http://localhost:3000`.

To inspect logs:
```bash
docker-compose logs -f scip-web
```

To stop the containers:
```bash
docker-compose down
```

---

## 2. Standalone Node.js Deployment (Zero-Database Mode)

Because SCIP includes an embedded atomic disk-persistence engine, it can run directly without installing MongoDB:

```bash
# 1. Install dependencies
npm ci

# 2. Build production assets
npm run build

# 3. Start production server
npm start
```

Data will automatically persist to `.scip_database.json` in the application root directory.

---

## 3. Google Cloud Run Deployment

1. Build and push container to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/scip:latest
   ```

2. Deploy container to Cloud Run:
   ```bash
   gcloud run deploy scip-platform \
     --image gcr.io/PROJECT_ID/scip:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars JWT_SECRET="<strong-random-secret-min-32-chars>"
   ```

---

## 4. Low-Cost Linux VPS (DigitalOcean / Hetzner / Linode)

1. Provision Ubuntu 22.04 LTS ($4–$6/month droplet).
2. Install Node.js 22 and PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```
3. Clone and build:
   ```bash
   git clone https://github.com/12av21/SCIP_MASTER.git /var/www/scip
   cd /var/www/scip
   npm ci
   npm run build
   ```
4. Start with PM2:
   ```bash
   pm2 start server.ts --name scip --interpreter ./node_modules/.bin/tsx
   pm2 startup
   pm2 save
   ```
5. Configure Nginx reverse proxy to forward port 80/443 to `http://127.0.0.1:3000`.

---

## 6. Security Configuration Notes (Phase 1–3 remediation)

- `JWT_SECRET` is mandatory in production (>= 32 chars). Startup fails closed if missing/weak.
- Demo role switching (`/api/auth/demo-login`) is development-only and requires `ENABLE_DEV_DEMO_LOGIN=true` with `NODE_ENV!=production`.
- Database seeding/reset (`/api/seed`) is development-only, admin-only, requires `ENABLE_DEV_SEED=true`, and refuses when a persisted database exists.
- In-process mutation-based test runner (`/api/tests/run`) is disabled; use isolated automated tests in a dedicated test environment.
- Never commit real secrets, tokens, or `.env` files. Rotate any previously committed secrets.
