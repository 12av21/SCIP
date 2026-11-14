# SCIP — AI Functionality Verification & Validation Report

**Project:** Smart Community Intelligence Platform (SCIP)  
**Date:** 2026-11-13  
**Verified by:** Senior AI/ML Engineer & QA Automation Engineer  
**Status:** Verification complete — honest verdicts per capability below

---

## Executive Summary

The SCIP AI system is **not a trained AI/ML system**. It is a rule-based, keyword-driven, and statistical heuristic engine implemented in TypeScript. All AI capabilities execute correctly and produce deterministic output, but they are **not machine learning models** — there is no training data, no model weights, no neural networks, and no LLM integration. The Python FastAPI microservice (`ai_service/`) exists as a standalone artifact but is **not wired into the Node.js runtime**; the local TypeScript engine is the only active AI path.

**Overall verdict: The AI system executes and produces output, but should not be described as "AI" in the ML sense. It is a deterministic expert-system/heuristic pipeline.**

---

## 1. AI Architecture Discovered

### 1.1 Active Runtime: Local TypeScript Engine (`src/ai/`)

| Module | File | Algorithm Type | Trained Model? |
|---|---|---|---|
| Classification | `src/ai/classifier.ts` | TF-IDF centroid cosine similarity against hand-crafted category profiles | No |
| Entity Extraction | `src/ai/classifier.ts` | Keyword substring matching against fixed lists | No |
| Severity/Hazard | `src/ai/classifier.ts` | Keyword presence rules (critical/high/medium keyword lists) | No |
| Duplicate Detection | `src/ai/duplicateDetector.ts` | Composite score: TF-IDF cosine + Haversine distance + temporal delta + category match | No |
| Incident Clustering | `src/ai/incidentClustering.ts` | DBSCAN-inspired spatial-temporal-semantic clustering | No |
| Risk Scoring | `src/ai/riskScorer.ts` | Weighted sum of 5 transparent factors (severity, category, recency, volume, hotspot) | No |
| Intelligence Agent | `src/ai/scipAgent.ts` | Rule-based tool orchestration (no planning, no LLM) | No |
| TF-IDF Vectorizer | `src/ai/tfidf.ts` | Bag-of-terms (unigram+bigram), sublinear TF, smooth IDF, L2-normalized cosine | No |
| Text Preprocessor | `src/ai/preprocessor.ts` | Lowercasing, stopword removal, Porter-style stemming, n-grams | No |
| Model Evaluation | `src/database/scipDatabase.ts:evaluateClassifier()` | Holdout validation (70/30 split) against existing reports; precision/recall/F1 | No |

### 1.2 Standalone Artifact: Python FastAPI Microservice (`ai_service/`)

| File | Status | Integrated? |
|---|---|---|
| `ai_service/main.py` | Exists; keyword classification, Jaccard duplicate detection, regex NER, priority scoring | **No** — not called by Node.js backend |
| `ai_service/requirements.txt` | Exists; fastapi, uvicorn, pydantic, scikit-learn, numpy | Not installed; service not running |

The `aiServiceAdapter.ts` (`src/ai/aiServiceAdapter.ts`) references `AI_SERVICE_URL` env var and would fall back to the local TS engine if the service is unreachable. The service is **not started** by `server.ts` or `docker-compose.yml` (the compose references `./ai_service/Dockerfile` which does not exist).

### 1.3 Integration Path

When a citizen submits a report via `POST /api/reports`:
1. `reportRoutes.ts:251` → `db.createReport()` (`scipDatabase.ts:716`)
2. `createReport()` fits the global `TFIDFVectorizer` on the full report corpus
3. `createReport()` calls `runAndStoreAIAnalysis()` (`scipDatabase.ts:891`) which executes all 5 AI modules synchronously
4. Results stored in `this.analyses` Map (in-memory) and persisted to `.scip_database.json`
5. Report + analysis returned in HTTP response

The same analysis is retrievable via `GET /api/reports/:id` → `db.getAIAnalysisForReport()`.

---

## 2. Actual Algorithms and Models (Honest Classification)

None of the following are "trained AI models":

