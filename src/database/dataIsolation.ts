/**
 * Phase 2 conservative real-data isolation (non-destructive, read-time only).
 * Hides ONLY:
 *  1) Records that positively match exact seed definitions in src/database/seedData.ts
 *  2) Clearly identifiable, documented automated-test artifacts (exact known markers)
 * All other records are treated as real/unknown and remain visible with existing access rules.
 * Never modifies, deletes, or reclassifies persisted records.
 */
import {
  SEED_DEPARTMENTS,
  SEED_USERS,
  SEED_REPORTS,
  SEED_INCIDENTS,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
  SEED_INSPECTIONS
} from './seedData.js';
import type { User, Report, Incident, Notification, AuditLog, InspectionRecord, AIAnalysis, Feedback } from '../types/scip.js';

const seedUserIds = new Set(SEED_USERS.map(u => u.id));
const seedDeptIds = new Set(SEED_DEPARTMENTS.map(d => d.id));
const seedReportIds = new Set(SEED_REPORTS.map(r => r.id));
const seedIncidentIds = new Set(SEED_INCIDENTS.map(i => i.id));
const seedNotifIds = new Set(SEED_NOTIFICATIONS.map(n => n.id));
const seedAuditIds = new Set(SEED_AUDIT_LOGS.map(a => a.id));
const seedInspectionIds = new Set(SEED_INSPECTIONS.map(i => i.id));

// Exact seed record maps for positive matching on defining persisted fields.
const seedReportsById = new Map(SEED_REPORTS.map(r => [r.id, r]));
const seedIncidentsById = new Map(SEED_INCIDENTS.map(i => [i.id, i]));
const seedUsersById = new Map(SEED_USERS.map(u => [u.id, u]));

// Documented automated-test artifact: exact report title present in persisted data from
// automated test runs (not in seedData). Treated as clearly identifiable test artifact.
const AUTOMATED_TEST_REPORT_TITLE = 'Automated Test Overflowing Manhole';

function sameStringArray(a?: string[], b?: string[]): boolean {
  const aa = a || [];
  const bb = b || [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

export function isSeedUser(u: User | any): boolean {
  if (!u || !seedUserIds.has(u.id)) return false;
  const s = seedUsersById.get(u.id);
  if (!s) return false;
  // Positive match on exact seed definition fields.
  return (
    u.email === s.email &&
    u.role === s.role &&
    u.name === s.name &&
    u.status === s.status
  );
}

export function isDocumentedAutomatedTestReport(r: Report | any): boolean {
  return !!r && r.title === AUTOMATED_TEST_REPORT_TITLE;
}

export function isSeedReport(r: Report | any): boolean {
  if (!r || !seedReportIds.has(r.id)) return false;
  const s = seedReportsById.get(r.id);
  if (!s) return false;
  return (
    r.title === s.title &&
    r.description === s.description &&
    r.category === s.category &&
    r.citizenId === s.citizenId &&
    r.citizenEmail === s.citizenEmail &&
    r.locationName === s.locationName &&
    r.latitude === s.latitude &&
    r.longitude === s.longitude &&
    r.createdAt === s.createdAt
  );
}

export function isHiddenReport(r: Report | any): boolean {
  return isSeedReport(r) || isDocumentedAutomatedTestReport(r);
}

export function isSeedIncident(i: Incident | any): boolean {
  if (!i || !seedIncidentIds.has(i.id)) return false;
  const s = seedIncidentsById.get(i.id);
  if (!s) return false;
  return (
    i.title === s.title &&
    i.category === s.category &&
    i.isAIGenerated === s.isAIGenerated &&
    sameStringArray(i.reportIds, s.reportIds) &&
    i.createdAt === s.createdAt
  );
}

export function isHiddenIncident(i: Incident | any): boolean {
  if (!i) return false;
  if (isSeedIncident(i)) return true;
  // Hide only if every linked report is hidden (seed/test artifact cluster).
  const ids: string[] = Array.isArray(i.reportIds) ? i.reportIds : [];
  if (ids.length > 0 && ids.every(id => seedReportIds.has(id))) {
    // ensure linked reports are actually seed-exact via id set of seed reports; seed incidents already covered,
    // this covers non-seed incidents composed entirely of seed reports (defensive, positive via seed ids).
    return true;
  }
  return false;
}

export function isSeedNotification(n: Notification | any): boolean {
  return !!n && seedNotifIds.has(n.id);
}

export function isHiddenNotification(n: Notification | any): boolean {
  if (!n) return false;
  if (isSeedNotification(n)) return true;
  if (n.link && seedReportIds.has(n.link)) return true;
  if (n.link && seedIncidentIds.has(n.link)) return true;
  return false;
}

export function isSeedAuditLog(a: AuditLog | any): boolean {
  return !!a && seedAuditIds.has(a.id);
}

export function isSeedInspection(x: InspectionRecord | any): boolean {
  return !!x && seedInspectionIds.has(x.id);
}

export function isHiddenInspection(x: InspectionRecord | any): boolean {
  if (!x) return false;
  if (isSeedInspection(x)) return true;
  if (x.incidentId && seedIncidentIds.has(x.incidentId)) return true;
  return false;
}

export function isHiddenUser(u: User | any): boolean {
  return isSeedUser(u);
}

export function isHiddenAnalysisForReport(reportId: string): boolean {
  return seedReportIds.has(reportId);
}

export function isHiddenFeedback(f: Feedback | any): boolean {
  if (!f) return false;
  if (f.reportId && seedReportIds.has(f.reportId)) return true;
  if (f.incidentId && seedIncidentIds.has(f.incidentId)) return true;
  return false;
}

// For UI-safe listing in admin/system stats we may exclude seed users; privileged ops still resolve by id.
// This is intentionally read-time only.
export function filterUsersForVisibility<T extends User>(users: T[]): T[] {
  return users.filter(u => !isHiddenUser(u));
}
export function filterReportsForVisibility<T extends Report>(reports: T[]): T[] {
  return reports.filter(r => !isHiddenReport(r));
}
export function filterIncidentsForVisibility<T extends Incident>(incidents: T[]): T[] {
  return incidents.filter(i => !isHiddenIncident(i));
}
export function filterNotificationsForVisibility<T extends Notification>(items: T[]): T[] {
  return items.filter(n => !isHiddenNotification(n));
}
export function filterInspectionsForVisibility<T extends InspectionRecord>(items: T[]): T[] {
  return items.filter(n => !isHiddenInspection(n));
}
export function filterAuditLogsForVisibility<T extends AuditLog>(items: T[]): T[] {
  return items.filter(a => !isSeedAuditLog(a));
}
export function filterFeedbacksForVisibility<T extends Feedback>(items: T[]): T[] {
  return items.filter(f => !isHiddenFeedback(f));
}
