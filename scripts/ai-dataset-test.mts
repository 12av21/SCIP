// SCIP Civic Text Dataset Test Suite
// Tests dataset entries, splits, versioning, quality evaluation, and manager integration

import {
  CIVIC_TEXT_DATASET_V1,
  CIVIC_TEXT_DATASET_VERSION_1_0_0,
  CIVIC_DATASET_NAME,
  getDatasetEntries,
  getDatasetEntriesByCategory,
  getDatasetVersion
} from '../src/ai/civicDataset.js';
import { datasetManager } from '../src/ai/datasetManager.js';
import {
  DatasetSplit,
  ReportCategory
} from '../types/scip.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.log(`  FAIL: ${message}`);
  }
}

const CATEGORIES: ReportCategory[] = [
  'Water & Drainage',
  'Roads & Traffic',
  'Public Sanitation',
  'Power & Lighting',
  'Parks & Environment',
  'Structural Safety',
  'Public Health',
  'Noise & Disturbance'
];

// ------------------------------------------------------------------
// TEST 1: Dataset Entry Count & Structure
// ------------------------------------------------------------------
console.log('\n=== TEST 1: Dataset Entry Count & Structure ===');

assert(CIVIC_TEXT_DATASET_V1.length === 320, `Dataset has 320 entries (got ${CIVIC_TEXT_DATASET_V1.length})`);

const sample = CIVIC_TEXT_DATASET_V1[0];
assert(typeof sample.id === 'string' && sample.id.length > 0, 'Entry has non-empty id');
assert(typeof sample.title === 'string' && sample.title.length > 0, 'Entry has non-empty title');
assert(typeof sample.description === 'string' && sample.description.length > 0, 'Entry has non-empty description');
assert(typeof sample.text === 'string' && sample.text.length > 0, 'Entry has non-empty text');
assert(CATEGORIES.includes(sample.trueCategory), 'Entry has valid trueCategory');
assert(['low','medium','high','critical'].includes(sample.urgency), 'Entry has valid urgency');
assert(typeof sample.locationName === 'string' && sample.locationName.length > 0, 'Entry has non-empty locationName');
assert(Number.isFinite(sample.latitude), 'Entry has valid latitude');
assert(Number.isFinite(sample.longitude), 'Entry has valid longitude');
assert(['seed','synthetic','crowd','historical'].includes(sample.source), 'Entry has valid source');
assert(['train','test','validation'].includes(sample.split), 'Entry has valid split');
assert(typeof sample.createdAt === 'string', 'Entry has createdAt timestamp');

// text should combine title and description
assert(sample.text.includes(sample.title), 'Entry text includes title');
assert(sample.text.includes(sample.description), 'Entry text includes description');

// ------------------------------------------------------------------
// TEST 2: Category Distribution
// ------------------------------------------------------------------
console.log('\n=== TEST 2: Category Distribution ===');

for (const cat of CATEGORIES) {
  const count = CIVIC_TEXT_DATASET_V1.filter(e => e.trueCategory === cat).length;
  assert(count === 40, `Category '${cat}' has 40 entries (got ${count})`);
}

const version = getDatasetVersion();
assert(version.version === '1.0.0', 'Dataset version is 1.0.0');
assert(version.entryCount === 320, 'Dataset version entryCount is 320');
for (const cat of CATEGORIES) {
  assert(version.categoryDistribution[cat] === 40, `Version categoryDistribution[${cat}] === 40`);
}
assert(version.splitDistribution.train === 200, 'Version splitDistribution.train === 200');
assert(version.splitDistribution.test === 80, 'Version splitDistribution.test === 80');
assert(version.splitDistribution.validation === 40, 'Version splitDistribution.validation === 40');

// ------------------------------------------------------------------
// TEST 3: Split Accessors
// ------------------------------------------------------------------
console.log('\n=== TEST 3: Split Accessors ===');

const train = getDatasetEntries('train');
assert(train.length === 200, `Train split has 200 entries (got ${train.length})`);
assert(train.every(e => e.split === 'train'), 'All train entries have split=train');