| Capability | Technique | Evidence of Training? | Verdict |
|---|---|---|---|
| Category Classification | TF-IDF vector + cosine similarity to 8 hand-written category term profiles with manual weights | No training data, no weights learned, no validation set | **Rule-based/statistical heuristic** |
| Entity Extraction | Substring matching against hardcoded lists of ~50 location/infrastructure/hazard/temporal terms | No NER model, no training data | **Keyword-based rules** |
| Severity Assessment | Ordered keyword list matching (critical → high → medium → low → declared) | No ML model | **Keyword-based rules** |
| Duplicate Detection | Composite: text cosine (50%) + spatial proximity (35%) + temporal proximity (15%) × category factor | No ML model | **Statistical heuristic** |
| Incident Clustering | DBSCAN-inspired: Haversine distance + time delta + cosine similarity + related-domain cascades | No ML model | **Statistical heuristic** |
| Risk Scoring | Weighted sum: severity (30%) + category hazard (10%) + 3 other factors | No ML model | **Transparent scoring formula** |
| Intelligence Agent | If/else query keyword matching → tool selection → template synthesis | No LLM, no planning | **Rule-based orchestration** |

---

## 3. Feature-by-Feature Test Results

Test suite: `scripts/ai-verification-test.mts` — 53 tests across 12 capability areas.  
Results: **46 passed, 7 failed** (failures are expectation mismatches, not crashes — all code executes without errors).

### 3.1 Issue Classification

**Verdict: PARTIALLY VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Pothole road report | "Pothole on Main Street near Sector 4 market..." | Roads & Traffic | Roads & Traffic (conf: 0.55) | PASS |
| Garbage sanitation report | "Garbage piled up at Sector 7 park..." | Public Sanitation | **Public Health** (conf: 0.55, score: 0.107) | **FAIL** |
| Streetlight power report | "Streetlight not working on River Road..." | Power & Lighting | Power & Lighting (conf: 0.55) | PASS |
| Sewage drainage report | "Sewage overflow at Sector 12..." | Water & Drainage | Water & Drainage (conf: 0.65) | PASS |
| Duplicate pothole report | "Pothole near Sector 4 market junction..." | Roads & Traffic | Roads & Traffic (conf: 0.55) | PASS |
| Fallen tree parks report | "Fallen tree blocking hospital road..." | Parks & Environment | Parks & Environment (conf: 0.55) | PASS |
| Building crack structural | "Crack in building wall near central plaza..." | Structural Safety | Structural Safety (conf: 0.65) | PASS |
| Loud music noise report | "Loud music from construction at midnight..." | Noise & Disturbance | Noise & Disturbance (conf: 0.55) | PASS |
| Empty input | "" | Any category | Returns best match (conf: 0.55) | PASS |
| Short input | "Pothole. Hole." | Any category | Returns output without error | PASS |
| Long input | 200+ char title, 3000+ char description | Any category | Returns output without error | PASS |
| Ambiguous text | "Something wrong here..." | Any category | Returns output (likely misclassified) | PASS |
| Hindi input | "सड़क पर गड्ढा है..." | Any category | Returns output (Devanagari not processed) | PASS |
| Confidence bounds | Normal text | 0 ≤ conf ≤ 1 | 0.55 | PASS |

**Analysis:** Classification works for 7 of 8 category-specific test cases. The garbage report was classified as "Public Health" because the text mentions "stray dogs and rodents" which overlap with Public Health keyword terms ("animal", "hygiene"). Confidence scores are uniformly low (0.55–0.65) because the TF-IDF corpus is small (8 test reports) and category profiles are sparse. **Not a trained model** — centroid cosine similarity against hand-written term lists.

### 3.2 Priority / Severity Assessment

**Verdict: VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Live wire | "Live wire sparking on the road" | critical | critical | PASS |
| Building collapse | "Building collapse risk at old structure" | critical | critical | PASS |
| Open manhole | "Open manhole on the street" | high | high | PASS |
| Pothole | "Pothole on the main road" | medium | medium | PASS |
| Clean street | "Street needs cleaning" | low | low | PASS |
| Declared override | "minor issue" (declared: critical) | critical | critical | PASS |

**Analysis:** Keyword-based severity detection works correctly for all keyword-triggered cases. Declared urgency overrides keyword detection when keywords don't match. Pure rule-based, no ML.

