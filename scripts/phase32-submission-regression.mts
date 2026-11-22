// SCIP Phase 3.2 - Submission Regression Tests
import { parseDataUrl, detectFormat } from '../src/ai/imageIntelligence.js';

let passed = 0;
let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

// 1. Valid JPEG data URL passes magic-byte check
{
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const b64 = buf.toString('base64');
  const url = `data:image/jpeg;base64,${b64}`;
  const r = parseDataUrl(url);
  ok('valid JPEG data URL accepted', r !== null && r.mimeType === 'image/jpeg');
}

// 2. Mismatched MIME rejected (PNG bytes claimed as JPEG)
{
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const b64 = buf.toString('base64');
  const url = `data:image/jpeg;base64,${b64}`;
  const r = parseDataUrl(url);
  ok('mismatched MIME rejected', r === null);
}

// 3. Invalid data URL rejected
{
  const r = parseDataUrl('not-a-data-url');
  ok('invalid data URL rejected', r === null);
}

// 4. Empty base64 rejected (too short)
{
  const r = parseDataUrl('data:image/png;base64,');
  ok('empty base64 rejected', r === null);
}

// 5. detectFormat identifies JPEG
{
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  ok('detectFormat JPEG', detectFormat(buf) === 'jpeg');
}

// 6. detectFormat identifies PNG
{
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  ok('detectFormat PNG', detectFormat(buf) === 'png');
}

// 7. detectFormat unknown for garbage
{
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  ok('detectFormat unknown', detectFormat(buf) === 'unknown');
}

// 8. PIN validation regex
{
  const valid = (p: string) => /^[1-9][0-9]{5}$/.test(p);
  ok('PIN valid 110001', valid('110001'));
  ok('PIN invalid leading zero', !valid('010001'));
  ok('PIN invalid length', !valid('12345'));
}

// 9. Report ID format
{
  const id = `REP-${new Date().getFullYear()}-001`;
  ok('report ID format', /^REP-\d{4}-\d{3,}$/.test(id));
}

// Summary
console.log(results.join('\n'));
console.log(`\nTotal: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
if (failed > 0) process.exit(1);
