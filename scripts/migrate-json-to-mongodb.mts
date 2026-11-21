import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const execute = args.includes('--execute');
const verify = args.includes('--verify');
const resume = args.includes('--resume');
const collectionArg = args.find(a => a.startsWith('--collection='));
const selectedCollection = collectionArg ? collectionArg.split('=')[1] : null;

const SOURCE = path.resolve(process.cwd(), '.scip_database.json');

if (!fs.existsSync(SOURCE)) {
  console.error('Source file not found:', SOURCE);
  process.exit(1);
}

const raw = fs.readFileSync(SOURCE, 'utf-8');
const data = JSON.parse(raw);
const sha256 = crypto.createHash('sha256').update(raw).digest('hex');

const collections = Object.keys(data).filter(k => k !== 'savedAt');

const targetCounts: Record<string, number> = {};

console.log('=== SCIP Migration Dry Run ===');
console.log('Source:', SOURCE);
console.log('Source SHA-256:', sha256);
console.log('Collections:', collections.length);
console.log('Mode:', dryRun ? 'DRY-RUN (read-only)' : execute ? 'EXECUTE' : verify ? 'VERIFY' : 'PLAN');

for (const col of collections) {
  const records = Array.isArray(data[col]) ? data[col] : [];
  targetCounts[col] = records.length;
  if (selectedCollection && selectedCollection !== col) continue;
  console.log(`\n[${col}] source records: ${records.length}`);
  // Duplicate ID check
  const ids = records.map((r: any) => r.id || r._id).filter(Boolean);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    console.log(`  WARNING: duplicate IDs detected (${ids.length - uniqueIds.size})`);
  }
  // Missing IDs
  const missingIds = records.filter((r: any) => !r.id && !r._id).length;
  if (missingIds > 0) {
    console.log(`  WARNING: ${missingIds} records missing ID`);
  }
}

console.log('\n=== Summary ===');
console.log('Total source records:', Object.values(targetCounts).reduce((a,b)=>a+b,0));
console.log('DRY RUN COMPLETE - no data written.');
console.log('SHA-256:', sha256);
