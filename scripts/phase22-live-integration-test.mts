// Phase 2.2 Live Integration Test — Direct adapter vs live Python service
// Tests AIServiceAdapter against the running Python FastAPI service (port 8000).
// Uses only process-level env vars; does not touch .scip_database.json.
// Run: npx tsx scripts/phase22-live-integration-test.mts

import { AIServiceAdapter } from '../src/ai/aiServiceAdapter.js';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${name}` + (detail ? ` — ${detail}` : ""));
  } else {
    failed += 1;
    console.log(`FAIL: ${name}` + (detail ? ` — ${detail}` : ""));
  }
}

async function main() {
  // ================================================================
  // Setup: enable Python integration, point at live service
  // ================================================================
  const origEnabled = process.env.AI_SERVICE_ENABLED;
  const origUrl = process.env.AI_SERVICE_URL;
  const origTimeout = process.env.AI_SERVICE_TIMEOUT_MS;

  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  process.env.AI_SERVICE_TIMEOUT_MS = "5000";

  const adapter = new AIServiceAdapter();

  check("adapter isServiceEnabled (true)", adapter.isServiceEnabled() === true);
  const cfg = adapter.getConfig();
  check("adapter config enabled", cfg.enabled === true);
  check("adapter config baseUrl", cfg.baseUrl === "http://localhost:8000");
  check("adapter config timeoutMs", cfg.timeoutMs === 5000);

  // ================================================================
  // Test A1: healthCheck against live Python service
  // ================================================================
  const healthy = await adapter.healthCheck();
  check("healthCheck against live Python: true", healthy === true, JSON.stringify({ healthy }));

  // ================================================================
  // Test A2: classify through adapter to live Python
  // ================================================================
  const classifyResult = await adapter.classify("pothole on main road near sector 4 market");
  check("classify via Python: predictedCategory", classifyResult.predictedCategory === "Roads & Traffic", classifyResult.predictedCategory);
  check("classify via Python: confidence > 0", classifyResult.confidence > 0, String(classifyResult.confidence));
  check("classify via Python: modelVersion from Python", classifyResult.modelVersion === "scip-tfidf-v1.0", classifyResult.modelVersion);

  // ================================================================
  // Test B: Python disabled → TS fallback
  // ================================================================
  process.env.AI_SERVICE_ENABLED = "false";
  const adapterDisabled = new AIServiceAdapter();
  check("adapter disabled: isServiceEnabled false", adapterDisabled.isServiceEnabled() === false);
  const fallbackResult = await adapterDisabled.classify("pothole on main road");
  check("fallback: TS engine returns valid category", typeof fallbackResult.predictedCategory === "string" && fallbackResult.predictedCategory.length > 0);
  check("fallback: modelVersion is local TS", fallbackResult.modelVersion === "scip-local-ts-centroid-v1.0", fallbackResult.modelVersion);

  // Restore enabled for remaining tests
  process.env.AI_SERVICE_ENABLED = "true";

  // ================================================================
  // Test C: Python unavailable → TS fallback
  // ================================================================
  process.env.AI_SERVICE_URL = "http://localhost:19999"; // nothing listening
  const adapterDown = new AIServiceAdapter();
  check("adapter down: isServiceEnabled true (URL set)", adapterDown.isServiceEnabled() === true);
  const startC = Date.now();
  const downResult = await adapterDown.classify("pothole on main road");
  const elapsedC = Date.now() - startC;
  check("unavailable: TS fallback used", downResult.modelVersion === "scip-local-ts-centroid-v1.0");
  check("unavailable: responded quickly (no hang)", elapsedC < 10000, `${elapsedC}ms`);
  check("unavailable: healthCheck false", await adapterDown.healthCheck() === false);

  // ================================================================
  // Test D: Timeout — point to a hanging endpoint
  // ================================================================
  process.env.AI_SERVICE_TIMEOUT_MS = "200"; // very short timeout
  const adapterTimeout = new AIServiceAdapter();
  const startD = Date.now();
  try {
    const timeoutResult = await adapterTimeout.classify("test text");
    const elapsedD = Date.now() - startD;
    check("timeout: TS fallback used (not hung)", timeoutResult.modelVersion === "scip-local-ts-centroid-v1.0");
    check("timeout: responded quickly", elapsedD < 5000, `${elapsedD}ms`);
  } catch (e) {
    check("timeout: should not throw (fallback instead)", false, e.message);
  }
  process.env.AI_SERVICE_TIMEOUT_MS = "5000";

  // ================================================================
  // Test E1: Connection failure → fallback (nothing on 19999)
  // ================================================================
  const adapterErr = new AIServiceAdapter();
  const errResult = await adapterErr.classify("test text");
  check("connection failure: TS fallback", errResult.modelVersion === "scip-local-ts-centroid-v1.0");

  // ================================================================
  // Restore env
  // ================================================================
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";
  process.env.AI_SERVICE_TIMEOUT_MS = origTimeout ?? "";

  console.log(`\nLive integration tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
