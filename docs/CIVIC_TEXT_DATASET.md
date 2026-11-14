# SCIP Civic Text Dataset

**Dataset Name:** `scip-civic-text-dataset`  
**Version:** 1.0.0  
**Phase:** 3 — Civic Text Dataset  
**Location:** `src/ai/civicDataset.ts`  
**Manager:** `src/ai/datasetManager.ts`

---

## Overview

The SCIP Civic Text Dataset is a labeled municipal report dataset for training, evaluation, and benchmarking of SCIP AI models across 8 report categories. All entries are synthetic/representative examples — **no real PII is included**.

The dataset supports supervised training of the TF-IDF centroid classifier and provides ground-truth labels for holdout evaluation, confusion matrix computation, and per-category precision/recall/F1 reporting.

---

## Dataset Structure

### Entry Schema (`CivicDatasetEntry`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique entry ID (e.g. `CIVIC-WaterDrainage-0001`) |
| `title` | `string` | Report title |
| `description` | `string` | Report description |
| `text` | `string` | Combined title + description (model input) |
| `trueCategory` | `ReportCategory` | Ground-truth category label |
| `urgency` | `UrgencyLevel` | low \| medium \| high \| critical |
| `locationName` | `string` | Human-readable location |
| `latitude` / `longitude` | `number` | Geographic coordinates |
| `source` | `'seed' \| 'synthetic' \| 'crowd' \| 'historical'` | Data provenance |
| `split` | `DatasetSplit` | train \| test \| validation |
| `stateId` / `districtId` / `localityId` | `string?` | India admin hierarchy references |
| `pinCode` | `string?` | Six-digit Indian PIN code |
| `createdAt` | `string` | ISO-8601 timestamp |

### Category Distribution (8 categories)

| Category | Train | Test | Validation | Total |
|----------|-------|------|------------|-------|
| Water & Drainage | 25 | 10 | 5 | 40 |
| Roads & Traffic | 25 | 10 | 5 | 40 |
| Public Sanitation | 25 | 10 | 5 | 40 |
| Power & Lighting | 25 | 10 | 5 | 40 |
| Parks & Environment | 25 | 10 | 5 | 40 |
| Structural Safety | 25 | 10 | 5 | 40 |
| Public Health | 25 | 10 | 5 | 40 |
| Noise & Disturbance | 25 | 10 | 5 | 40 |
| **Total** | **200** | **80** | **40** | **320** |

Class-balanced by design: 40 entries per category, 200 train / 80 test / 40 validation.

---

## Versioning (`DatasetVersion`)

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Semver (e.g. `1.0.0`) |
| `entryCount` | `number` | Total entries |
| `categoryDistribution` | `Record<ReportCategory, number>` | Count per category |
| `splitDistribution` | `Record<DatasetSplit, number>` | Count per split |
| `createdAt` | `string` | ISO-8601 timestamp |
| `checksum` | `string?` | Dataset integrity hash |
| `notes` | `string?` | Version notes |

Current version: `1.0.0` — 320 entries, 8 categories, 3 splits.

---

## Quality Evaluation (`DatasetManager`)

The `DatasetManager` (`src/ai/datasetManager.ts`) provides:

### `evaluateClassifierOnDataset(datasetName, modelVersion, split)`
Runs the TF-IDF classifier against the labeled dataset and computes:
- Per-category precision, recall, F1, support
- Macro and micro precision/recall/F1
- Overall accuracy
- Confusion matrix (actual × predicted)
- Records results in the model registry (`scip-classifier` performance)

### `evaluateDefaultDataset()`
Convenience method — evaluates on `scip-civic-text-dataset` test split.

### `getLabeledExamples(datasetName, split, limit)`
Returns labeled examples with `trueCategory` for display/export.

### `getDatasetStats(datasetName)`
Returns entry count, category/split/source distributions.

---

## Integration with Model Registry

Dataset evaluation automatically records performance in the model registry:

- **Model:** `scip-classifier`
- **Task:** `classification`
- **Framework:** `tfidf-ts`
- **Metrics:** accuracy, precision, recall, f1Score, sampleCount, perCategoryMetrics

This allows the model registry's `selectModel()` to rank models by observed F1 on the civic dataset.

---

## API Endpoint

`GET /api/intelligence/dataset-quality` (requires `analytics.read` permission)

Returns dataset quality metrics computed from the database's seed reports (holdout validation). The civic dataset evaluation is recorded in the model registry and accessible via `datasetManager.evaluateDefaultDataset()`.

---

## Usage Example

```typescript
import { datasetManager } from './ai/datasetManager.js';
import { CIVIC_TEXT_DATASET_V1, getDatasetEntries } from './ai/civicDataset.js';

// Get all entries
const all = getDatasetEntries();

// Get test split only
const test = getDatasetEntries('test');

// Evaluate classifier on test split
const metrics = datasetManager.evaluateDefaultDataset();
console.log(`Accuracy: ${(metrics.overallAccuracy * 100).toFixed(1)}%`);
console.log(`Macro F1: ${metrics.macroF1.toFixed(3)}`);

// Get dataset stats
const stats = datasetManager.getDatasetStats('scip-civic-text-dataset');
console.log(`Entries: ${stats.entryCount}`);
```

---

## Limitations

- All entries are synthetic — not real municipal reports
- Categories are assigned by template, not by human annotators
- Geographic coordinates are near Delhi NCR / major Indian cities with small random jitter
- No multilingual entries (English only)
- Dataset size (320 entries) is suitable for development and prototyping, not production certification

---

## Files

| File | Purpose |
|------|---------|
| `src/ai/civicDataset.ts` | Dataset entries, version, accessor functions |
| `src/ai/datasetManager.ts` | Dataset registration, quality evaluation, model registry integration |
| `src/types/scip.ts` | Dataset type definitions (`CivicDatasetEntry`, `DatasetVersion`, `DatasetQualityMetrics`, `LabeledExample`, `DatasetSplit`) |
| `src/database/scipDatabase.ts` | Wired `evaluateClassifier` to record dataset metrics in model registry |
| `docs/CIVIC_TEXT_DATASET.md` | This document |