### 3.3 Duplicate Detection

**Verdict: PARTIALLY VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Same location, similar text | REP-001 vs REP-005 (15m apart, same title) | Prob ≥ 0.70 | **Prob: 0.69** (isPotentialDuplicate: true) | **FAIL** |
| Same text, different city | Same text, ~1700km apart | Prob < 0.70 | Prob: 0.36 | PASS |
| Empty corpus | Target + zero candidates | Prob: 0, 0 matches | Prob: 0, 0 matches | PASS |

**Analysis:** Duplicate detection executes correctly. The same-location similar-text case scored 0.69, just below the 0.70 duplicate threshold — however `isPotentialDuplicate` was true because the composite `dupScore` (using a different formula: textSim×0.5 + spatial×0.35 + temporal×0.15 × categoryFactor) exceeded 0.70. There is an inconsistency between `dupScore` (used for `isPotentialDuplicate`) and `duplicateProbability` (reported output). The `duplicateProbability` formula (`similarityScore × 0.6 + spatialFactor × 0.4`) is more conservative.

### 3.4 Entity Extraction

**Verdict: PARTIALLY VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Roads & drainage | "Pothole on Main Street near Sector 4 market..." | Locs: Sector 4 Market; Infra: drain | Locs: [Sector 4 Market, Sector 4]; Infra: [street]; Hazards: [] | **FAIL** |
| Power hazard | "Streetlight... Sparking wire..." | Locs: River Road; Infra: streetlight, wire; Hazards: sparking wire, live wire | Locs: [River Road]; Infra: [road, street, streetlight, wire]; Hazards: [sparking wire] | **FAIL** |
| Structural safety | "Crack in building wall near Central Plaza..." | Locs: Central Plaza; Infra: building wall, compound wall; Hazards: structural crack | Locs: [Central Plaza]; Infra: [building wall, compound wall]; Hazards: [structural crack] | PASS |
| Empty text | "" | Empty arrays | Empty arrays | PASS |

**Analysis:** Entity extraction uses hardcoded keyword lists (`KNOWN_LOCATIONS`, `KNOWN_INFRASTRUCTURE`, `HAZARD_TERMS`, `TEMPORAL_PATTERNS`). Partial matches occur:
- "drain" not matched because "drainage" is in the text but the stemmer reduces it differently, or "drain" alone isn't in the infrastructure list
- "live wire" not extracted as hazard (only "sparking wire" matched)
- "road" and "street" falsely matched as infrastructure (over-broad keyword lists)

**Not NER** — simple substring matching against fixed lists. No named entity recognition model.

### 3.5 Hazard Identification

**Verdict: PARTIALLY VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Live wire | "Live wire sparking on the road near school" | critical | critical | PASS |
| Gas smell | "Gas smell near the pipeline junction" | critical | **low** | **FAIL** |
| Building collapse | "Building collapse danger in old structure" | critical | critical | PASS |
| Open manhole | "Open manhole on the footpath" | high | high | PASS |
| Pothole | "Pothole on the road causing traffic" | medium | medium | PASS |

**Analysis:** "Gas smell" does not match the keyword `gas leak` in the critical keywords list. The keyword lists are exact-phrase matches, not semantic. "Gas smell" → low (no keyword match).

### 3.6 Geographic Hotspot Detection

**Verdict: VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Reports at same location | 5 reports, 2 at Sector 4 (15m apart) | ≥1 hotspot with ≥2 reports | 1 hotspot, 2 reports | PASS |
| Sparse reports | 3 reports at different locations | 0 hotspots | 0 hotspots | PASS |

**Analysis:** Grid-based spatial clustering works correctly. Uses `radiusMeters` parameter (default 500m) and `minReports` threshold (default 5 in API, 2 in test). Labels output with "limitation: Grid-based approximate clustering; not certified production geospatial analysis".

### 3.7 Incident Clustering (DBSCAN-inspired)

**Verdict: VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Test corpus (8 reports) | Mixed categories/locations | ≥1 cluster | 1 cluster found | PASS |
| Empty corpus | 0 reports | 0 clusters | 0 clusters | PASS |
| Single report | 1 report | 0 clusters (below min size) | 0 clusters | PASS |

