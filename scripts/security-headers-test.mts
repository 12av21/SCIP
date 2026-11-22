// SCIP - Security Headers Test (R4)
// Verifies the production CSP allows the Clerk browser SDK while remaining restrictive.
// Pure unit test of buildCsp(); no server boot, no network.
import { buildCsp } from '../src/server/csp.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

const saved = {
  pk: process.env.CLERK_PUBLISHABLE_KEY,
  vitePk: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  hosts: process.env.CLERK_JS_HOSTS
};
function reset() {
  if (saved.pk === undefined) delete process.env.CLERK_PUBLISHABLE_KEY; else process.env.CLERK_PUBLISHABLE_KEY = saved.pk;
  if (saved.vitePk === undefined) delete process.env.VITE_CLERK_PUBLISHABLE_KEY; else process.env.VITE_CLERK_PUBLISHABLE_KEY = saved.vitePk;
  if (saved.hosts === undefined) delete process.env.CLERK_JS_HOSTS; else process.env.CLERK_JS_HOSTS = saved.hosts;
}

// 1. Default policy is restrictive and allows Clerk wildcard domains.
reset();
delete process.env.CLERK_PUBLISHABLE_KEY;
delete process.env.VITE_CLERK_PUBLISHABLE_KEY;
delete process.env.CLERK_JS_HOSTS;
const base = buildCsp();
ok('csp: default-src self', base.includes("default-src 'self'"));
ok('csp: object-src none', base.includes("object-src 'none'"));
ok('csp: frame-ancestors self', base.includes("frame-ancestors 'self'"));
ok('csp: allows clerk.accounts.dev script', /script-src[^;]*https:\/\/\*\.clerk\.accounts\.dev/.test(base));
ok('csp: allows clerk.com connect', /connect-src[^;]*https:\/\/\*\.clerk\.com/.test(base));
ok('csp: clerk on frame-src', /frame-src[^;]*https:\/\/\*\.clerk\.accounts\.dev/.test(base));

// 2. CLERK_JS_HOSTS adds a custom host.
reset();
process.env.CLERK_JS_HOSTS = 'https://clerk.acme.gov.in, https://login.acme.gov.in';
const withHosts = buildCsp();
ok('csp: CLERK_JS_HOSTS host added', withHosts.includes('https://clerk.acme.gov.in') && withHosts.includes('https://login.acme.gov.in'));
ok('csp: trims whitespace in host list', !withHosts.includes('  https://login.acme.gov.in'));

// 3. Publishable key host is derived and added.
reset();
const encoded = Buffer.from('clerk.example.com$', 'utf8').toString('base64');
process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${encoded}`;
const withPk = buildCsp();
ok('csp: publishable key host derived', withPk.includes('https://clerk.example.com'), withPk.slice(0, 200));
reset();

// 4. Malformed publishable key does not throw and keeps wildcard coverage.
reset();
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_@@@not-base64@@@';
let threw = false;
let malformedCsp = '';
try { malformedCsp = buildCsp(); } catch { threw = true; }
ok('csp: malformed key does not throw', threw === false);
ok('csp: malformed key keeps clerk wildcard', malformedCsp.includes('https://*.clerk.accounts.dev'));
reset();

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);