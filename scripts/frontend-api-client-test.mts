// SCIP - Frontend API Client Robustness Test (R5)
// Verifies request timeouts, external abort forwarding, and empty-body handling.
// Mocks global fetch; no real network.
import { api } from '../src/services/apiClient.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

const req = (api as any).request.bind(api);

// Hanging fetch that rejects when the request signal aborts (or is already aborted).
function hangingFetch(_url: string, init: any): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    };
    if (init?.signal?.aborted) { fail(); return; }
    init.signal.addEventListener('abort', fail, { once: true });
  });
}

// 1. A hanging request aborts and surfaces a timeout error.
{
  (globalThis as any).fetch = hangingFetch;
  let msg = '';
  try { await req('/x', {}, 50); } catch (e: any) { msg = e.message; }
  ok('request times out', /timed out after 50ms/i.test(msg), msg);
}

// 2. External abort signal is honored (aborts immediately).
{
  (globalThis as any).fetch = hangingFetch;
  const c = new AbortController();
  c.abort();
  let rejected = false;
  try { await req('/x', { signal: c.signal }, 5000); } catch { rejected = true; }
  ok('external abort honored', rejected);
}

// 3. Empty (204) body resolves to an object instead of throwing.
{
  (globalThis as any).fetch = async () => new Response(null, { status: 204 });
  let result: any = 'unset';
  let threw = false;
  try { result = await req('/x', {}, 1000); } catch { threw = true; }
  ok('empty 204 body resolves to object', !threw && result && typeof result === 'object');
}

// 4. Successful JSON body is parsed and returned.
{
  (globalThis as any).fetch = async () => new Response(JSON.stringify({ success: true, data: [1, 2, 3] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const r = await req('/x', {}, 1000);
  ok('json body parsed', r?.success === true && Array.isArray(r?.data) && r.data.length === 3);
}

// 5. Non-OK JSON error surfaces the server message.
{
  (globalThis as any).fetch = async () => new Response(JSON.stringify({ message: 'boom' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  let msg = '';
  try { await req('/x', {}, 1000); } catch (e: any) { msg = e.message; }
  ok('error message surfaced', msg === 'boom', msg);
}

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);