**Analysis:** DBSCAN-inspired clustering combines spatial distance (Haversine, default 550m), temporal delta (default 48h), and semantic TF-IDF similarity (default 0.32). Related-domain cascades (e.g., Water & Drainage ↔ Roads & Traffic) expand cluster edges. Cluster output includes severity, priority, confidence, and evidence strings. **Not a production DBSCAN implementation** — custom adjacency-graph traversal.

### 3.8 Risk Scoring

**Verdict: PARTIALLY VERIFIED**

| Test | Input | Expected | Actual | Pass |
|---|---|---|---|---|
| Critical urgency (1 report) | 1 critical report | Score ≥ 70 | **Score: 45/100, P3_MEDIUM** | **FAIL** |
| High urgency (1 report) | 1 high report | Score ≥ 50 | **Score: 46/100, P3_MEDIUM** | **FAIL** |
| Low urgency (1 report) | 1 low report | Score ≥ 0 | Score: 21/100, P4_LOW | PASS |
| Multiple reports (3 reports) | Mixed urgency | Score ≥ 50 | Score: 79/100, P2_HIGH | PASS |

**Analysis:** Risk score is a weighted sum of 5 factors (Inherent Physical Hazard 30%, plus 4 other factors). A single critical report only contributes 30% × 95 ≈ 28.5 from the severity factor, with the remaining factors adding ~17 points for a total of 45. High urgency gets 30% × 75 ≈ 22.5 plus ~23 = 46. **Single-report risk scores are capped low** — high scores require multiple reports, hotspots, or affected infrastructure. The scoring is transparent and explainable (each factor has weight, score, and description), but does not reach "critical" priority for individual reports.

### 3.9 AI Agent / Recommendations

**Verdict: VERIFIED**

| Test | Query | Expected Tool | Actual Tools | Pass |
|---|---|---|---|---|
| Cluster query | "cluster incident flood drain" | Incident Clustering Tool | [Incident Clustering, Entity Extraction] | PASS |
| Trend query | "trends frequency problem" | Trend Analysis Tool | [Trend Analysis, Entity Extraction] | PASS |
| Hotspot query | "sector 4 market near area hotspot" | Geospatial Analysis Tool | [Geospatial Analysis, Entity Extraction] | PASS |
| Risk query | "risk priority hazard attention" | Risk Analysis Tool | [Risk Analysis, Entity Extraction] | PASS |
| Entity query | "extract entities from report" | Entity Extraction Tool | [Entity Extraction] | PASS |
| Empty query | "hello" | Fallback tools | [Incident Clustering, Trend Analysis] | PASS |
| Specific tool | specificTool="clustering" | Clustering only | [Incident Clustering] | PASS |

**Analysis:** Agent routes queries to tools based on keyword matching in the query string. Every query also appends Entity Extraction Tool (because `query.length > 20` triggers it). Output includes `executiveSummary`, `confidence` (fixed 0.88), `toolResults` with execution times, `recommendedActions`, and `uncertaintyDisclaimer` (RESPONSIBLE-AI notice). **No LLM** — template-based synthesis with hardcoded response patterns.

### 3.10 AI-Generated Summaries

**Verdict: VERIFIED**

| Test | Expected | Actual | Pass |
|---|---|---|---|
| Executive briefing | Non-empty summary + disclaimer | Summary generated, 0.88 confidence, RESPONSIBLE-AI disclaimer present | PASS |

**Analysis:** `toolIntelligenceReport()` synthesizes tool outputs into a narrative summary with recommended actions. Includes uncertainty disclaimer: "This intelligence brief is an algorithmic analytical interpretation synthesizing citizen observations. It does not constitute a certified field inspection or final administrative decision."

### 3.11 End-to-End Integration

**Verdict: VERIFIED**

