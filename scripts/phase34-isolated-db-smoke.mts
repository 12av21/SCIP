// SCIP Phase 3.4 - Isolated repository smoke test
process.env.NODE_ENV = 'test';
process.env.SCIP_TEST_DB_PATH = 'tmp/test_db_phase34.json';

import { db } from '../src/database/index.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

(async () => {
  const storage = db.getStorageInfo();
  ok('storage info retrieved', storage !== null);
  const users = await db.getUsers();
  ok('users queryable', Array.isArray(users));
  console.log(results.join('\n'));
  console.log(`\nTotal: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) process.exit(1);
})();
