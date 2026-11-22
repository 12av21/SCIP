// SCIP - Live Node→Python AI adapter integration (requires Python service on AI_SERVICE_URL)
process.env.NODE_ENV = 'test';
process.env.AI_SERVICE_ENABLED = 'true';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:8011';

const { AIServiceAdapter } = await import('../src/ai/aiServiceAdapter.js');
const adapter = new AIServiceAdapter();

const res = await adapter.classify('Large pothole on the main road causing accidents', 'Roads & Traffic');
const fromPython = res.modelVersion === 'scip-tfidf-v1.0';
console.log('CLASSIFY_RESULT=' + JSON.stringify(res));
console.log('FROM_PYTHON=' + fromPython);

const dup = await adapter.checkDuplicates(
  { id: 'R1', title: 'Pothole on main road', description: 'Large pothole', category: 'Roads & Traffic', latitude: 28.6, longitude: 77.2, locationName: 'Main Road' } as any,
  [{ id: 'R2', title: 'Pothole on main road', description: 'Large pothole', category: 'Roads & Traffic', latitude: 28.6, longitude: 77.2, locationName: 'Main Road' } as any]
);
console.log('DUP_PROB=' + dup.duplicateProbability);

process.exit(fromPython ? 0 : 1);