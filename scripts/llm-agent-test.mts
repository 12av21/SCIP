// SCIP - LLM Agent Layer Test (R2)
// Offline: uses a fake LLM client. No real API calls, no keys, no network.
import { runLLMAgent, getLLMAgentConfig, isLLMAgentEnabled, LLM_TOOL_DECLARATIONS } from '../src/ai/llmAgent.js';
import type { LLMClient } from '../src/ai/llmAgent.js';
import { SCIPIntelligenceAgent } from '../src/ai/scipAgent.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

function makeClient(responses: any[]): LLMClient & { calls: any[] } {
  const calls: any[] = [];
  let i = 0;
  return {
    calls,
    models: {
      async generateContent(params: any) {
        calls.push(params);
        const r = responses[Math.min(i, responses.length - 1)];
        i++;
        return r;
      }
    }
  };
}

const baseConfig = { apiKey: 'test-key', model: 'gemini-2.0-flash', timeoutMs: 2000, maxIterations: 6, maxToolOutputChars: 4000 };

// 1. Config gating.
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;
delete process.env.LLM_AGENT_ENABLED;
ok('config null without key', getLLMAgentConfig() === null);
ok('isLLMAgentEnabled false without key', isLLMAgentEnabled() === false);
process.env.GEMINI_API_KEY = 'test-key';
ok('config present with key', getLLMAgentConfig()?.model === 'gemini-2.0-flash');
ok('isLLMAgentEnabled true with key', isLLMAgentEnabled() === true);
process.env.LLM_AGENT_ENABLED = 'false';
ok('explicit disable overrides key', isLLMAgentEnabled() === false);
delete process.env.LLM_AGENT_ENABLED;
delete process.env.GEMINI_API_KEY;

// 2. Tool declarations sanity.
ok('tool declarations present', LLM_TOOL_DECLARATIONS.length === 9);
ok('every declaration has a name', LLM_TOOL_DECLARATIONS.every(d => typeof d.name === 'string' && d.name.length > 0));

// 3. Single tool call then JSON answer.
{
  const executed: Array<{ name: string; args: any }> = [];
  const client = makeClient([
    { functionCalls: [{ name: 'incident_clustering', args: {} }] },
    { text: '{"executiveSummary":"Detected 2 clusters.","recommendedActions":["Dispatch a field team."]}' }
  ]);
  const res = await runLLMAgent({
    query: 'show incidents',
    config: baseConfig,
    client,
    executeTool: async (name, args) => {
      executed.push({ name, args });
      return { toolName: name, status: 'success', executionTimeMs: 1, summary: '2 clusters', data: { n: 2 } };
    }
  });
  ok('llm executed the requested tool', executed.length === 1 && executed[0].name === 'incident_clustering');
  ok('llm captured tool result', res.toolResults.length === 1 && res.toolResults[0].status === 'success');
  ok('llm parsed executiveSummary', res.summary === 'Detected 2 clusters.');
  ok('llm parsed recommendedActions', res.recommendedActions.length === 1 && res.recommendedActions[0].includes('Dispatch'));
  ok('llm reports model', res.model === 'gemini-2.0-flash');
  ok('llm reports iterations', res.iterations === 2);
  ok('llm sent tools in request', Array.isArray(client.calls[0]?.config?.tools?.[0]?.functionDeclarations));
}

// 4. Plain-text (non-JSON) final answer.
{
  const client = makeClient([{ text: 'There are 3 open potholes in Sector 4.' }]);
  const res = await runLLMAgent({
    query: 'potholes',
    config: baseConfig,
    client,
    executeTool: async () => ({ toolName: 'x', status: 'success', executionTimeMs: 0, summary: 'ok', data: null })
  });
  ok('llm plain text used as summary', res.summary === 'There are 3 open potholes in Sector 4.');
  ok('llm plain text has no actions', res.recommendedActions.length === 0);
}

// 5. Max iterations exhausted -> fallback summary from tool results.
{
  const client = makeClient([{ functionCalls: [{ name: 'incident_clustering', args: {} }] }]);
  const res = await runLLMAgent({
    query: 'loop',
    config: { ...baseConfig, maxIterations: 2 },
    client,
    executeTool: async () => ({ toolName: 'Incident Clustering Tool', status: 'success', executionTimeMs: 0, summary: 'Detected 1 cluster', data: null })
  });
  ok('llm max iterations respected', res.iterations === 2);
  ok('llm fallback summary built from tools', res.summary.includes('Detected 1 cluster'));
  ok('llm collected both tool results', res.toolResults.length === 2);
}

