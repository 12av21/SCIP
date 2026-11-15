# SCIP AI Service Integration (Phase 2.1)

Infrastructure foundation for communication between the Node.js/Express backend and the Python/FastAPI AI microservice.

**Status:** Foundation only — service integration, health checks, configuration, and fallback behavior. No sentence-transformers, embeddings, model training, or new AI capabilities are operational in this phase.

---

## 1. Architecture overview

```
+---------------------+          HTTP (optional)          +-----------------------+
|  Node.js/Express    | <================================> |  Python/FastAPI       |
|  (port 3000)        |          AI_SERVICE_URL           |  microservice         |
|                     |          (port 8000)              |  (port 8000)          |
|  src/server/app.ts  |                                   |  ai_service/main.py   |
|  AI routes (REST)   |                                   |  /health, /ready      |
|                     |                                   |  /classify            |
|  src/ai/aiServiceAdapter.ts  (optional client)           |  /duplicate-check     |
|  - Falls back to    |                                   |  /ner, /prioritize    |
|    local TS engine  |                                   |  /embed*, /semantic-* |
+---------------------+                                   +-----------------------+
        ^
        |
  Local TypeScript AI engine (always available, primary fallback)
  - classifier.ts, duplicateDetector.ts, riskScorer.ts,
    hindiPreprocessor.ts, multilingual*.ts, tfidf.ts
```

### Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Node.js backend** | Primary request handling, auth/RBAC, report/incident CRUD, API contracts, local TypeScript AI engine (classification, duplicate detection, entities, risk scoring, multilingual NLP), optional Python client via `aiServiceAdapter`. |
| **Python service** | Optional stateless microservice exposing `/health`, `/ready`, `/classify`, `/duplicate-check`, `/ner`, `/prioritize`, `/embed`, `/embed-batch`, `/semantic-similarity`. Lazy-loads sentence-transformers only on explicit request; never at startup. |
| **aiServiceAdapter** | Centralized Node.js client for the Python service. Reads `AI_SERVICE_URL` / `AI_SERVICE_ENABLED` / `AI_SERVICE_TIMEOUT_MS`. Falls back to the local TypeScript engine when Python is disabled, unreachable, times out, or errors. Never logs request bodies (citizen report text). |

---

## 1.1 Verified Integration Status (Phase 2.2)

**The `aiServiceAdapter` is NOT imported by any application route.** It is instantiated as a singleton (`aiAdapter`) but no production request path calls it. Report creation and all AI analysis in `src/database/scipDatabase.ts` and `src/database/mongoRepository.ts` call the local TypeScript AI functions directly (`classifyReport`, `extractEntities`, `findSimilarAndDuplicateReports`, `computeExplainableRisk`, `determineSeverity`).

| Verification | Result | Evidence |
|-------------|--------|----------|
| Adapter → live Python `/health` | PASS | Returns `{"status":"healthy","service":"scip-ai","version":"1.0.0"}` |
| Adapter → live Python `/classify` | PASS | Returns category + confidence from Python service |
| Python disabled → TS fallback | PASS | `isServiceEnabled()=false`, no fetch attempted, local TS engine used |
| Python unavailable → TS fallback | PASS | Connection refused → fallback in ~9ms, no hang |
| Connection timeout → TS fallback | PASS | AbortController timeout, fallback, no hang |
| Invalid Python response → TS fallback | PASS | Non-2xx, invalid JSON → fallback |
| Report creation (TS path) | PASS | 62/62 AI verification tests pass including report creation + re-analysis |
| Application-level route → Python | **BLOCKED** | No route imports or invokes `aiAdapter` |

**Integration gap:** The adapter exists and works at runtime against a live Python service, but no application route invokes it. To route supported capabilities through Python, a route must be wired to call `aiAdapter.classify()`, `aiAdapter.checkDuplicates()`, etc. This was intentionally not done in Phase 2.2 to avoid modifying production request behavior.


## 2. Local setup instructions

### Prerequisites
- Node.js (for the backend)
- Python 3.11+ (for the AI microservice)
- No Redis, Kafka, BullMQ, or external cloud services required.

### Backend (Node.js)
```bash
# Install dependencies (if not already installed)
npm install

# Typecheck + build
npm run typecheck
npm run build

# Start the backend (port 3000)
npm run dev        # development (Vite middleware)
# or
npm run start      # production build served via `dist`
```

The backend starts and works **without** the Python service. Python integration is disabled by default (`AI_SERVICE_ENABLED=false`).

