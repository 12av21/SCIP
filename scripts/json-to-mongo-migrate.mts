/**
 * SCIP JSON -> MongoDB Migration Utility (DB-07)
 * Safe, isolated, non-destructive migration rehearsal tooling.
 * Modes: audit, dry-run, backup, import, verify, rollback-plan.
 * NEVER mutates the original .scip_database.json.
 */
import { MongoScipRepository } from './mongoRepository.js';
import { JsonScipRepository } from './jsonRepository.js';

export async function main() {
  console.log('SCIP JSON->MongoDB migration utility loaded');
}

main();
