import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';

type AnyObj = Record<string, any>;

function die(msg: string, code = 1): never { console.error(`[migration] ERROR: ${msg}`); process.exit(code); }
function ok(msg: string) { console.log(`[migration] ${msg}`); }

function sha256File(filePath: string): string {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

function sha256Json(value: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function verifyAuditChain(auditLogs: AnyObj[]): { isValid: boolean; checkedCount: number; brokenId?: string } {
  if (!Array.isArray(auditLogs) || auditLogs.length === 0) return { isValid: true, checkedCount: 0 };
  const genesis = '0000000000000000000000000000000000000000000000000000000000000000';
  const reversed = [...auditLogs].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const entry = reversed[i];
    const prevHash = i === 0 ? genesis : (reversed[i - 1].hash || genesis);
    if (entry.prevHash && entry.prevHash !== prevHash) return { isValid: false, checkedCount: i, brokenId: entry.id };
    if (entry.hash) {
      const legacy = `${prevHash}|${entry.id}|${entry.timestamp}|${entry.action}|${entry.module}|${entry.userId}|${entry.details}`;
      const canonical = JSON.stringify([prevHash, entry.id, entry.timestamp, entry.action, entry.module, entry.userId, entry.details ?? '']);
      const legacyHash = crypto.createHash('sha256').update(legacy).digest('hex');
      const canonicalHash = crypto.createHash('sha256').update(canonical).digest('hex');
      if (entry.hash !== legacyHash && entry.hash !== canonicalHash) return { isValid: false, checkedCount: i, brokenId: entry.id };
    }
  }
  return { isValid: true, checkedCount: auditLogs.length };
}

function isIsolatedLocalUri(uri: string): boolean {
  const u = uri.toLowerCase();
  if (u.includes('mongodb.net') || u.includes('mongodb+srv://')) return false;
  if (!/^mongodb:\/\//.test(u)) return false;
  return u.includes('127.0.0.1') || u.includes('localhost') || u.includes('[::1]');
}

function parseArgs(argv: string[]) {
  const args: AnyObj = { dryRun: false, confirm: '', targetDb: 'scip_dev' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') args.source = argv[++i];
    else if (a === '--uri') args.uri = argv[++i];
    else if (a === '--target-db') args.targetDb = argv[++i];
    else if (a === '--confirm') args.confirm = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.source) {
  console.log(`Usage:
  npx tsx scripts/mongo-migration-execute.mts --source <snapshot.json> --dry-run
  npx tsx scripts/mongo-migration-execute.mts --source <snapshot.json> --uri <mongodb://127.0.0.1:27017> --target-db scip_dev --confirm MIGRATE_TO_ISOLATED_SCIP_DEV

Safety:
  - Source file is read-only and never modified.
  - Refuses non-local/Atlas/production URIs.
  - Execution requires explicit --confirm token and isolated local target.
  - Idempotent upserts by entity id (no destructive deletes).`);
  process.exit(args.source ? 1 : 0);
}

const sourcePath = path.resolve(args.source);
if (!fs.existsSync(sourcePath)) die(`Source not found: ${sourcePath}`);
const sourceStat = fs.statSync(sourcePath);
const sourceSha = sha256File(sourcePath);
const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as AnyObj;

const entities: Array<[string, string, string]> = [
  ['users','users','id'], ['departments','departments','id'], ['reports','reports','id'], ['incidents','incidents','id'],
  ['analyses','analyses','reportId'], ['assignments','assignments','id'], ['resolutions','resolutions','id'], ['inspections','inspections','id'],
  ['notifications','notifications','id'], ['feedbacks','feedbacks','id'], ['auditLogs','auditlogs','id'], ['riskScores','riskscores','id']
];

const counts: Record<string, number> = {};
const duplicates: Record<string, string[]> = {};
const missingIds: Record<string, number> = {};
for (const [key,, idField] of entities) {
  const arr = Array.isArray(data[key]) ? data[key] : [];
  counts[key] = arr.length;
  const seen = new Set<string>(); const dups: string[] = [];
  for (const item of arr) {
    const id = item?.[idField];
    if (!id || typeof id !== 'string') { missingIds[key] = (missingIds[key]||0)+1; continue; }
    if (seen.has(id)) dups.push(id); else seen.add(id);
  }
  if (dups.length) duplicates[key] = dups.slice(0,20);
}

// Referential integrity checks (source snapshot)
const reportIds = new Set((data.reports||[]).map((r:any)=>r.id).filter(Boolean));
const incidentIds = new Set((data.incidents||[]).map((i:any)=>i.id).filter(Boolean));
const userIds = new Set((data.users||[]).map((u:any)=>u.id).filter(Boolean));
const refIssues: string[] = [];
for (const r of data.reports||[]) {
  if (r.incidentId && !incidentIds.has(r.incidentId)) refIssues.push(`report ${r.id} -> missing incident ${r.incidentId}`);
  if (r.citizenId && !userIds.has(r.citizenId)) refIssues.push(`report ${r.id} -> missing citizen ${r.citizenId}`);
}
for (const i of data.incidents||[]) {
  for (const rid of i.reportIds||[]) if (!reportIds.has(rid)) refIssues.push(`incident ${i.id} -> missing report ${rid}`);
}
for (const insp of data.inspections||[]) {
  if (insp.incidentId && !incidentIds.has(insp.incidentId)) refIssues.push(`inspection ${insp.id} -> missing incident ${insp.incidentId}`);
}

const auditCheck = verifyAuditChain(Array.isArray(data.auditLogs)?data.auditLogs:[]);

const baseSummary: AnyObj = {
  tool: 'scip-mongo-migration-execute',
  mode: args.dryRun ? 'dry-run' : 'execute',
  sourcePath, sourceSizeBytes: sourceStat.size, sourceMtime: sourceStat.mtime.toISOString(), sourceSha256: sourceSha,
  targetDb: args.targetDb, counts, duplicates, missingIds, referentialIssues: refIssues.slice(0,50), referentialIssueCount: refIssues.length,
  auditIntegrity: auditCheck, timestamp: new Date().toISOString()
};

if (args.dryRun) {
  baseSummary.status = 'DRY_RUN_OK';
  baseSummary.notes = ['Source read-only validated. No database connection, no writes, no source modification.'];
  console.log(JSON.stringify(baseSummary, null, 2));
  process.exit(0);
}

if (args.confirm !== 'MIGRATE_TO_ISOLATED_SCIP_DEV') die('Execution requires --confirm MIGRATE_TO_ISOLATED_SCIP_DEV');
if (!args.uri || typeof args.uri !== 'string') die('Missing --uri');
if (!isIsolatedLocalUri(args.uri)) die('Refusing non-isolated/hosted/Atlas URI. Only local isolated mongodb://127.0.0.1|localhost targets allowed.');
if (String(args.targetDb).toLowerCase() !== 'scip_dev') die('Target DB must be scip_dev for this approved isolated run.');

await mongoose.connect(args.uri, { dbName: args.targetDb, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
const connDb = mongoose.connection.db;
if (!connDb) die('No MongoDB database handle after connect.');
const targetName = mongoose.connection.name;
if (targetName !== 'scip_dev') die(`Connected to unexpected database "${targetName}" (expected scip_dev). Aborting.`);

ok(`Connected to isolated target ${targetName} (read-only source, idempotent upserts, no deletes).`);

const collectionMap: Record<string,string> = { users:'users', departments:'departments', reports:'reports', incidents:'incidents', analyses:'analyses', assignments:'assignments', resolutions:'resolutions', inspections:'inspections', notifications:'notifications', feedbacks:'feedbacks', auditLogs:'auditlogs', riskScores:'riskscores' };
const idFieldMap: Record<string,string> = { users:'id', departments:'id', reports:'id', incidents:'id', analyses:'reportId', assignments:'id', resolutions:'id', inspections:'id', notifications:'id', feedbacks:'id', auditLogs:'id', riskScores:'id' };

const writeSummary: AnyObj = {};
for (const [key] of entities) {
  const arr = Array.isArray(data[key]) ? data[key] : [];
  const col = connDb.collection(collectionMap[key]);
  const idField = idFieldMap[key];
  let upserted = 0, modified = 0, matched = 0, errors = 0;
  for (const rawItem of arr) {
    const item = { ...rawItem };
    // normalize users
    if (key === 'users') {
      if (typeof item.sessionVersion !== 'number') item.sessionVersion = 0;
      if (typeof item.credentialsResetRequired !== 'boolean') item.credentialsResetRequired = false;
    }
    const idVal = item?.[idField];
    if (!idVal) { errors++; continue; }
    try {
      const res = await col.updateOne({ [idField]: idVal }, { $set: item }, { upsert: true });
      if (res.upsertedCount) upserted += res.upsertedCount;
      if (res.modifiedCount) modified += res.modifiedCount;
      if (res.matchedCount) matched += res.matchedCount;
    } catch (e:any) { errors++; refIssues.push(`write error ${key}:${idVal}`); }
  }
  const targetCount = await col.countDocuments();
  // ensure unique index on id field (best-effort)
  try { await col.createIndex({ [idField]: 1 }, { unique: true, sparse: true }); } catch {}
  writeSummary[key] = { source: arr.length, targetCount, upserted, modified, matched, errors };
}

await mongoose.disconnect();
baseSummary.status = 'EXECUTED_ISOLATED_TARGET';
baseSummary.writeSummary = writeSummary;
baseSummary.notes = [
  'Executed against isolated local scip_dev only (approved). Source file not modified.',
  'Idempotent upserts by entity key; no destructive deletes performed.',
  'Original .scip_database.json untouched. No production/Atlas/external DB used.',
  'Runtime application still uses file-backed JSON unless explicitly and safely integrated later (out of scope of this run).'
];
baseSummary.referentialIssues = refIssues.slice(0,50);
baseSummary.referentialIssueCount = refIssues.length;
console.log(JSON.stringify(baseSummary, null, 2));