const test = getDatasetEntries('test');
assert(test.length === 80, `Test split has 80 entries (got ${test.length})`);
assert(test.every(e => e.split === 'test'), 'All test entries have split=test');

const validation = getDatasetEntries('validation');
assert(validation.length === 40, `Validation split has 40 entries (got ${validation.length})`);
assert(validation.every(e => e.split === 'validation'), 'All validation entries have split=validation');

const all = getDatasetEntries();
assert(all.length === 320, `All entries = 320 (got ${all.length})`);

// ------------------------------------------------------------------
// TEST 4: Category Filter
// ------------------------------------------------------------------
console.log('\n=== TEST 4: Category Filter ===');

for (const cat of CATEGORIES) {
  const byCat = getDatasetEntriesByCategory(cat);
  assert(byCat.length === 40, `getDatasetEntriesByCategory('${cat}') returns 40 (got ${byCat.length})`);
  assert(byCat.every(e => e.trueCategory === cat), `All entries match category '${cat}'`);
}

// ------------------------------------------------------------------
// TEST 5: Dataset Manager Registration
// ------------------------------------------------------------------
console.log('\n=== TEST 5: Dataset Manager Registration ===');

const datasets = datasetManager.listDatasets();
assert(datasets.includes(CIVIC_DATASET_NAME), `Dataset manager registered '${CIVIC_DATASET_NAME}'`);

const retrieved = datasetManager.getDataset(CIVIC_DATASET_NAME);
assert(retrieved !== undefined, 'getDataset returns the registered dataset');
assert(retrieved!.length === 320, 'Retrieved dataset has 320 entries');

const versions = datasetManager.getVersions(CIVIC_DATASET_NAME);
assert(versions !== undefined, 'getVersions returns versions array');
assert(versions!.length >= 1, 'At least one version registered');
assert(versions![0].version === '1.0.0', 'First version is 1.0.0');

// ------------------------------------------------------------------
// TEST 6: Dataset Splits from Manager
// ------------------------------------------------------------------
console.log('\n=== TEST 6: Dataset Splits from Manager ===');

const splits = datasetManager.getDatasetSplits(CIVIC_DATASET_NAME);
assert(splits !== undefined, 'getDatasetSplits returns splits object');
assert(splits!.train.length === 200, 'Manager train split has 200 entries');
assert(splits!.test.length === 80, 'Manager test split has 80 entries');
assert(splits!.validation.length === 40, 'Manager validation split has 40 entries');

// ------------------------------------------------------------------
// TEST 7: Dataset Stats
// ------------------------------------------------------------------
console.log('\n=== TEST 7: Dataset Stats ===');

const stats = datasetManager.getDatasetStats(CIVIC_DATASET_NAME);
assert(stats !== undefined, 'getDatasetStats returns stats');
assert(stats!.entryCount === 320, 'Stats entryCount is 320');
for (const cat of CATEGORIES) {
  assert(stats!.categoryDistribution[cat] === 40, `Stats categoryDistribution[${cat}] === 40`);
}
assert(stats!.splitDistribution.train === 200, 'Stats splitDistribution.train === 200');
assert(stats!.splitDistribution.test === 80, 'Stats splitDistribution.test === 80');
assert(stats!.splitDistribution.validation === 40, 'Stats splitDistribution.validation === 40');
assert(typeof stats!.sourceDistribution.seed === 'number', 'Stats tracks seed source');
assert(typeof stats!.sourceDistribution.synthetic === 'number', 'Stats tracks synthetic source');
assert(typeof stats!.sourceDistribution.crowd === 'number', 'Stats tracks crowd source');

// ------------------------------------------------------------------
// TEST 8: Classifier Evaluation on Dataset
// ------------------------------------------------------------------
console.log('\n=== TEST 8: Classifier Evaluation on Dataset ===');

