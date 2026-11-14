// SCIP AI Model Registry Test Suite
// Tests model registration, versioning, performance tracking, active model selection, and stats

import { modelRegistry } from '../src/ai/modelRegistry.js';
import {
  ModelFramework,
  ModelStatus,
  ModelTask,
  ModelVersion,
  ModelRegistryEntry
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

// Use the global model registry singleton (has built-in models pre-registered)
const registry = modelRegistry;

// ------------------------------------------------------------------
// TEST 1: Model Registration
// ------------------------------------------------------------------
console.log('\n=== TEST 1: Model Registration ===');

const entry = registry.registerModel({
  name: 'test-classifier',
  displayName: 'Test Classifier',
  description: 'A test model for registry verification',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'classification',
  status: 'production',
  isDefault: true,
  createdBy: 'test-suite'
});

assert(entry.name === 'test-classifier', 'registerModel returns entry with correct name');
assert(entry.displayName === 'Test Classifier', 'registerModel returns entry with correct displayName');
assert(entry.versions.length === 1, 'registerModel creates one version');
assert(entry.versions[0].version === '1.0.0', 'registerModel version is 1.0.0');
assert(entry.versions[0].status === 'production', 'registerModel status is production');
assert(entry.activeVersion === '1.0.0', 'registerModel sets active version');
assert(entry.defaultVersion === '1.0.0', 'registerModel sets default version');

// Register second version
registry.registerModel({
  name: 'test-classifier',
  displayName: 'Test Classifier',
  description: 'Updated test model',
  version: '2.0.0',
  framework: 'sentence-transformers',
  task: 'classification',
  modelId: 'all-MiniLM-L6-v2',
  status: 'staging',
  isDefault: false,
  createdBy: 'test-suite'
});

const entry2 = registry.getModel('test-classifier');
assert(entry2!.versions.length === 2, 'Second version registered');
assert(entry2!.versions.some(v => v.version === '2.0.0' && v.framework === 'sentence-transformers'), 'Second version has correct framework');

// Duplicate version should throw
try {
  registry.registerModel({
    name: 'test-classifier',
    displayName: 'Test Classifier',
    description: 'Duplicate',
    version: '1.0.0',
    framework: 'tfidf-ts',
    task: 'classification',
    createdBy: 'test-suite'
  });
  assert(false, 'Duplicate version should throw');
} catch {
  assert(true, 'Duplicate version throws error');
}

// ------------------------------------------------------------------
// TEST 2: Model Retrieval
// ------------------------------------------------------------------
console.log('\n=== TEST 2: Model Retrieval ===');

assert(registry.getModel('test-classifier') !== undefined, 'getModel finds registered model');
assert(registry.getModel('nonexistent') === undefined, 'getModel returns undefined for unknown model');

const v1 = registry.getVersion('test-classifier', '1.0.0');
assert(v1 !== undefined, 'getVersion finds version 1.0.0');
assert(v1!.framework === 'tfidf-ts', 'getVersion returns correct framework');

const v2 = registry.getVersion('test-classifier', '2.0.0');
assert(v2 !== undefined, 'getVersion finds version 2.0.0');
assert(v2!.modelId === 'all-MiniLM-L6-v2', 'getVersion returns modelId');

const all = registry.getAllModels();
assert(all.length >= 5, `getAllModels returns at least 5 models (got ${all.length})`);

// ------------------------------------------------------------------
// TEST 3: Active/Default Model Selection
// ------------------------------------------------------------------
console.log('\n=== TEST 3: Active/Default Model Selection ===');

const active = registry.getActiveModel('test-classifier');
assert(active !== undefined, 'getActiveModel returns active version');
assert(active!.version === '1.0.0', 'Active version is 1.0.0 (production)');

const defaultModel = registry.getDefaultModel('test-classifier');
assert(defaultModel !== undefined, 'getDefaultModel returns default version');
assert(defaultModel!.version === '1.0.0', 'Default version is 1.0.0');

// Change active version
registry.setActiveModel('test-classifier', '2.0.0');
const active2 = registry.getActiveModel('test-classifier');
assert(active2!.version === '2.0.0', 'setActiveModel changes active version');

// Change default version
registry.setDefaultModel('test-classifier', '2.0.0');
const default2 = registry.getDefaultModel('test-classifier');
assert(default2!.version === '2.0.0', 'setDefaultModel changes default version');

// Invalid version should throw
try {
  registry.setActiveModel('test-classifier', '9.9.9');
  assert(false, 'setActiveModel with invalid version should throw');
} catch {
  assert(true, 'setActiveModel with invalid version throws');
}

try {
  registry.setActiveModel('nonexistent', '1.0.0');
  assert(false, 'setActiveModel with unknown model should throw');
} catch {
  assert(true, 'setActiveModel with unknown model throws');
}

// ------------------------------------------------------------------
// TEST 4: Performance Recording
// ------------------------------------------------------------------
console.log('\n=== TEST 4: Performance Recording ===');

registry.recordPerformance({
  modelName: 'test-classifier',
  version: '1.0.0',
  performance: {
    task: 'classification',
    accuracy: 0.92,
    precision: 0.89,
    recall: 0.91,
    f1Score: 0.90,
    sampleCount: 100,
    evaluatedAt: new Date().toISOString(),
    inferenceLatencyMs: 15,
    notes: 'Test performance record'
  }
});

const v1after = registry.getVersion('test-classifier', '1.0.0');
assert(v1after!.performance.length === 1, 'Performance recorded for version 1.0.0');
assert(v1after!.performance[0].f1Score === 0.90, 'Performance f1Score is 0.90');
assert(v1after!.performance[0].sampleCount === 100, 'Performance sampleCount is 100');

// ------------------------------------------------------------------
// TEST 5: Promotion/Demotion
// ------------------------------------------------------------------
console.log('\n=== TEST 5: Promotion/Demotion ===');

registry.promote({ modelName: 'test-classifier', version: '2.0.0', status: 'production' });

const v2after = registry.getVersion('test-classifier', '2.0.0');
assert(v2after!.status === 'production', 'Version 2.0.0 promoted to production');

// Version 1.0.0 should be demoted from production to staging
const v1after2 = registry.getVersion('test-classifier', '1.0.0');
assert(v1after2!.status === 'staging', 'Previous production version demoted to staging');

const active3 = registry.getActiveModel('test-classifier');
assert(active3!.version === '2.0.0', 'Active version updated to promoted version');

// ------------------------------------------------------------------
// TEST 6: Model Selection
// ------------------------------------------------------------------
console.log('\n=== TEST 6: Model Selection ===');

// Register a candidate model with higher F1
registry.registerModel({
  name: 'test-classifier',
  displayName: 'Test Classifier',
  description: 'Candidate model',
  version: '3.0.0',
  framework: 'sentence-transformers',
  task: 'classification',
  status: 'candidate',
  createdBy: 'test-suite'
});

registry.recordPerformance({
  modelName: 'test-classifier',
  version: '3.0.0',
  performance: {
    task: 'classification',
    f1Score: 0.99,
    sampleCount: 50,
    evaluatedAt: new Date().toISOString()
  }
});

// Select classification model - should prefer production over candidate despite lower F1
const selected = registry.selectModel({ task: 'classification', preferProduction: true });
assert(selected !== null, 'selectModel returns a selection');
assert(selected!.framework === 'sentence-transformers' || selected!.framework === 'tfidf-ts', 'Selected model has valid framework');
assert(selected!.version === '2.0.0', 'Production version selected over candidate');

// Select without production preference - should include candidates but still rank production higher
    const selected2 = registry.selectModel({ task: 'classification', preferProduction: false });
    assert(selected2 !== null, 'selectModel without production preference returns selection');
    assert(selected2!.version === '2.0.0', 'Production version ranked over candidate even with preferProduction=false');

// Select non-existent task
const selected3 = registry.selectModel({ task: 'embedding', preferProduction: true });
assert(selected3 === null, 'selectModel returns null for task with no models');

// ------------------------------------------------------------------
// TEST 7: Registry Stats
// ------------------------------------------------------------------
console.log('\n=== TEST 7: Registry Stats ===');

const stats = registry.getStats();
assert(stats.totalModels >= 5, `Stats totalModels >= 5 (got ${stats.totalModels})`);
assert(stats.productionModels >= 1, `Stats productionModels >= 1 (got ${stats.productionModels})`);
assert(stats.byFramework['tfidf-ts'] >= 1, 'Stats has tfidf-ts models');
assert(typeof stats.byFramework['sentence-transformers'] === 'number', 'Stats tracks sentence-transformers');

// ------------------------------------------------------------------
// TEST 8: Built-in Models
// ------------------------------------------------------------------
console.log('\n=== TEST 8: Built-in Models ===');

const scipClassifier = registry.getModel('scip-classifier');
assert(scipClassifier !== undefined, 'Built-in scip-classifier exists');
assert(scipClassifier!.activeVersion === '1.0.0', 'Built-in classifier active version is 1.0.0');

const scipDuplicate = registry.getModel('scip-duplicate-detector');
assert(scipDuplicate !== undefined, 'Built-in scip-duplicate-detector exists');

const scipRisk = registry.getModel('scip-risk-scorer');
assert(scipRisk !== undefined, 'Built-in scip-risk-scorer exists');

const scipEntity = registry.getModel('scip-entity-extractor');
assert(scipEntity !== undefined, 'Built-in scip-entity-extractor exists');

// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`MODEL REGISTRY TEST SUMMARY`);
console.log(`========================================`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