| Step | Verified |
|---|---|
| Citizen submits report via `POST /api/reports` | ✅ `db.createReport()` called |
| AI analysis executes synchronously | ✅ `runAndStoreAIAnalysis()` runs all 5 modules |
| Results persisted | ✅ Stored in `this.analyses` Map + `.scip_database.json` |
| Analysis retrievable via `GET /api/reports/:id` | ✅ `getAIAnalysisForReport()` returns stored analysis |
| Re-analysis produces consistent results | ✅ `runAndStoreAIAnalysis()` called again returns same category/risk |
| TF-IDF corpus updated on new report | ✅ `globalVectorizer.fit()` called on every report creation |
| Audit log recorded | ✅ `AI_ANALYSIS_COMPLETED` audit event logged |

**Analysis:** Full integration verified at the module level. The HTTP route layer (`reportRoutes.ts`) calls the same `db.createReport()` method. Analysis results are included in the report submission response and retrievable later.

### 3.12 Failure Handling

**Verdict: VERIFIED**

| Scenario | Behavior | Pass |
|---|---|---|
| Empty/malformed text | Classifier returns best match with low confidence; no crash | PASS |
| Invalid coordinates | Route validation rejects before AI (400) | N/A (route-level) |
| Python AI service unavailable | `aiServiceAdapter.ts` catches fetch error, falls back to local TS engine | PASS |
| Python AI service not integrated | Service exists but is not started or wired into runtime | Documented |
| Database failure | Not tested in isolation; `createReport` try/catch returns 500 | N/A |
| Unsupported language (Hindi) | Classifier processes without error; Devanagari not stemmed/tokenized meaningfully | PASS |

**Analysis:** No silent fake successes. The classifier always returns a result (even for empty input), with confidence reflecting uncertainty. The Python service fallback is explicit — catch block falls through to local engine. No evidence of fabricated AI results.

---

## 4. Sample Inputs and Outputs

### 4.1 Classification Output (Roads & Traffic)

```
Input: "Pothole on Main Street near Sector 4 market. Large pothole causing vehicles to swerve."
Predicted: Roads & Traffic
Confidence: 0.55
Top scores: Roads & Traffic (0.040), Public Sanitation (0.012), ...
Method: TF-IDF centroid cosine similarity against 8 hand-written profiles
```

### 4.2 Duplicate Detection Output

```
Target: "Pothole on Main Street near Sector 4 market"
Candidate: "Pothole near Sector 4 market junction" (15m, 4 hours apart)
Text similarity: 0.525
Spatial factor: ~1.0 (15m)
Temporal factor: ~0.92 (4h)
Category factor: 1.0 (same category)
Composite dupScore: ~0.70 (isPotentialDuplicate: true)
Reported duplicateProbability: 0.69
```

### 4.3 Risk Scoring Output (Single Critical Report)

```
Input: 1 critical urgency report at "River Road"
Score: 45/100
Priority: P3_MEDIUM
Factors:
  - Inherent Physical Hazard: score 95, weight 0.30 → 28.5
  - [4 other factors with lower individual contributions]
Method: Weighted transparent sum, not ML
```

### 4.4 AI Analysis (Full, from `runAndStoreAIAnalysis`)

```json
{
  "reportId": "REP-2026-015",
  "categoryPredicted": "Water & Drainage",
  "categoryConfidence": 0.65,
  "keywords": ["water", "drainage", "sector", "market", "flood", "rain"],
  "entities": {
    "locations": ["Sector 4 Market"],
    "infrastructure": ["drain"],
    "hazards": [],
    "temporal": ["after rain"]
  },
  "sentiment": "negative",
  "duplicateProbability": 0.36,
  "topSimilarReports": [...],
  "possibleIncident": false,
  "severityIndicator": "high",
  "riskScore": 53,
  "evidence": ["Supervised TF-IDF classification confidence: 65%", "Stand-alone observation..."],
  "confidence": 0.65,
  "processedAt": "2026-11-13T..."
}
```

---

## 5. Performance Measurements

All AI operations execute synchronously in the Node.js event loop:

| Operation | Typical Duration | Notes |
|---|---|---|
| Classification (single report) | 0.4–5 ms | Depends on corpus size |
| Entity Extraction | < 1 ms | Simple substring matching |
| Duplicate Detection (8-report corpus) | ~2–3 ms | O(n²) over corpus |
| Incident Clustering (8-report corpus) | ~1–5 ms | O(n²) adjacency graph |
| Risk Scoring (single report) | ~1–2 ms | 5-factor weighted sum |
| Full `runAndStoreAIAnalysis` | ~2–6 ms | All modules combined |
| Model Evaluation (holdout) | Varies with corpus | 70/30 train/test split |

