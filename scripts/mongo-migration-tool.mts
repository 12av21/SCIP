#!/usr/bin/env node
/**
 * SCIP MongoDB migration readiness tool (SAFE / READ-ONLY MODES ONLY)
 *
 * Modes:
 *   analyze <source-json-path>  - Read-only analysis: counts, SHA-256, entity presence, basic integrity signals
 *   plan    <source-json-path>  - Read-only migration/parity plan summary (no DB connections)
 *
 * Safety guarantees in this implementation:
 *   - Never modifies the source file.
 *   - Never connects to MongoDB, Atlas, or any production/existing database.
 *   - Never seeds, resets, migrates, or writes application data.
 *   - Execution/cutover is intentionally NOT implemented; follow docs/MONGODB_MIGRATION_READINESS_CHECKLIST.md
 *     in an explicitly approved isolated environment only.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function usage(exitCode = 0): never {
  console.log(`SCIP migration readiness tool (read-only)

Usage:
  npx tsx scripts/mongo-migration-tool.mts analyze <source-json-path>
  npx tsx scripts/mongo-migration-tool.mts plan <source-json-path>

Safety:
  - Read-only operations only. Source file is never modified.
  - No MongoDB/Atlas/production connections. No migration execution.
  - Requires explicit approval + isolated target for any future execution.`);
  process.exit(exitCode);
}

function sha256File(filePath: string): string {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

type AnyObj = Record<string, any>;

function main() {
  const [cmd, src] = process.argv.slice(2);
  if (!cmd || (cmd !== 'analyze' && cmd !== 'plan') || !src) usage(cmd ? 1 : 0);

  const sourcePath = path.resolve(src);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(2);
  }

  const stat = fs.statSync(sourcePath);
  const raw = fs.readFileSync(sourcePath, 'utf-8');
  const data = JSON.parse(raw) as AnyObj;
  const collections = [
    'users','departments','reports','incidents','analyses','assignments','resolutions',
    'inspections','notifications','feedbacks','auditLogs','riskScores'
  ];
  const counts: Record<string, number> = {};
  for (const k of collections) counts[k] = Array.isArray(data[k]) ? data[k].length : 0;

  const users = Array.isArray(data.users) ? data.users : [];
  const reports = Array.isArray(data.reports) ? data.reports : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

  const signals = {
    usersMissingSessionVersion: users.filter((u: any) => typeof u?.sessionVersion !== 'number').length,
    usersWithCredentialsResetRequired: users.filter((u: any) => u?.credentialsResetRequired === true).length,
    reportsLinkedToIncident: reports.filter((r: any) => typeof r?.incidentId === 'string' && r.incidentId).length,
    incidentsWithReports: incidents.filter((i: any) => Array.isArray(i?.reportIds) && i.reportIds.length > 0).length,
    auditLogsWithHash: auditLogs.filter((l: any) => typeof l?.hash === 'string' && l.hash).length,
    auditLogsWithPrevHash: auditLogs.filter((l: any) => typeof l?.prevHash === 'string' && l.prevHash).length,
  };

  const result = {
    tool: 'scip-mongo-migration-tool',
    mode: cmd,
    readOnly: true,
    sourcePath,
    sourceSizeBytes: stat.size,
    sourceMtime: stat.mtime.toISOString(),
    sourceSha256: sha256File(sourcePath),
    counts,
    signals,
    analyzedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));

  if (cmd === 'plan') {
    console.log('\n--- MIGRATION/PARITY PLAN (READ-ONLY SUMMARY) ---');
    console.log('Gates (all required before execution): explicit owner approval, isolated target DB/env, quiesced read-only source snapshot, backup+restore+rollback plan approved, no prod/existing data.');
    console.log('No MongoDB connection performed. No migration executed.');
    console.log('Planned steps: 1) freeze/quiesce source 2) read-only extract+transform 3) load to isolated target 4) parity checks (counts, SHA/field checksums, IDs/relations, audit chain, scoping/RBAC behavior) 5) isolated app/security parity tests 6) backup/restore drill 7) explicit cutover approval.');
    console.log('Entities: users, departments, reports, incidents, analyses, assignments, resolutions, inspections, notifications, feedbacks, auditLogs, riskScores.');
    console.log('Critical parity: audit hash chain (canonical/legacy), sessionVersion/credentialsResetRequired, report<->incident linkage, workflow states/timestamps, PII minimization/scoping semantics, role permissions.');
    console.log('Runtime integration/cutover remains BLOCKED until explicit approval + isolated target are provided and verified.');
  }
}

main();