const metrics = datasetManager.evaluateDefaultDataset();
assert(metrics.datasetName === CIVIC_DATASET_NAME, 'Metrics datasetName matches');
assert(metrics.totalEntries === 80, `Metrics totalEntries is 80 (got ${metrics.totalEntries})`);
assert(metrics.overallAccuracy >= 0 && metrics.overallAccuracy <= 1, 'overallAccuracy in [0,1]');
assert(metrics.macroPrecision >= 0 && metrics.macroPrecision <= 1, 'macroPrecision in [0,1]');
assert(metrics.macroRecall >= 0 && metrics.macroRecall <= 1, 'macroRecall in [0,1]');
assert(metrics.macroF1 >= 0 && metrics.macroF1 <= 1, 'macroF1 in [0,1]');
assert(metrics.microPrecision >= 0 && metrics.microPrecision <= 1, 'microPrecision in [0,1]');
assert(metrics.microRecall >= 0 && metrics.microRecall <= 1, 'microRecall in [0,1]');
assert(metrics.microF1 >= 0 && metrics.microF1 <= 1, 'microF1 in [0,1]');
assert(metrics.perCategory.length === 8, 'perCategory has 8 entries');
assert(metrics.confusionMatrix.length > 0, 'confusionMatrix is non-empty');
assert(typeof metrics.evaluatedAt === 'string', 'evaluatedAt is a string');
assert(typeof metrics.modelVersion === 'string', 'modelVersion is a string');

// Per-category metrics have required fields
for (const pc of metrics.perCategory) {
  assert(CATEGORIES.includes(pc.category), `Per-category category is valid`);
  assert(pc.entryCount >= 0, 'entryCount >= 0');
  assert(pc.precision >= 0 && pc.precision <= 1, 'precision in [0,1]');
  assert(pc.recall >= 0 && pc.recall <= 1, 'recall in [0,1]');
  assert(pc.f1 >= 0 && pc.f1 <= 1, 'f1 in [0,1]');
  assert(pc.support >= 0, 'support >= 0');
}

// ------------------------------------------------------------------
// TEST 9: Evaluation on All Splits
// ------------------------------------------------------------------
console.log('\n=== TEST 9: Evaluation on All Splits ===');

const allMetrics = datasetManager.evaluateClassifierOnDataset(CIVIC_DATASET_NAME, '1.0.0', 'all');
assert(allMetrics.totalEntries === 320, `All-split evaluation has 320 entries (got ${allMetrics.totalEntries})`);

const trainMetrics = datasetManager.evaluateClassifierOnDataset(CIVIC_DATASET_NAME, '1.0.0', 'train');
assert(trainMetrics.totalEntries === 200, `Train evaluation has 200 entries (got ${trainMetrics.totalEntries})`);

// ------------------------------------------------------------------
// TEST 10: Labeled Examples
// ------------------------------------------------------------------
console.log('\n=== TEST 10: Labeled Examples ===');

const examples = datasetManager.getLabeledExamples(CIVIC_DATASET_NAME, 'test', 10);
assert(examples.length === 10, `getLabeledExamples returns 10 (got ${examples.length})`);
assert(examples.every(e => typeof e.id === 'string' && e.id.length > 0, 'Examples have ids'));
assert(examples.every(e => typeof e.text === 'string' && e.text.length > 0, 'Examples have text'));
assert(examples.every(e => CATEGORIES.includes(e.trueCategory), 'Examples have valid trueCategory'));

// ------------------------------------------------------------------
// TEST 11: Unknown Dataset Handling
// ------------------------------------------------------------------
console.log('\n=== TEST 11: Unknown Dataset Handling ===');

const unknown = datasetManager.getDataset('nonexistent');
assert(unknown === undefined, 'getDataset returns undefined for unknown dataset');

try {
  datasetManager.evaluateClassifierOnDataset('nonexistent', 'v1', 'test');
  assert(false, 'evaluateClassifierOnDataset should throw for unknown dataset');
} catch {
  assert(true, 'evaluateClassifierOnDataset throws for unknown dataset');
}

const unknownStats = datasetManager.getDatasetStats('nonexistent');
assert(unknownStats === undefined, 'getDatasetStats returns undefined for unknown dataset');

// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`CIVIC DATASET TEST SUMMARY`);
console.log(`========================================`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