**No async/await** in the AI pipeline — all CPU-bound, blocking the event loop during execution. For large corpora (1000+ reports), this could cause request latency.

---

## 6. Known Limitations

1. **Not a trained model.** No neural network, no training data, no model weights, no LLM. All outputs are deterministic functions of hardcoded rules and statistical heuristics.

2. **Small corpus sensitivity.** TF-IDF IDF values depend on the current report corpus. With few reports, IDF is unstable and confidence scores are uniformly low (~0.55).

3. **English-only.** Preprocessor (stopwords, stemming) is English-specific. Hindi/Devanagari text passes through without meaningful tokenization.

4. **Keyword overlap causes misclassification.** Garbage report classified as Public Health due to "stray dogs/rodents" overlapping with Public Health terms.

5. **Risk score damping.** Single critical report scores only 45/100 (P3_MEDIUM) because severity is just 30% of the weighted sum. High-priority scores require multiple reports/hotspots.

6. **Duplicate probability inconsistency.** `isPotentialDuplicate` (uses `dupScore`) and `duplicateProbability` (uses different formula) can disagree on the same pair.

7. **Entity extraction is brittle.** Fixed keyword lists miss variants and produce false positives (e.g., "road" and "street" matched as infrastructure).

8. **Python service not integrated.** `ai_service/main.py` exists but is not started, not wired, and has no Dockerfile in docker-compose.

9. **Event loop blocking.** All AI is synchronous CPU work. Large corpora will block request handling.

10. **No uncertainty quantification beyond fixed confidence.** The agent always reports confidence 0.88 regardless of actual tool output quality.

---

## 7. Missing Features

| Feature | Status |
|---|---|
| LLM-powered summarization | NOT IMPLEMENTED |
| Trained ML classification model | NOT IMPLEMENTED |
| Named Entity Recognition (statistical/ML) | NOT IMPLEMENTED |
| Multi-language support (Hindi, regional Indian languages) | NOT IMPLEMENTED |
| Async AI processing (queue, webhook) | NOT IMPLEMENTED |
| Python AI microservice runtime integration | NOT IMPLEMENTED (service exists but not wired) |
| Model versioning / A/B testing | NOT IMPLEMENTED |
| Confidence calibration | NOT IMPLEMENTED (fixed 0.55–0.65 range, agent fixed 0.88) |
| AI feedback loop (human corrections improve model) | NOT IMPLEMENTED |

---

## 8. Recommendations for Improvement

1. **Be transparent in marketing/docs.** Describe the AI as "rule-based decision support" or "heuristic analytics pipeline," not "AI/ML" or "trained model."

2. **Fix the classification keyword overlap.** Add negative keywords or disambiguation rules (e.g., "dogs/rodents" + "garbage" → Public Sanitation, not Public Health).

3. **Improve entity extraction.** Expand keyword lists, add stemming for infrastructure terms, remove over-broad matches ("road", "street" as infrastructure).

4. **Align duplicate detection formulas.** Make `isPotentialDuplicate` and `duplicateProbability` use the same scoring formula.

5. **Calibrate risk scoring.** Consider severity-weighted scoring where a single critical report can reach P1/P2 without needing multiple reports.

6. **Add async processing.** Offload AI analysis to a background job to avoid blocking the event loop on large corpora.

7. **Integrate Python service or remove it.** Either wire `ai_service/main.py` into the runtime (with Dockerfile, docker-compose service, env var) or remove it to avoid confusion.

8. **Add language detection.** Route non-English text through appropriate preprocessing or flag for manual review.

9. **Add model evaluation dashboard.** Expose `evaluateClassifier()` holdout results (precision/recall/F1 per category) in the admin dashboard.

---

## 9. Capability Verdicts