// 6. Timeout rejects.
{
  const client: LLMClient = { models: { generateContent: () => new Promise(() => { /* never resolves */ }) } };
  let rejected = false;
  try {
    await runLLMAgent({ query: 'slow', config: { ...baseConfig, timeoutMs: 50 }, client, executeTool: async () => ({ toolName: 'x', status: 'success', executionTimeMs: 0, summary: '', data: null }) });
  } catch (e: any) {
    rejected = /timed out/i.test(String(e?.message || ''));
  }
  ok('llm timeout rejects', rejected);
}

// 7. Tool execution error is captured, not fatal.
{
  const client = makeClient([
    { functionCalls: [{ name: 'risk_analysis', args: { reportIds: [] } }] },
    { text: '{"executiveSummary":"Recovered.","recommendedActions":[]}' }
  ]);
  const res = await runLLMAgent({
    query: 'risk',
    config: baseConfig,
    client,
    executeTool: async () => { throw new Error('boom'); }
  });
  ok('llm captures tool error', res.toolResults[0]?.status === 'insufficient_evidence' && /boom/.test(res.toolResults[0]?.summary || ''));
  ok('llm still returns summary after tool error', res.summary === 'Recovered.');
}

// 8. SCIPIntelligenceAgent.executeToolByName for every tool.
{
  const now = new Date().toISOString();
  const rep = (over: any) => ({
    id: 'REP-1', title: 'Pothole on Main Road', description: 'Large pothole causing traffic', category: 'Roads & Traffic',
    urgency: 'medium', locationName: 'Sector 4 Market', latitude: 28.6139, longitude: 77.2090,
    citizenId: 'USR-CIT-01', status: 'pending', createdAt: now, updatedAt: now, ...over
  }) as any;
  const reports = [
    rep({ id: 'REP-1' }),
    rep({ id: 'REP-2', title: 'Garbage overflowing', category: 'Public Sanitation', locationName: 'Sector 4 Market', latitude: 28.6140, longitude: 77.2091 }),
    rep({ id: 'REP-3', title: 'Streetlight out', category: 'Power & Lighting', locationName: 'Sector 9', latitude: 28.7000, longitude: 77.1000 })
  ];
  const agent = new SCIPIntelligenceAgent({ reports, incidents: [] });

  const cases: Array<[string, any]> = [
    ['classification', { text: 'water logging on road' }],
    ['entity_extraction', { text: 'flooding near Sector 4 drain' }],
    ['similarity', { reportId: 'REP-1' }],
    ['duplicate_detection', { reportId: 'REP-1' }],
    ['geospatial_analysis', { lat: 28.6139, lng: 77.2090, radiusMeters: 1000 }],
    ['incident_clustering', {}],
    ['trend_analysis', {}],
    ['risk_analysis', { reportIds: ['REP-1', 'REP-2'] }],
    ['evidence_retrieval', { incidentOrClusterId: 'NOPE' }]
  ];
  for (const [name, args] of cases) {
    const r = await agent.executeToolByName(name, args);
    ok(`executeToolByName ${name} returns a result`, !!r && typeof r.toolName === 'string' && typeof r.status === 'string');
  }
  const unknown = await agent.executeToolByName('does_not_exist', {});
  ok('executeToolByName unknown -> insufficient_evidence', unknown.status === 'insufficient_evidence');

  // 9. Deterministic path (no key) still works and is labelled.
  const briefing = await agent.executeIntelligenceQuery('what needs attention?');
  ok('deterministic briefing produced', typeof briefing.executiveSummary === 'string' && briefing.executiveSummary.length > 0);
  ok('deterministic briefing labelled scip-rules-v1', briefing.modelUsed === 'scip-rules-v1');
  ok('deterministic confidence in range', briefing.confidence >= 0.3 && briefing.confidence <= 0.95, String(briefing.confidence));
  ok('deterministic briefing has disclaimer', /RESPONSIBLE-AI NOTICE/.test(briefing.uncertaintyDisclaimer));

  const specific = await agent.executeIntelligenceQuery('clusters', 'clustering');
  ok('specificTool path works', specific.toolResults.some(t => t.toolName === 'Incident Clustering Tool'));
}

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);