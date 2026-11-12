# SCIP — Deployment Guide

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-11  
**Status:** Guidance for **development/staging preparation only**. **NOT PRODUCTION READY / NOT SECURITY VERIFIED.** Do not deploy to production without closing blockers in `docs/KNOWN_LIMITATIONS.md` and `docs/SECURITY_AUDIT_REPORT.md`.

## 1. Runtime architecture (current)

- **Single Node/Express process** serves API and (in dev) Vite middleware or (in prod mode) static `dist/`.
- **Active persistence:** file-backed JSON engine (`.scip_database.json` or `SCIP_DB_PATH`) — **single-process, local-disk semantics**.
- **MongoDB:** connection/models/migration tooling scaffolded; **repository runtime not integrated/cut over** (`DATABASE_DRIVER` must remain `json` unless/until parity-verified and explicitly approved).
- **AI:** local TypeScript decision-support algorithms in-process; optional FastAPI microservice (`ai_service/main.py`) not required and not production-certified.

## 2. Prerequisites

- Node.js >= 20, npm
- Writable filesystem for runtime JSON persistence and logs (operationally managed)
- (Optional, isolated dev only) Local MongoDB for migration/parity work (`127.0.0.1:27017`, `scip_dev`)
- (Optional) Python 3.11+ for `ai_service` if experimenting (not required)

## 3. Environment configuration

Create `.env` from `.env.example`. **Never commit secrets.**

| Variable | Required | Guidance |
|---|---|---|
| `NODE_ENV` | Yes | `production` for production builds/runtime (enables stricter JWT checks, HSTS/baseline CSP, redacted errors) |
| `PORT` | Recommended | Server port (dev default `3000`; prod may use env/arg per `startServer`) |
| `JWT_SECRET` | **Yes (prod)** | Strong random secret, **>= 32 chars**; fail-closed in production |
| `DATABASE_DRIVER` | Yes | `json` (active/safe). Do not set to runtime Mongo until integrated/approved |
| `SCIP_DB_PATH` | Optional | Path to JSON DB file; use isolated paths for tests/staging snapshots |
| `MONGODB_URI` | Optional | **Isolated local only** for dev/migration checks; never Atlas/prod/existing DB; not logged |
| `CORS_ORIGINS` | Recommended | Comma-separated explicit allowlist of trusted frontend origins |
| `DISABLE_RATE_LIMIT` | Test only | `true` only in isolated automated tests |
| `ENABLE_DEV_DEMO_LOGIN` | No | Keep `false` in prod; dev-only opt-in |
| `ENABLE_DEV_SEED` | No | Keep `false` in prod; dev-only admin opt-in, refuses on persisted DB |
| `ENABLE_DEV_TESTS` | No | Keep `false` in prod (in-process runner disabled by design) |

## 4. Build and run

```bash
# install
npm ci

# quality gates (recommended before any deployment attempt)
npm run typecheck
npm run build
npm run test:security:all
npm audit --omit=dev

# development
npm run dev

# production-style
NODE_ENV=production npm run build
NODE_ENV=production npm run start
```

- Vite base path: `/` by default; `/SCIP_MASTER/` when `GITHUB_ACTIONS=true` (see `vite.config.ts`) — ensure frontend/API routing and asset paths match deployment context.
- Health check: `GET /api/health` (unauthenticated) for liveness/basic status (sanitized).

## 5. Reverse proxy / TLS / networking (recommended)

- Terminate TLS at a trusted reverse proxy/load balancer; enforce HTTPS externally.
- Configure proxy to forward client IPs appropriately if rate limiting/auditing depends on them (current in-app limiter is best-effort/single-process).
- Restrict `CORS_ORIGINS` to exact trusted origins; avoid wildcards.
- Do not expose internal admin/dev endpoints publicly; keep dev flags disabled.
- Validate CSP, headers, caching, and WebSocket/HMR behavior (HMR dev-only) in the target environment.

## 6. Persistence and backups

- **JSON runtime:** back up the DB file during quiesced/controlled windows; ensure atomic write safety and single-writer process. `data/db` (if used) must be handled per policy.
- **MongoDB:** not active for runtime; any future use requires parity, migration, backup/restore drills, and approved cutover.
- **Audit logs:** integrity is verifiable in-app; for stronger guarantees use external immutable/WORM log storage and monitored backups (not configured in-repo).

## 7. Security hardening checklist (pre-deployment)

- [ ] Strong `JWT_SECRET` set, rotated per policy, stored in secret manager (not `.env` in repo)
- [ ] `NODE_ENV=production`, dev flags disabled
- [ ] `CORS_ORIGINS` minimal and explicit
- [ ] HTTPS/TLS, secure proxy headers, and firewall rules configured
- [ ] Dependency and image (if containerized) scanning in pipeline
- [ ] Centralized, PII-safe logging/monitoring/alerting configured
- [ ] Distributed rate limiting/WAF protections where needed
- [ ] Backup/restore and incident response runbooks tested
- [ ] RBAC/privacy behaviors validated in staging with representative data

## 8. CI/CD notes

- GitHub Actions workflow: `.github/workflows/ci.yml` (typecheck, build, isolated tests, `npm audit --omit=dev`).
- CI success != production readiness. Add environment-specific deployment gates, secret scanning, SAST/DAST as appropriate, and staged rollout controls externally.

## 9. Containerization (optional guidance)

No production-certified Dockerfile is mandated by this guide. If containerizing:
- Use multi-stage build, run as non-root, mount persistent storage for JSON DB (single instance) or adopt approved DB architecture.
- Inject secrets at runtime; do not bake `.env`/DB files into images.
- Healthcheck against `GET /api/health`.

## 10. Explicit prohibitions

- No deployment claiming **security verified / production ready / certified** based on current evidence.
- No enabling Mongo runtime cutover without completed parity, isolated verification, and explicit approval.
- No use of seed/test/demo dev features in production.
- No modification/reset/migration of existing user data stores without approved, isolated, reversible procedures.

## 11. Related documents

- `docs/SECURITY_AUDIT_REPORT.md`, `docs/TESTING_AND_VALIDATION_REPORT.md`, `docs/KNOWN_LIMITATIONS.md`
- `docs/DATABASE_SETUP_GUIDE.md`, `docs/DATABASE_MIGRATION_GUIDE.md`, `docs/DATABASE_SCHEMA.md`
- `docs/API_DOCUMENTATION.md`, `docs/AUTHORIZATION_MATRIX.md`, `docs/ROLE_ENDPOINT_AUTHORIZATION_MATRIX.md`
- `docs/FINAL_SYSTEM_ARCHITECTURE.md`, `PROJECT_STATUS_REPORT.md`
