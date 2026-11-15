// SCIP AI Service Adapter unit tests.
// Mocks fetch to simulate Python service scenarios without a running server.
// Uses isolated in-memory logic; does not touch .scip_database.json.
// Run: npx tsx scripts/ai-service-adapter-test.mts

import { AIServiceAdapter } from '../src/ai/aiServiceAdapter.js';
import { Report, ReportCategory, UrgencyLevel } from '../src/types/scip.js';

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

// ---------- fetch mocking helpers ----------
type FetchHandler = (input: string, init: RequestInit) => Promise<Response>;
let originalFetch: typeof fetch;
let handlers: FetchHandler[] = [];
let handlerIndex = 0;

function installMockFetch(handler: FetchHandler) {
  originalFetch = globalThis.fetch as typeof fetch;
  handlers = [handler];
  handlerIndex = 0;
  globalThis.fetch = ((input: string, init?: RequestInit) => {
    const h = handlers[Math.min(handlerIndex++, handlers.length - 1)];
    return h(String(input), init || {});
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
  handlers = [];
  handlerIndex = 0;
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function neverResolvingResponse(init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    // Respect the abort signal so fetchWithTimeout's timeout can reject it.
    if (init?.signal) {
      init.signal.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    }
    // Intentionally never resolves.
  });
}

// ---------- test report ----------
const testReport: Report = {
  id: "REP-TEST",
  title: "Live wire sparking on the road",
  description: "Exposed live wire near the school gate, sparking in the rain.",
  category: "Power & Lighting" as ReportCategory,
  subcategory: "Streetlight",
  locationName: "School Gate",
  latitude: 28.6139,
  longitude: 77.2090,
  citizenId: "CIT-T",
  citizenName: "Test Citizen",
  citizenEmail: "t@test.in",
  status: "analyzed",
  urgency: "low" as UrgencyLevel,
  images: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function main() {
  // ==================================================================
  // Test 1: Feature flag disabled → local TS fallback, no fetch attempted
  // ==================================================================
  const origEnabled = process.env.AI_SERVICE_ENABLED;
  const origUrl = process.env.AI_SERVICE_URL;
  process.env.AI_SERVICE_ENABLED = "false";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  let fetchCalls = 0;
  installMockFetch(async () => {
    fetchCalls += 1;
    return jsonResponse({ predicted_category: "Power & Lighting", confidence: 0.9 });
  });
  const adapterDisabled = new AIServiceAdapter();
  check("adapter disabled: isServiceEnabled false", adapterDisabled.isServiceEnabled() === false);
  const res1 = await adapterDisabled.classify("live wire sparking");
  check("adapter disabled: fallback used (local modelVersion)", res1.modelVersion === "scip-local-ts-centroid-v1.0");
  check("adapter disabled: no fetch called", fetchCalls === 0);
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 2: Valid Python service response → used directly
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => jsonResponse({
    predicted_category: "Power & Lighting",
    confidence: 0.92,
    explanation: "Python keyword match",
    low_confidence_review: false,
    model_version: "scip-python-v1.0"
  }));
  const adapterEnabled = new AIServiceAdapter();
  check("adapter enabled: isServiceEnabled true", adapterEnabled.isServiceEnabled() === true);
  const res2 = await adapterEnabled.classify("live wire sparking");
  check("adapter enabled: uses Python response", res2.predictedCategory === "Power & Lighting");
  check("adapter enabled: Python confidence", res2.confidence === 0.92);
  check("adapter enabled: Python modelVersion", res2.modelVersion === "scip-python-v1.0");
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 3: Python service unavailable (fetch throws) → TS fallback
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => {
    throw new Error("ECONNREFUSED");
  });
  const adapterDown = new AIServiceAdapter();
  const res3 = await adapterDown.classify("live wire sparking");
  check("adapter down: fallback used", res3.modelVersion === "scip-local-ts-centroid-v1.0");
  check("adapter down: still returns valid category", typeof res3.predictedCategory === "string");
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 4: HTTP 500 from Python → TS fallback
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => jsonResponse({ detail: "Internal server error" }, 500));
  const adapter500 = new AIServiceAdapter();
  const res4 = await adapter500.classify("live wire sparking");
  check("HTTP 500: fallback used", res4.modelVersion === "scip-local-ts-centroid-v1.0");
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 5: Invalid JSON response → TS fallback
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => new Response("not json {{", { status: 200, headers: { "content-type": "application/json" } }));
  const adapterBadJson = new AIServiceAdapter();
  const res5 = await adapterBadJson.classify("live wire sparking");
  check("invalid JSON: fallback used", res5.modelVersion === "scip-local-ts-centroid-v1.0");
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 6: Connection timeout → TS fallback (no hang)
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  process.env.AI_SERVICE_TIMEOUT_MS = "50";
  installMockFetch(async (_input, init) => neverResolvingResponse(init));
  const adapterTimeout = new AIServiceAdapter();
  const start = Date.now();
  const res6 = await adapterTimeout.classify("live wire sparking");
  const elapsed = Date.now() - start;
  check("timeout: fallback used (not hung)", res6.modelVersion === "scip-local-ts-centroid-v1.0");
  check("timeout: responded quickly", elapsed < 5000);
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";
  process.env.AI_SERVICE_TIMEOUT_MS = "5000";

  // ==================================================================
  // Test 7: healthCheck — healthy → true
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => jsonResponse({ status: "healthy", service: "scip-ai", version: "1.0.0" }));
  const adapterHealth = new AIServiceAdapter();
  check("healthCheck healthy: true", await adapterHealth.healthCheck() === true);
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 8: healthCheck — disabled → false (no fetch)
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "false";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  let healthFetchCalls = 0;
  installMockFetch(async () => { healthFetchCalls += 1; return jsonResponse({ status: "healthy" }); });
  const adapterHealthDisabled = new AIServiceAdapter();
  check("healthCheck disabled: false", await adapterHealthDisabled.healthCheck() === false);
  check("healthCheck disabled: no fetch", healthFetchCalls === 0);
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 9: checkDuplicates — Python valid response → normalized canonical shape
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => jsonResponse({
    top_similar: [{ id: "R2", similarity_score: 0.91, distance_meters: 40, common_terms: ["pothole"] }],
    duplicate_probability: 0.85,
    explanation: "Python duplicate check"
  }));
  const adapterDup = new AIServiceAdapter();
  const dupRes = await adapterDup.checkDuplicates(testReport, [testReport, { ...testReport, id: "R2" }]);
  check("checkDuplicates: canonical duplicateProbability", dupRes.duplicateProbability === 0.85);
  check("checkDuplicates: canonical topSimilar normalized", dupRes.topSimilar.length === 1 && dupRes.topSimilar[0].reportId === "R2" && dupRes.topSimilar[0].similarityScore === 0.91);
  check("checkDuplicates: canonical evidence", Array.isArray(dupRes.evidence) && dupRes.evidence.includes("Python duplicate check"));
  check("checkDuplicates: highestMatch set", dupRes.highestMatch?.reportId === "R2");
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 10: checkDuplicates — Python down → local fallback
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  installMockFetch(async () => { throw new Error("down"); });
  const adapterDupDown = new AIServiceAdapter();
  const dupRes2 = await adapterDupDown.checkDuplicates(testReport, [testReport]);
  check("checkDuplicates down: local fallback has topSimilar", Array.isArray(dupRes2.topSimilar));
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 11: No sensitive data logged (report text not in console output)
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  const logLines: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => { logLines.push(args.join(" ")); };
  installMockFetch(async () => jsonResponse({ predicted_category: "Power & Lighting", confidence: 0.9 }));
  const adapterNoLog = new AIServiceAdapter();
  await adapterNoLog.classify(testReport.description);
  console.log = origLog;
  restoreFetch();
  const allLogs = logLines.join(" ");
  check("no report text logged", !allLogs.includes(testReport.description));
  check("no citizen email logged", !allLogs.includes(testReport.citizenEmail));
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";

  // ==================================================================
  // Test 12: getConfig returns non-sensitive config
  // ==================================================================
  process.env.AI_SERVICE_ENABLED = "true";
  process.env.AI_SERVICE_URL = "http://localhost:8000";
  process.env.AI_SERVICE_TIMEOUT_MS = "3000";
  const adapterCfg = new AIServiceAdapter();
  const cfg = adapterCfg.getConfig();
  check("getConfig enabled", cfg.enabled === true);
  check("getConfig baseUrl", cfg.baseUrl === "http://localhost:8000");
  check("getConfig timeoutMs", cfg.timeoutMs === 3000);
  restoreFetch();
  process.env.AI_SERVICE_ENABLED = origEnabled ?? "";
  process.env.AI_SERVICE_URL = origUrl ?? "";
  process.env.AI_SERVICE_TIMEOUT_MS = "5000";

  // ==================================================================
  // Summary
  // ==================================================================
  console.log(`\nAdapter tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