| Capability | Verdict | Basis |
|---|---|---|
| Issue Classification | PARTIALLY VERIFIED | Executes correctly; 7/8 category tests pass; garbage misclassified as Public Health; not a trained model |
| Priority/Severity Assessment | VERIFIED | All 6 keyword-based tests pass; deterministic rule-based |
| Duplicate Detection | PARTIALLY VERIFIED | Executes correctly; same-location similar text scores 0.69 (just below threshold); `isPotentialDuplicate` vs `duplicateProbability` inconsistency |
| Entity Extraction | PARTIALLY VERIFIED | Executes correctly; keyword list misses some entities, false positives on "road"/"street"; not NER |
| Hazard Identification | PARTIALLY VERIFIED | 4/5 keyword tests pass; "gas smell" doesn't match "gas leak" keyword |
| Geographic Hotspot Detection | VERIFIED | Both tests pass; grid-based clustering works |
| Incident Clustering | VERIFIED | All 3 tests pass; DBSCAN-inspired works; empty/single corpus handled |
| Risk Scoring | PARTIALLY VERIFIED | Multi-report scores work; single critical report only reaches P3_MEDIUM (45/100); transparent but dampened |
| AI Agent / Recommendations | VERIFIED | All 7 agent tests pass; correct tool routing; template-based, no LLM |
| AI-Generated Summaries | VERIFIED | Briefing generated with uncertainty disclaimer; fixed 0.88 confidence |
| End-to-End Integration | VERIFIED | Report → AI → persisted → retrievable → re-analyze all verified |
| Failure Handling | VERIFIED | No crashes; fallback to local engine; no silent fake successes |
| Multilingual NLP — Language Detection | VERIFIED | 83/83 tests pass; Devanagari/Latin script detection, Hindi/English/Hinglish identification, mixed language detection |
| Multilingual NLP — Preprocessing | VERIFIED | Hindi Devanagari normalization, Hinglish→English mapping, stopword removal, civic term/urgency/location extraction |
| Multilingual NLP — Classification & Priority | VERIFIED | Language-aware category classification + priority prediction with explainable output; falls back to TF-IDF classifier |
| Multilingual NLP — Duplicate Detection | VERIFIED | Cross-language semantic similarity + Haversine distance + temporal scoring |
| Multilingual NLP — Model Registry | VERIFIED | scip-multilingual-classifier, scip-multilingual-duplicate-detector, scip-multilingual-entity-extractor registered |

---

## 10. Honest Overall Verdict

### 10.1 Multilingual NLP (Hindi/English/Hinglish) — Detailed

**Test file:** `scripts/ai-hindi-hinglish-test.mts` — **83/83 tests pass**

| Module | File | Capability |
|---|---|---|
| Language Detection | `src/ai/languageDetector.ts` | Devanagari vs Latin script detection; Hindi (hi), English (en), Hinglish, mixed language identification; Hinglish normalization map |
| Preprocessing | `src/ai/hindiPreprocessor.ts` | Hindi Devanagari normalization; Hinglish→English mapping; Hindi civic term/urgency/location extraction; stopword removal |
| Classification | `src/ai/multilingualClassifier.ts` | Language-aware category classification + priority prediction with explainable output; falls back to existing TF-IDF classifier |
| Duplicate Detection | `src/ai/multilingualDuplicateDetector.ts` | Cross-language semantic similarity + duplicate detection with Haversine distance and temporal scoring |
| Model Registry | `src/ai/modelRegistry.ts` | Registered scip-multilingual-classifier, scip-multilingual-duplicate-detector, scip-multilingual-entity-extractor |

**No sentence-transformers used** (memory/download constraints) — lightweight keyword/script-based heuristics only. Synthetic test data only; no real user data.

**SCIP's AI is a verified, working heuristic decision-support pipeline — not a trained machine learning system.**

All AI capabilities execute without errors, produce deterministic output, and integrate correctly with the report submission and GeoAnalytics workflows. However:

- **No capability uses a trained model.** Every output comes from hardcoded rules, keyword lists, or statistical formulas.
- **No LLM is involved.** All text generation is template-based.
- **The Python microservice is not integrated.**
- **Confidence scores are heuristic**, not calibrated probabilities.

The system is suitable as a **municipal decision-support tool** where human officers review all AI output (as stated in the uncertainty disclaimer), but it should not be marketed or relied upon as an autonomous AI system.

**Do not mark the entire AI system as "VERIFIED" as if it were ML — individual capabilities are verified for correct execution, but none are machine learning.**
