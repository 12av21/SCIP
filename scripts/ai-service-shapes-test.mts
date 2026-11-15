// SCIP - Python AI Service Integration Shapes Test (R3)
// Offline: mocks global fetch. No real Python service, no network.
import { AIServiceAdapter } from '../src/ai/aiServiceAdapter.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

process.env.NODE_ENV = 'test';

function mockFetch(handler: (url: string, body: any) => any) {
  (globalThis as any).fetch = async (url: string, init: any) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    const payload = handler(String(url), body);
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

const now = new Date().toISOString();
const rep = (over: any) => ({
  id: 'R1', title: 'Pothole', description: 'big pothole', category: 'Roads & Traffic',
  locationName: 'Loc', latitude: 28.6, longitude: 77.2, urgency: 'medium',
  createdAt: now, updatedAt: now, ...over
}) as any;

// 1. checkDuplicates returns the canonical shape from a snake_case Python response.
{
  process.env.AI_SERVICE_ENABLED = 'true';
  process.env.AI_SERVICE_URL = 'http://test.local';
  const adapter = new AIServiceAdapter();
  mockFetch((url) => {
    if (url.endsWith('/duplicate-check')) {
      return {
        top_similar: [{ id: 'R2', similarity_score: 0.91, distance_meters: 40, common_terms: ['pothole', 'road'] }],
        duplicate_probability: 0.91,
        explanation: 'matched one candidate'
      };
    }
    throw new Error('unexpected url ' + url);
  });
  const res = await adapter.checkDuplicates(rep({ id: 'R1' }), [rep({ id: 'R1' }), rep({ id: 'R2', title: 'Pothole 2' })]);
  ok('duplicate: canonical topSimilar', res.topSimilar.length === 1 && res.topSimilar[0].reportId === 'R2');
  ok('duplicate: canonical similarityScore', res.topSimilar[0].similarityScore === 0.91);
  ok('duplicate: canonical duplicateProbability', res.duplicateProbability === 0.91);
  ok('duplicate: canonical evidence', Array.isArray(res.evidence) && res.evidence.includes('matched one candidate'));
  ok('duplicate: highestMatch set', res.highestMatch?.reportId === 'R2');
}

// 2. prioritize maps Python P1..P4 to the SCIP enum.
{
  process.env.AI_SERVICE_ENABLED = 'true';
  const adapter = new AIServiceAdapter();
  mockFetch((url) => {
    if (url.endsWith('/prioritize')) return { score: 95, priority: 'P1', explanation: 'critical hazard' };
    throw new Error('unexpected url ' + url);
  });
  const p = await adapter.prioritize({ severity: 'critical' });
  ok('prioritize: P1 -> P1_CRITICAL', p.priority === 'P1_CRITICAL', p.priority);
  ok('prioritize: score preserved', p.score === 95);

  mockFetch((url) => (url.endsWith('/prioritize') ? { score: 30, priority: 'P4' } : {}));
  const p4 = await adapter.prioritize({ severity: 'low' });
  ok('prioritize: P4 -> P4_LOW', p4.priority === 'P4_LOW', p4.priority);
}

// 3. analyzeImage returns null when the service is disabled (no fetch attempted).
{
  delete process.env.AI_SERVICE_ENABLED;
  const adapter = new AIServiceAdapter();
  let called = false;
  (globalThis as any).fetch = async () => { called = true; return new Response('{}', { status: 200 }); };
  const img = await adapter.analyzeImage({ imageId: 'img1', imageBase64: 'AAAA', mimeType: 'image/png' });
  ok('analyzeImage: null when disabled', img === null);
  ok('analyzeImage: no fetch when disabled', called === false);
}

// 4. analyzeImage returns parsed data when enabled and the endpoint responds.
{
  process.env.AI_SERVICE_ENABLED = 'true';
  process.env.AI_SERVICE_URL = 'http://test.local';
  const adapter = new AIServiceAdapter();
  mockFetch((url) => {
    if (url.endsWith('/analyze-image')) return { ocr_text: 'hello', detected_objects: ['pothole'], scene_labels: ['road'], has_text: true, has_damage: true, confidence: 0.8, model_version: 'py-vision' };
    throw new Error('unexpected url ' + url);
  });
  const img = await adapter.analyzeImage({ imageId: 'img1', imageBase64: 'AAAA', mimeType: 'image/png' });
  ok('analyzeImage: returns data when enabled', img?.ocr_text === 'hello' && img?.model_version === 'py-vision');
}

// 5. checkDuplicates falls back to the local canonical shape when disabled.
{
  delete process.env.AI_SERVICE_ENABLED;
  const adapter = new AIServiceAdapter();
  let called = false;
  (globalThis as any).fetch = async () => { called = true; return new Response('{}', { status: 200 }); };
  const res = await adapter.checkDuplicates(rep({ id: 'R1' }), [rep({ id: 'R1' }), rep({ id: 'R2', title: 'Pothole two', description: 'big pothole' })]);
  ok('duplicate: local shape when disabled', Array.isArray(res.topSimilar) && typeof res.duplicateProbability === 'number' && Array.isArray(res.evidence));
  ok('duplicate: no fetch when disabled', called === false);
}

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);