### Python AI microservice (port 8000)
```bash
cd ai_service

# Start with uvicorn (no model downloads at startup)
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# or directly
python3 main.py
```

Verify it is reachable:
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"scip-ai","version":"1.0.0",...}
```

### Enable Python integration (optional)
Set `AI_SERVICE_ENABLED=true` and point `AI_SERVICE_URL` at the running Python service:
```bash
export AI_SERVICE_URL=http://localhost:8000
export AI_SERVICE_ENABLED=true
export AI_SERVICE_TIMEOUT_MS=5000
```
Then restart the backend. Supported capabilities (classify, duplicate-check, embed*, semantic-similarity) will route to Python when reachable, with automatic fallback to the TypeScript engine otherwise.

---

## 3. Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SERVICE_URL` | unset | Base URL of the Python FastAPI service (e.g. `http://localhost:8000` or `http://scip-ai:8000` in Docker). Trailing slashes are stripped. |
| `AI_SERVICE_ENABLED` | `false` | `"true"` enables routing supported capabilities to Python. Any other value keeps the local TypeScript engine as the sole path. |
| `AI_SERVICE_TIMEOUT_MS` | `5000` | Per-request timeout in milliseconds for calls to the Python service. |

Add these to `.env.example` (done). Never modify the actual `.env` file or commit secrets.

---

## 4. Health-check endpoints

### `GET /health` (Python service)
Returns service status without loading models or performing inference.

**Example response:**
```json
{
  "status": "healthy",
  "service": "scip-ai",
  "version": "1.0.0",
  "engine": "TF-IDF / Centroid Classifier / Geospatial Harversine",
  "sentence_transformers_available": false,
  "embedding_model": null,
  "timestamp": "2026-11-14T18:20:35.442Z"
}
```

Health checks never trigger sentence-transformers downloads or model loading.

### `GET /ready` (Python service)
Readiness probe. The service is ready without preloading any ML models.

**Example response:**
```json
{
  "status": "ready",
  "service": "scip-ai",
  "version": "1.0.0",
  "sentence_transformers_available": false,
  "embedding_model_loaded": false
}
```

### Node.js health probe
`aiAdapter.healthCheck()` resolves `true` only when `AI_SERVICE_ENABLED=true`, a base URL is configured, and `/health` returns `status === "healthy"`. It never throws; failures resolve to `false` so callers fall back.

---

## 5. API request/response contracts

All Python endpoints validate input via Pydantic models and return structured JSON. Invalid requests return controlled errors (e.g. `422` validation, `503` when sentence-transformers is unavailable).

| Endpoint | Method | Request key fields | Response key fields |
|----------|--------|-------------------|---------------------|
| `/health` | GET | — | `status`, `service`, `version`, `sentence_transformers_available` |
| `/ready` | GET | — | `status`, `service`, `version`, `embedding_model_loaded` |
| `/classify` | POST | `text`, `declared_category?` | `predicted_category`, `confidence`, `explanation`, `model_version`, `low_confidence_review` |
| `/duplicate-check` | POST | `target_text`, `target_lat`, `target_lng`, `candidates` | `top_similar`, `duplicate_probability`, `explanation` |
| `/ner` | POST | `text` | `locations`, `hazards`, `infrastructure`, `model_version` |
| `/prioritize` | POST | `severity`, `report_count?`, `is_hotspot?`, `affected_infrastructure?` | `score`, `priority`, `explanation` |
| `/embed` | POST | `text`, `model_id?` | `text`, `model_id`, `embedding`, `dimension` |
| `/embed-batch` | POST | `texts`, `model_id?` | `model_id`, `embeddings`, `dimension`, `count` |
| `/semantic-similarity` | POST | `text_a`, `text_b`, `model_id?` | `text_a`, `text_b`, `similarity`, `model_id` |

`/embed`, `/embed-batch`, `/semantic-similarity` return `503` when sentence-transformers is not installed (graceful degradation — not a crash).

---

## 6. Timeout and fallback behavior

The `AIServiceAdapter` enforces a configurable timeout (`AI_SERVICE_TIMEOUT_MS`, default 5000ms) via `AbortController` on every fetch to the Python service.

Fallback rules (in order):
1. If `AI_SERVICE_ENABLED !== "true"` or no `AI_SERVICE_URL` → use local TypeScript engine immediately (no fetch attempted).
2. If Python is unreachable, connection refused, or DNS fails → catch error → local TypeScript engine.
3. If Python returns non-2xx (e.g. 500) → throw → local TypeScript engine.
4. If Python returns invalid JSON → throw → local TypeScript engine.
5. If the request times out → throw → local TypeScript engine.
6. Python failure is **never fatal**: report creation, classification, duplicate detection, and other capabilities continue working via the local TypeScript engine.

No infinite retries or retry storms: each request is attempted once, then falls back.

Fallback behavior is observable:
- `aiAdapter.isServiceEnabled()` reports whether Python routing is active.
- `aiAdapter.getConfig()` returns the non-sensitive config (`enabled`, `baseUrl`, `timeoutMs`).
- Structured console logs (`[SCIP AI Adapter]`) record initialization, timeouts, HTTP errors, and request failures without logging request bodies.

### No sensitive data in logs
Request bodies (which may contain citizen report text, names, emails) are **never** logged. Only metadata such as path, status code, and timeout values are logged.

---

## 7. Docker instructions

`docker-compose.yml` defines three services:

| Service | Port | Notes |
|---------|------|-------|
| `scip-web` | 3000 | Node.js backend. `AI_SERVICE_ENABLED=false` — starts independently of Python. |
| `scip-ai` | 8000 | Python FastAPI microservice. Defined but optional; Node.js does not `depends_on` it. |
| `scip-mongo` | 27017 | MongoDB (gated, non-production default). |

Start everything:
```bash
docker compose up --build
```

Start only the backend (without Python):
```bash
docker compose up scip-web
```

Start only the Python AI service:
```bash
docker compose up scip-ai
```

The Python Dockerfile uses `python:3.11-slim`, installs dependencies from `ai_service/requirements.txt`, exposes port 8000, and includes a `HEALTHCHECK` that calls `/health`. No ML models are downloaded during container build or startup; sentence-transformers loads lazily on first `/embed` request (only if installed and requested).

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `curl /health` fails (connection refused) | Python service not running | Start `python3 main.py` or `docker compose up scip-ai` |
| Backend logs "python service request timed out" | Python slow or overloaded | Increase `AI_SERVICE_TIMEOUT_MS`; check Python process |
| Backend falls back to local engine unexpectedly | `AI_SERVICE_ENABLED=false` or Python unreachable | Set `AI_SERVICE_ENABLED=true` and verify `/health` |
| `/embed` returns 503 | sentence-transformers not installed | Expected in this phase; embeddings not operational. Install `sentence-transformers` only if you explicitly need embeddings (out of scope for Phase 2.1) |
| Backend won't start | JWT_SECRET missing / weak | Set a strong `JWT_SECRET` (>=32 chars) in `.env` |

---

## 9. Current limitations

- **Python integration disabled by default.** The local TypeScript engine handles all AI capabilities; Python is an optional stateless microservice.
- **Sentence-transformers not installed** in the target environment (limited RAM). `/embed`, `/embed-batch`, `/semantic-similarity` return `503` when called. This is graceful degradation, not a failure.
- **No model downloads at startup or in Docker builds.** Models load lazily and only on explicit request.
- **Infrastructure ≠ integrated ML.** Defining the Python service, health endpoints, and the Node.js client is service integration only. It does not make sentence-transformers, embeddings, or any trained model operational.
- **`.scip_database.json` is read-only for tests** and must never be modified by test runs. Test scripts use isolated temporary database paths where supported; a small number of test scripts read `.scip_database.json` as a seed source (read-only).

---

## 10. How to verify

```bash
# TypeScript
npm run typecheck
npm run build
npx tsx scripts/ai-verification-test.mts          # 62/62
npx tsx scripts/ai-hindi-hinglish-test.mts        # 83/83
npx tsx scripts/ai-india-civic-test.mts           # 87/87
npm run test:security                             # 46/46
npm run test:security:http                        # 382/382

# Python AI service
python3 ai_service/test_main.py                   # 16/16

# Node.js adapter (mocked fetch, no server required)
npx tsx scripts/ai-service-adapter-test.mts       # 23/23

# Live Node.js-to-Python integration (requires Python service running on :8000)
# Terminal 1: cd ai_service && python3 main.py
# Terminal 2: npx tsx scripts/phase22-live-integration-test.mts  # 18/18
```

---

## 11. Phase boundary

Phase 2.1 establishes the communication foundation only. It deliberately does **not**:
- Install or use sentence-transformers / embeddings.
- Train models.
- Add LLM integration.
- Add predictive analytics.
- Add Redis, BullMQ, or external cloud services.
- Change the primary AI path away from the local TypeScript engine.

These are out of scope and await explicit approval for Phase 2.2.
