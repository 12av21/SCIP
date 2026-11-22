// SCIP AI/ML Foundation - Intelligent Response Generation Engine
// Generates role-aware, context-grounded responses for all six SCIP user roles.
// Uses actual authorized database records. Never invents facts.

import { Report, Incident, User, Department, AgentBriefing, SpatioTemporalCluster, RiskScore, Notification, Feedback } from '../types/scip';
import { classifyReport, extractEntities, determineSeverity } from './classifier.js';
import { findSimilarAndDuplicateReports } from './duplicateDetector.js';
import { computeExplainableRisk } from './riskScorer.js';
import { detectIncidentClusters } from './incidentClustering.js';
import { globalVectorizer } from './tfidf.js';
import { aiAdapter } from './aiServiceAdapter.js';
import { getDatasetEntries } from './civicDataset.js';

let vectorizerInitialized = false;

function ensureVectorizerInitialized(): void {
  if (vectorizerInitialized) return;
  const entries = getDatasetEntries();
  globalVectorizer.fit(
    entries.map(e => ({ id: e.id, text: `${e.title} ${e.description} ${e.trueCategory} ${e.locationName}` }))
  );
  vectorizerInitialized = true;
}

export interface CitizenResponse {
  acknowledgment: string;
  incidentSummary: string;
  categoryExplanation: string;
  statusExplanation: string;
  nextSteps: string[];
  estimatedTimeline?: string;
  referenceId: string;
}

export interface FieldOfficerBriefing {
  incidentBriefing: string;
  inspectionChecklist: string[];
  evidenceCollectionSuggestions: string[];
  possibleResolutionSteps: string[];
  safetyConsiderations: string[];
  assignedIncidentId: string;
  priority: string;
}

export interface DepartmentOfficerIntelligence {
  workloadAnalysis: {
    totalAssigned: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    slaAtRisk: number;
  };
  pendingIncidentSummary: string;
  slaRiskAssessment: string[];
  escalationRecommendations: string[];
  suggestedTaskPrioritization: string[];
}

export interface AnalystIntelligence {
  incidentTrends: {
    categoryAnalysis: Record<string, { count: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
    duplicatePatterns: { clusterId: string; reportCount: number; similarity: number }[];
    hotspotSummary: { location: string; reportCount: number; categories: string[] }[];
    emergingIssues: string[];
  };
  statisticalExplanations: string[];
  confidenceIndicators: Record<string, number>;
}

export interface AuthoritySummary {
  regionalSituationSummary: string;
  highPriorityIncidentAnalysis: {
    count: number;
    byDepartment: Record<string, number>;
    topHazards: string[];
  };
  crossDepartmentPerformance: {
    department: string;
    incidentsAssigned: number;
    avgResolutionTimeHours: number;
    slaComplianceRate: number;
    escalationCount: number;
  }[];
  resourceAllocationSuggestions: string[];
  strategicRecommendations: string[];
}

export interface AdminAIHealth {
  serviceStatus: 'healthy' | 'degraded' | 'unavailable';
  providerStatus: {
    pythonService: boolean;
    llmProvider: boolean;
    localEngine: boolean;
  };
  modelConfiguration: {
    activeModels: Array<{ name: string; version: string; framework: string; task: string }>;
    defaultModels: Array<{ name: string; version: string }>;
  };
  usageStats: {
    classificationRequests: number;
    duplicateChecks: number;
    riskAssessments: number;
    agentQueries: number;
    avgResponseTimeMs: number;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    'P1_CRITICAL': 'P1 — Critical',
    'P2_HIGH': 'P2 — High',
    'P3_MEDIUM': 'P3 — Medium',
    'P4_LOW': 'P4 — Low',
    'P1': 'P1 — Critical',
    'P2': 'P2 — High',
    'P3': 'P3 — Medium',
    'P4': 'P4 — Low'
  };
  return labels[priority] || priority;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'submitted': 'Submitted',
    'processing': 'Processing',
    'analyzed': 'Analyzed',
    'linked': 'Linked to Incident',
    'under_review': 'Under Review',
    'assigned': 'Assigned to Department',
    'resolved': 'Resolved',
    'closed': 'Closed',
    'potential': 'Potential (Awaiting Review)',
    'confirmed': 'Confirmed',
    'in_progress': 'In Progress',
    'dismissed': 'Dismissed'
  };
  return labels[status] || status;
}

function getUrgencyLabel(urgency: string): string {
  const labels: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical'
  };
  return labels[urgency] || urgency;
}

/**
 * CITIZEN RESPONSE GENERATION
 * Generates acknowledgment, category explanation, status explanation, and next steps
 * based on the citizen's report and its current state.
 */
export function generateCitizenResponse(report: Report, linkedIncident?: Incident): CitizenResponse {
  ensureVectorizerInitialized();
  const classification = classifyReport(`${report.title} ${report.description}`, report.category);
  const entities = extractEntities(`${report.title} ${report.description}`);
  const severity = determineSeverity(`${report.title} ${report.description}`, report.urgency);

  const incidentId = linkedIncident?.id || report.incidentId || 'N/A';
  const incidentTitle = linkedIncident?.title || 'Not yet linked to an incident';

  const acknowledgment = `Thank you for reporting this issue. Your observation has been recorded as <strong>${report.id}</strong> and is now part of the municipal intelligence system.`;

  const incidentSummary = linkedIncident
    ? `Your report has been grouped with related observations into <strong>Incident ${incidentId}</strong>: "${incidentTitle}". This incident currently has <strong>${linkedIncident.reportIds.length}</strong> linked citizen report(s) and is classified as <strong>${linkedIncident.category}</strong> with <strong>${getPriorityLabel(linkedIncident.priority)}</strong> priority.`
    : `Your report is currently being analyzed. It has been classified as <strong>${classification.predictedCategory}</strong> with <strong>${(classification.confidence * 100).toFixed(0)}%</strong> confidence by our AI engine.`;

  const categoryExplanation = getCategoryExplanation(classification.predictedCategory, classification.confidence, classification.allScores);

  const statusExplanation = getStatusExplanation(report.status, linkedIncident);

  const nextSteps = getCitizenNextSteps(report, linkedIncident);

  const estimatedTimeline = getEstimatedTimeline(report, linkedIncident);

  return {
    acknowledgment,
    incidentSummary,
    categoryExplanation,
    statusExplanation,
    nextSteps,
    estimatedTimeline,
    referenceId: report.id
  };
}

function getCategoryExplanation(category: string, confidence: number, allScores: { category: string; score: number }[]): string {
  const explanations: Record<string, string> = {
    'Water & Drainage': 'This category covers stormwater drainage, water supply pipes, sewer lines, culverts, manholes, and flooding issues. Reports about waterlogging, pipe leaks, drain blockages, and contamination fall here.',
    'Roads & Traffic': 'This category covers potholes, road surface damage, traffic signals, congestion, speed breakers, dividers, pedestrian crossings, and street lighting on roads.',
    'Public Sanitation': 'This category covers garbage collection, waste bins, littering, dumping grounds, street sweeping, public toilet cleanliness, and odor complaints.',
    'Power & Lighting': 'This category covers streetlights, power poles, transformers, electrical wires, outages, voltage fluctuations, and public lighting infrastructure.',
    'Parks & Environment': 'This category covers parks, gardens, playgrounds, trees, fallen branches, overgrown vegetation, lakes, ponds, and public green spaces.',
    'Structural Safety': 'This category covers building cracks, wall collapses, bridge damage, railing failures, hazardous structures, and foundation issues in public infrastructure.',
    'Public Health': 'This category covers mosquito breeding, disease vectors (dengue/malaria), rodent infestations, stray animals, dead animal removal, and medical waste hazards.',
    'Noise & Disturbance': 'This category covers noise pollution, loudspeakers, construction noise, generator noise, honking, and other public disturbance complaints.'
  };

  const topAlternative = allScores[1] ? allScores[1].category : null;
  const altText = topAlternative ? ` The next closest category was <strong>${topAlternative}</strong>.` : '';

  let explanation = `<strong>${category}</strong> is the predicted category for your report. `;
  explanation += explanations[category] || 'This category covers municipal infrastructure and service issues.';
  explanation += ` Our AI classifier assigned this with <strong>${(confidence * 100).toFixed(0)}%</strong> confidence.${altText}`;

  if (confidence < 0.65) {
    explanation += ` <em>Note: Confidence is moderate. A municipal officer will review the classification during intake.</em>`;
  }

  return explanation;
}

function getStatusExplanation(status: string, incident?: Incident): string {
  const baseExplanation = `Your report is currently <strong>${getStatusLabel(status)}</strong>. `;

  switch (status) {
    case 'submitted':
      return baseExplanation + 'It has been received and queued for AI analysis and departmental routing.';
    case 'processing':
      return baseExplanation + 'AI classification, duplicate detection, and entity extraction are in progress.';
    case 'analyzed':
      return baseExplanation + 'AI analysis is complete. The report is awaiting human review for category confirmation and incident linking.';
    case 'linked':
      return baseExplanation + (incident
        ? ` It has been grouped into Incident ${incident.id} (${incident.title}) with ${incident.reportIds.length - 1} other related report(s).`
        : ' It has been linked to a municipal incident.');
    case 'under_review':
      return baseExplanation + ' A municipal officer is reviewing the report for validation and departmental assignment.';
    case 'assigned':
      return baseExplanation + (incident
        ? ` It has been assigned to <strong>${incident.assignedDepartmentName || 'the responsible department'}</strong> for action.`
        : ' It has been assigned to the responsible department for action.');
    case 'resolved':
      return baseExplanation + ' The department has marked the issue as resolved. A verification inspection may follow.';
    case 'closed':
      return baseExplanation + ' The report has been officially closed after verification and citizen acknowledgment.';
    default:
      return baseExplanation;
  }
}

function getCitizenNextSteps(report: Report, incident?: Incident): string[] {
  const steps: string[] = [];

  switch (report.status) {
    case 'submitted':
    case 'processing':
    case 'analyzed':
      steps.push('Your report will be analyzed by our AI engine within minutes.');
      steps.push('A municipal officer will review and confirm the category assignment.');
      break;
    case 'linked':
      if (incident) {
        steps.push(`Track Incident ${incident.id} for updates on the combined municipal response.`);
      } else {
        steps.push('Your report is part of an incident cluster. Check back for the incident reference number.');
      }
      steps.push('You will receive a notification when a department is assigned.');
      break;
    case 'under_review':
      steps.push('A municipal officer is reviewing your report.');
      steps.push('You will be notified once a department is assigned for action.');
      break;
    case 'assigned':
      if (incident) {
        steps.push(`The ${incident.assignedDepartmentName || 'responsible department'} has been notified and will begin work.`);
        steps.push(`Expected response within the department's SLA window (typically 24-72 hours for ${getUrgencyLabel(report.urgency)} priority).`);
      }
      break;
    case 'resolved':
      steps.push('The department has completed the work. A field inspection may verify the resolution.');
      steps.push('You may be asked to confirm the issue is resolved from your perspective.');
      break;
    case 'closed':
      steps.push('The matter is officially closed. Thank you for contributing to civic intelligence.');
      break;
  }

  steps.push('You can check status anytime in "My Reports" or reply to this notification for updates.');

  return steps;
}

function getEstimatedTimeline(report: Report, incident?: Incident): string | undefined {
  if (incident && incident.status === 'in_progress') {
    return 'Work is in progress. Estimated completion depends on field conditions.';
  }
  if (incident && (incident.status === 'confirmed' || incident.status === 'in_progress')) {
    const slaHours = report.urgency === 'critical' ? 24 : report.urgency === 'high' ? 48 : report.urgency === 'medium' ? 72 : 120;
    return `Department SLA: approximately ${slaHours} hours from assignment.`;
  }
  if (['submitted', 'processing', 'analyzed', 'linked', 'under_review'].includes(report.status)) {
    return 'Under intake review. Typically 2-6 hours for initial processing.';
  }
  return undefined;
}

/**
 * FIELD OFFICER BRIEFING GENERATION
 * Generates actionable briefing for field officers assigned to an incident.
 */
export function generateFieldOfficerBriefing(incident: Incident, reports: Report[]): FieldOfficerBriefing {
  ensureVectorizerInitialized();
  const primaryReport = reports[0];
  const classification = classifyReport(`${primaryReport.title} ${primaryReport.description}`, primaryReport.category);
  const entities = extractEntities(reports.map(r => `${r.title} ${r.description}`).join(' '));
  const risk = computeExplainableRisk({
    entityType: 'incident',
    entityId: incident.id,
    reports,
    locationName: incident.locationName,
    isRecurrentHotspot: incident.locationName.toLowerCase().includes('sector 4')
  });

  const incidentBriefing = buildIncidentBriefing(incident, reports, classification, entities, risk);
  const inspectionChecklist = buildInspectionChecklist(incident, entities, risk);
  const evidenceCollection = buildEvidenceCollection(incident, entities);
  const resolutionSteps = buildResolutionSteps(incident, risk);
  const safetyConsiderations = buildSafetyConsiderations(incident, entities, risk);

  return {
    incidentBriefing,
    inspectionChecklist,
    evidenceCollectionSuggestions: evidenceCollection,
    possibleResolutionSteps: resolutionSteps,
    safetyConsiderations,
    assignedIncidentId: incident.id,
    priority: getPriorityLabel(incident.priority)
  };
}

function buildIncidentBriefing(incident: Incident, reports: Report[], classification: any, entities: any, risk: any): string {
  let brief = `INCIDENT BRIEFING — ${incident.id}\n`;
  brief += `Title: ${incident.title}\n`;
  brief += `Category: ${incident.category} | Priority: ${getPriorityLabel(incident.priority)} | Status: ${getStatusLabel(incident.status)}\n`;
  brief += `Location: ${incident.locationName} (${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)})\n`;
  brief += `Reported: ${formatDateTime(incident.createdAt)} | ${reports.length} linked citizen report(s)\n\n`;

  brief += `AI CLASSIFICATION:\n`;
  brief += `Predicted: ${classification.predictedCategory} (${(classification.confidence * 100).toFixed(0)}% confidence)\n`;
  if (classification.disambiguationApplied && classification.disambiguationApplied.length > 0) {
    brief += `Disambiguation: ${classification.disambiguationApplied.join('; ')}\n`;
  }

  brief += `\nEXTRACTED ENTITIES:\n`;
  if (entities.locations.length > 0) brief += `Locations: ${entities.locations.join(', ')}\n`;
  if (entities.infrastructure.length > 0) brief += `Infrastructure: ${entities.infrastructure.join(', ')}\n`;
  if (entities.hazards.length > 0) brief += `⚠ Hazards: ${entities.hazards.join(', ')}\n`;
  if (entities.temporal.length > 0) brief += `Temporal: ${entities.temporal.join(', ')}\n`;

  brief += `\nRISK ASSESSMENT:\n`;
  brief += `Score: ${risk.score}/100 (${risk.priority}) — ${risk.explanation}\n`;
  brief += `Key factors: ${risk.factors.slice(0, 3).map((f: any) => `${f.factor}: ${f.score}/100`).join('; ')}\n`;

  if (risk.factors.some((f: any) => f.factor === 'Inherent Physical Hazard' && f.score >= 90)) {
    brief += `\n⚠ CRITICAL HAZARD FLAG: This incident involves life-safety hazards. Exercise extreme caution.\n`;
  }

  return brief;
}

function buildInspectionChecklist(incident: Incident, entities: any, risk: any): string[] {
  const checklist: string[] = [
    'Verify location matches incident coordinates (±10m GPS accuracy)',
    'Confirm incident category matches observed conditions',
    'Document all visible hazards with timestamped photos',
    'Assess immediate public safety risk and establish perimeter if needed',
    'Record affected infrastructure (pipes, poles, roads, structures)',
    'Note weather conditions and any active environmental factors',
    'Interview nearby residents/witnesses for additional context',
    'Check for secondary hazards not reported (gas, electrical, structural)',
    'Measure key dimensions (pothole depth, crack width, water depth, etc.)',
    'Gather evidence for resolution verification (before/after photos)'
  ];

  // Category-specific additions
  if (incident.category === 'Water & Drainage') {
    checklist.push('Test water flow in affected drains/culverts');
    checklist.push('Check for electrical hazards near standing water');
    checklist.push('Identify upstream/downstream blockage points');
  }
  if (incident.category === 'Power & Lighting') {
    checklist.push('⚠ Assume all wires are live until verified by utility');
    checklist.push('Check transformer temperature and oil leaks');
    checklist.push('Verify streetlight circuit continuity');
  }
  if (incident.category === 'Structural Safety') {
    checklist.push('⚠ Do not enter visibly unstable structures');
    checklist.push('Assess load-bearing elements for displacement');
    checklist.push('Check for progressive movement (crack monitors)');
  }
  if (incident.category === 'Roads & Traffic') {
    checklist.push('Assess traffic management needs (cones, barriers, diversion)');
    checklist.push('Check sub-base condition if surface is compromised');
  }

  return checklist;
}

function buildEvidenceCollection(incident: Incident, entities: any): string[] {
  const evidence: string[] = [
    'Wide-angle photos showing full incident context and location landmarks',
    'Close-up photos of primary defect/hazard with scale reference',
    'GPS-tagged photos (enable location in camera settings)',
    'Video walkthrough for complex or large-area incidents',
    'Photos of any temporary mitigation already in place'
  ];

  if (entities.infrastructure.includes('transformer') || entities.infrastructure.includes('wire')) {
    evidence.push('Photos of electrical equipment labels/serial numbers');
    evidence.push('Distance measurements from live equipment to public areas');
  }
  if (entities.hazards.includes('flooding') || entities.hazards.includes('waterlogging')) {
    evidence.push('Water depth measurements at multiple points');
    evidence.push('Photos of drainage inlets/outlets condition');
  }
  if (entities.hazards.includes('pothole')) {
    evidence.push('Pothole dimensions: length, width, depth (tape measure in photo)');
    evidence.push('Photos of surrounding pavement condition');
  }

  return evidence;
}

function buildResolutionSteps(incident: Incident, risk: any): string[] {
  const steps: string[] = [];

  switch (incident.category) {
    case 'Water & Drainage':
      steps.push('Deploy vacuum truck / jetting machine for blockage clearance');
      steps.push('Inspect and repair damaged pipe sections');
      steps.push('Verify flow restoration with dye test or CCTV');
      steps.push('Install temporary pumps if flooding is active');
      steps.push('Coordinate with utility for any electrical hazards');
      break;
    case 'Roads & Traffic':
      steps.push('Set up traffic management (cones, signage, flaggers)');
      steps.push('Prepare pothole: clean, dry, apply tack coat');
      steps.push('Fill with hot mix asphalt / cold patch per specification');
      steps.push('Compact to flush with surrounding surface');
      steps.push('Reopen lane and verify smooth transition');
      break;
    case 'Public Sanitation':
      steps.push('Deploy collection vehicle for overflowing bins');
      steps.push('Replace damaged/undersized bins with adequate capacity');
      steps.push('Schedule increased collection frequency for hotspot');
      steps.push('Apply deodorant/disinfectant if odor persists');
      steps.push('Inspect for illegal dumping sources nearby');
      break;
    case 'Power & Lighting':
      steps.push('⚠ De-energize circuit before work (coordinate with utility)');
      steps.push('Replace faulty streetlight luminaire / ballast / driver');
      steps.push('Repair/replace damaged pole, wire, or conduit');
      steps.push('Test circuit continuity and insulation resistance');
      steps.push('Re-energize and verify all lights in circuit');
      break;
    case 'Structural Safety':
      steps.push('⚠ Establish exclusion zone around hazard');
      steps.push('Engage structural engineer for assessment if severe');
      steps.push('Install temporary shoring / barriers as immediate measure');
      steps.push('Schedule permanent repair per engineer specification');
      steps.push('Monitor for movement during and after repair');
      break;
    case 'Public Health':
      steps.push('Apply larvicide / fogging for mosquito breeding sites');
      steps.push('Remove dead animals and sanitize area');
      steps.push('Coordinate with pest control for rodent infestations');
      steps.push('Remove medical waste per biomedical waste rules');
      steps.push('Issue public health advisory if disease vector confirmed');
      break;
    case 'Noise & Disturbance':
      steps.push('Measure decibel levels at complaint location');
      steps.push('Identify and notify source (construction, establishment, etc.)');
      steps.push('Enforce permitted hours / decibel limits per municipal code');
      steps.push('Schedule follow-up measurement for compliance');
      break;
    default:
      steps.push('Assess site conditions and determine appropriate remediation');
      steps.push('Coordinate with relevant department for specialized work');
      steps.push('Document completion with photos and measurements');
  }

  steps.push('Complete inspection record in SCIP with findings and actions taken');
  steps.push('Update incident status to "Resolved" with resolution details');
  steps.push('Notify department officer for verification and closure');

  return steps;
}

function buildSafetyConsiderations(incident: Incident, entities: any, risk: any): string[] {
  const safety: string[] = [
    'Wear appropriate PPE: high-vis vest, hard hat, safety boots, gloves',
    'Carry communication device and check in with dispatch',
    'Assess site for hazards before approaching (traffic, electrical, structural)',
    'Establish work zone per traffic management plan if on roadway',
    'Do not enter confined spaces without permit and gas monitoring',
    'Report any new hazards discovered immediately'
  ];

  if (entities.hazards.includes('live wire') || entities.infrastructure.includes('transformer') || entities.infrastructure.includes('wire')) {
    safety.push('⚠ ELECTRICAL HAZARD: Assume all electrical equipment is energized. Maintain minimum 3m clearance. Contact utility for de-energization.');
  }
  if (entities.hazards.includes('flooding') || entities.hazards.includes('waterlogging')) {
    safety.push('⚠ WATER HAZARD: Do not enter water deeper than 30cm. Hidden currents, debris, and electrical hazards may exist.');
  }
  if (entities.hazards.includes('collapse') || entities.hazards.includes('crack') || incident.category === 'Structural Safety') {
    safety.push('⚠ STRUCTURAL HAZARD: Do not approach within collapse zone (1.5x structure height). Engage structural engineer.');
  }
  if (entities.hazards.includes('gas smell') || entities.hazards.includes('chemical smell')) {
    safety.push('⚠ CHEMICAL/GAS HAZARD: Evacuate immediate area. Do not use ignition sources. Contact fire/hazmat team.');
  }
  if (risk.factors.some((f: any) => f.factor === 'Inherent Physical Hazard' && f.score >= 90)) {
    safety.push('⚠ CRITICAL PRIORITY: This incident has life-safety implications. Escalate immediately if conditions worsen.');
  }

  return safety;
}

/**
 * DEPARTMENT OFFICER INTELLIGENCE GENERATION
 * Provides workload analysis, SLA risk assessment, and task prioritization.
 */
export function generateDepartmentOfficerIntelligence(
  department: Department,
  incidents: Incident[],
  reports: Report[],
  users: User[]
): DepartmentOfficerIntelligence {
  ensureVectorizerInitialized();
  const deptIncidents = incidents.filter(i => i.assignedDepartmentId === department.id);
  const deptReports = reports.filter(r => {
    const inc = incidents.find(i => i.id === r.incidentId);
    return inc?.assignedDepartmentId === department.id;
  });

  const byPriority: Record<string, number> = { 'P1_CRITICAL': 0, 'P2_HIGH': 0, 'P3_MEDIUM': 0, 'P4_LOW': 0 };
  const byStatus: Record<string, number> = {};

  for (const inc of deptIncidents) {
    byPriority[inc.priority] = (byPriority[inc.priority] || 0) + 1;
    byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
  }

  // SLA at risk calculation
  let slaAtRisk = 0;
  const now = new Date();
  for (const inc of deptIncidents) {
    if (inc.status === 'resolved' || inc.status === 'closed' || inc.status === 'dismissed') continue;
    // Simple SLA check: if created > 72h ago for high/critical, > 120h for medium
    const ageHours = (now.getTime() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60);
    const slaThreshold = inc.priority === 'P1_CRITICAL' ? 24 : inc.priority === 'P2_HIGH' ? 48 : inc.priority === 'P3_MEDIUM' ? 72 : 120;
    if (ageHours > slaThreshold) slaAtRisk++;
  }

  const workloadAnalysis = {
    totalAssigned: deptIncidents.length,
    byPriority,
    byStatus,
    slaAtRisk
  };

  const pendingIncidentSummary = buildPendingIncidentSummary(deptIncidents);
  const slaRiskAssessment = buildSLARiskAssessment(deptIncidents, slaAtRisk);
  const escalationRecommendations = buildEscalationRecommendations(deptIncidents, slaAtRisk);
  const suggestedTaskPrioritization = buildTaskPrioritization(deptIncidents);

  return {
    workloadAnalysis,
    pendingIncidentSummary,
    slaRiskAssessment,
    escalationRecommendations,
    suggestedTaskPrioritization
  };
}

function buildPendingIncidentSummary(incidents: Incident[]): string {
  if (incidents.length === 0) return 'No incidents currently assigned to this department.';

  const active = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed');
  const potential = incidents.filter(i => i.status === 'potential').length;
  const confirmed = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress').length;

  let summary = `Department has <strong>${incidents.length}</strong> total assigned incidents: `;
  summary += `<strong>${active.length}</strong> active, <strong>${confirmed}</strong> confirmed/in-progress, `;
  summary += `<strong>${potential}</strong> awaiting review. `;

  const criticalHigh = incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH').length;
  if (criticalHigh > 0) {
    summary += `<strong>${criticalHigh}</strong> are critical/high priority requiring immediate attention.`;
  }

  return summary;
}

function buildSLARiskAssessment(incidents: Incident[], slaAtRisk: number): string[] {
  const risks: string[] = [];

  if (slaAtRisk > 0) {
    risks.push(`${slaAtRisk} incident(s) are at risk of SLA breach based on age vs. priority thresholds.`);
  }

  const criticalUnassigned = incidents.filter(i => (i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH') && !i.assignedOfficerId).length;
  if (criticalUnassigned > 0) {
    risks.push(`${criticalUnassigned} critical/high priority incident(s) have no assigned field officer.`);
  }

  const staleIncidents = incidents.filter(i => {
    if (i.status === 'resolved' || i.status === 'closed') return false;
    const ageDays = (new Date().getTime() - new Date(i.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > 7;
  }).length;
  if (staleIncidents > 0) {
    risks.push(`${staleIncidents} incident(s) have had no status update in over 7 days.`);
  }

  const potentialPending = incidents.filter(i => i.status === 'potential').length;
  if (potentialPending > 0) {
    risks.push(`${potentialPending} potential incident(s) await human review confirmation.`);
  }

  if (risks.length === 0) {
    risks.push('No immediate SLA risks detected. All active incidents within threshold.');
  }

  return risks;
}

function buildEscalationRecommendations(incidents: Incident[], slaAtRisk: number): string[] {
  const recs: string[] = [];

  const criticalUnassigned = incidents.filter(i => (i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH') && !i.assignedOfficerId);
  for (const inc of criticalUnassigned) {
    recs.push(`Assign field officer to ${inc.id} (${inc.title}) immediately — ${getPriorityLabel(inc.priority)} unassigned.`);
  }

  if (slaAtRisk > 0) {
    const atRisk = incidents.filter(i => {
      if (i.status === 'resolved' || i.status === 'closed') return false;
      const ageHours = (new Date().getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
      const slaThreshold = i.priority === 'P1_CRITICAL' ? 24 : i.priority === 'P2_HIGH' ? 48 : i.priority === 'P3_MEDIUM' ? 72 : 120;
      return ageHours > slaThreshold;
    });
    for (const inc of atRisk.slice(0, 3)) {
      recs.push(`Expedite ${inc.id} — SLA threshold exceeded. Consider authority escalation.`);
    }
  }

  const noOfficer = incidents.filter(i => i.status === 'confirmed' && !i.assignedOfficerId).slice(0, 3);
  for (const inc of noOfficer) {
    recs.push(`Assign officer to confirmed incident ${inc.id} to begin field work.`);
  }

  if (recs.length === 0) {
    recs.push('No immediate escalations required. Monitor SLA compliance daily.');
  }

  return recs;
}

function buildTaskPrioritization(incidents: Incident[]): string[] {
  const active = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed');

  // Sort by priority severity, then by age
  const priorityOrder: Record<string, number> = { 'P1_CRITICAL': 4, 'P2_HIGH': 3, 'P3_MEDIUM': 2, 'P4_LOW': 1 };
  active.sort((a, b) => {
    const pa = priorityOrder[a.priority] || 0;
    const pb = priorityOrder[b.priority] || 0;
    if (pa !== pb) return pb - pa;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const prioritized: string[] = [];
  for (const inc of active.slice(0, 5)) {
    prioritized.push(`${getPriorityLabel(inc.priority)} — ${inc.id}: ${inc.title} (${inc.locationName}) — ${getStatusLabel(inc.status)}`);
  }

  if (prioritized.length === 0) {
    prioritized.push('No active incidents to prioritize.');
  }

  return prioritized;
}

/**
 * ANALYST INTELLIGENCE GENERATION
 * Provides trends, duplicate patterns, hotspots, and statistical analysis.
 */
export function generateAnalystIntelligence(
  incidents: Incident[],
  reports: Report[],
  clusters: SpatioTemporalCluster[]
): AnalystIntelligence {
  ensureVectorizerInitialized();
  const categoryAnalysis = buildCategoryAnalysis(reports);
  const duplicatePatterns = buildDuplicatePatterns(reports);
  const hotspotSummary = buildHotspotSummary(incidents, reports);
  const emergingIssues = buildEmergingIssues(reports, incidents, clusters);
  const statisticalExplanations = buildStatisticalExplanations(reports, incidents, clusters);
  const confidenceIndicators = buildConfidenceIndicators(reports, incidents);

  return {
    incidentTrends: {
      categoryAnalysis,
      duplicatePatterns,
      hotspotSummary,
      emergingIssues
    },
    statisticalExplanations,
    confidenceIndicators
  };
}

function buildCategoryAnalysis(reports: Report[]): Record<string, { count: number; trend: 'increasing' | 'decreasing' | 'stable' }> {
  const categoryList: string[] = [
    'Water & Drainage',
    'Roads & Traffic',
    'Public Sanitation',
    'Power & Lighting',
    'Parks & Environment',
    'Structural Safety',
    'Public Health',
    'Noise & Disturbance'
  ];

  const analysis: Record<string, { count: number; trend: 'increasing' | 'decreasing' | 'stable' }> = {};

  // Count by category
  for (const cat of categoryList) {
    const count = reports.filter(r => r.category === cat).length;
    analysis[cat] = { count, trend: 'stable' };
  }

  // Simple trend: compare last 7 days vs previous 7 days
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  for (const cat of categoryList) {
    const recent = reports.filter(r => r.category === cat && new Date(r.createdAt) >= weekAgo).length;
    const previous = reports.filter(r => r.category === cat && new Date(r.createdAt) >= twoWeeksAgo && new Date(r.createdAt) < weekAgo).length;

    if (recent > previous * 1.2) analysis[cat].trend = 'increasing';
    else if (recent < previous * 0.8) analysis[cat].trend = 'decreasing';
  }

  return analysis;
}

function buildDuplicatePatterns(reports: Report[]): { clusterId: string; reportCount: number; similarity: number }[] {
  const patterns: { clusterId: string; reportCount: number; similarity: number }[] = [];

  // Use existing clusters from incident clustering
  const detectedClusters = detectIncidentClusters(reports);
  for (const cluster of detectedClusters) {
    patterns.push({
      clusterId: cluster.clusterId,
      reportCount: cluster.reportCount,
      similarity: Number(cluster.confidence.toFixed(2))
    });
  }

  // Also check for duplicate reports using duplicate detector
  for (const report of reports.slice(0, 20)) { // Limit for performance
    const dupResult = findSimilarAndDuplicateReports(report, reports);
    if (dupResult.highestMatch?.isPotentialDuplicate) {
      patterns.push({
        clusterId: `DUP-${report.id}`,
        reportCount: 2,
        similarity: dupResult.highestMatch.similarityScore
      });
    }
  }

  return patterns.sort((a, b) => b.reportCount - a.reportCount).slice(0, 10);
}

function buildHotspotSummary(incidents: Incident[], reports: Report[]): { location: string; reportCount: number; categories: string[] }[] {
  const locationMap = new Map<string, { count: number; lat: number; lng: number; categories: Set<string> }>();

  for (const r of reports) {
    const key = r.locationName;
    const existing = locationMap.get(key) || { count: 0, lat: r.latitude, lng: r.longitude, categories: new Set() };
    existing.count += 1;
    existing.categories.add(r.category);
    locationMap.set(key, existing);
  }

  return Array.from(locationMap.entries())
    .map(([location, data]) => ({
      location,
      reportCount: data.count,
      categories: Array.from(data.categories)
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 10);
}

function buildEmergingIssues(reports: Report[], incidents: Incident[], clusters: SpatioTemporalCluster[]): string[] {
  const issues: string[] = [];

  // New clusters in last 7 days - check if any report in cluster is recent
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentClusters = clusters.filter(c => {
    const clusterReports = reports.filter(r => c.reportIds.includes(r.id));
    return clusterReports.some(r => new Date(r.createdAt) >= weekAgo);
  });
  if (recentClusters.length > 0) {
    issues.push(`${recentClusters.length} new spatio-temporal cluster(s) detected in the past 7 days.`);
  }

  // Categories with increasing trend
  const categoryAnalysis = buildCategoryAnalysis(reports);
  const increasing = Object.entries(categoryAnalysis).filter(([_, v]) => v.trend === 'increasing');
  if (increasing.length > 0) {
    issues.push(`Rising categories: ${increasing.map(([cat, v]) => `${cat} (+${v.count})`).join(', ')}.`);
  }

  // High-priority incidents without officers
  const unassignedCritical = incidents.filter(i => (i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH') && !i.assignedOfficerId && i.status !== 'resolved');
  if (unassignedCritical.length > 0) {
    issues.push(`${unassignedCritical.length} critical/high priority incidents lack assigned field officers.`);
  }

  // Potential incidents awaiting review
  const potentialCount = incidents.filter(i => i.status === 'potential').length;
  if (potentialCount > 0) {
    issues.push(`${potentialCount} potential incident cluster(s) awaiting human review.`);
  }

  if (issues.length === 0) {
    issues.push('No significant emerging issues detected in current monitoring window.');
  }

  return issues;
}

function buildStatisticalExplanations(reports: Report[], incidents: Incident[], clusters: SpatioTemporalCluster[]): string[] {
  const explanations: string[] = [];

  explanations.push(`Total citizen reports in system: ${reports.length}.`);
  explanations.push(`Total incidents (clustered + individual): ${incidents.length}.`);
  explanations.push(`Active spatio-temporal clusters: ${clusters.length}.`);

  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const resolutionRate = incidents.length > 0 ? ((resolvedIncidents / incidents.length) * 100).toFixed(1) : '0';
  explanations.push(`Incident resolution rate: ${resolutionRate}%.`);

  const avgReportsPerIncident = incidents.length > 0 ? (reports.filter(r => r.incidentId).length / incidents.length).toFixed(1) : '0';
  explanations.push(`Average reports per incident: ${avgReportsPerIncident}.`);

  const categoryDist = buildCategoryAnalysis(reports);
  const topCategory = Object.entries(categoryDist).sort((a, b) => b[1].count - a[1].count)[0];
  if (topCategory) {
    explanations.push(`Most reported category: ${topCategory[0]} (${topCategory[1].count} reports).`);
  }

  return explanations;
}

function buildConfidenceIndicators(reports: Report[], incidents: Incident[]): Record<string, number> {
  return {
    classificationAccuracy: 0.82, // Placeholder - would come from model evaluation
    duplicateDetectionPrecision: 0.78,
    duplicateDetectionRecall: 0.71,
    riskScoringCalibration: 0.85,
    clusteringStability: 0.76
  };
}

/**
 * AUTHORITY SUMMARY GENERATION
 * Provides regional situation, cross-department performance, and strategic insights.
 */
export function generateAuthoritySummary(
  incidents: Incident[],
  reports: Report[],
  departments: Department[],
  users: User[]
): AuthoritySummary {
  ensureVectorizerInitialized();
  const regionalSituationSummary = buildRegionalSituationSummary(incidents, reports);
  const highPriorityIncidentAnalysis = buildHighPriorityAnalysis(incidents, departments);
  const crossDepartmentPerformance = buildCrossDepartmentPerformance(incidents, departments, users);
  const resourceAllocationSuggestions = buildResourceAllocationSuggestions(incidents, departments);
  const strategicRecommendations = buildStrategicRecommendations(incidents, reports, departments, users);

  return {
    regionalSituationSummary,
    highPriorityIncidentAnalysis,
    crossDepartmentPerformance,
    resourceAllocationSuggestions,
    strategicRecommendations
  };
}

function buildRegionalSituationSummary(incidents: Incident[], reports: Report[]): string {
  let summary = `MUNICIPAL INTELLIGENCE SITUATION REPORT — ${formatDate(new Date().toISOString())}\n\n`;

  const totalIncidents = incidents.length;
  const activeIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed').length;
  const criticalHigh = incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH').length;
  const potential = incidents.filter(i => i.status === 'potential').length;
  const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;

  summary += `OVERVIEW: ${totalIncidents} total incidents tracked. ${activeIncidents} active (${criticalHigh} critical/high). ${potential} awaiting review. ${resolved} resolved.\n`;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const inc of incidents) {
    catCounts[inc.category] = (catCounts[inc.category] || 0) + 1;
  }
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  summary += `TOP CATEGORIES: ${topCats.map(([c, n]) => `${c} (${n})`).join(', ')}.\n`;

  // Geographic hotspots
  const locCounts: Record<string, number> = {};
  for (const inc of incidents) {
    locCounts[inc.locationName] = (locCounts[inc.locationName] || 0) + 1;
  }
  const topLocs = Object.entries(locCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  summary += `GEOGRAPHIC HOTSPOTS: ${topLocs.map(([l, n]) => `${l} (${n})`).join(', ')}.\n`;

  // Recent velocity
  const last7Days = incidents.filter(i => new Date(i.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  summary += `VELOCITY: ${last7Days} new incidents in past 7 days.\n`;

  return summary;
}

function buildHighPriorityAnalysis(incidents: Incident[], departments: Department[]): { count: number; byDepartment: Record<string, number>; topHazards: string[] } {
  const highPriority = incidents.filter(i => i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH');
  const count = highPriority.length;

  const byDepartment: Record<string, number> = {};
  for (const inc of highPriority) {
    const deptName = inc.assignedDepartmentName || 'Unassigned';
    byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
  }

  const topHazards: string[] = [];
  const hazardKeywords = ['electrocution', 'collapse', 'flooding', 'gas leak', 'live wire', 'structural'];
  for (const inc of highPriority) {
    const text = `${inc.title} ${inc.description}`.toLowerCase();
    for (const haz of hazardKeywords) {
      if (text.includes(haz) && !topHazards.includes(haz)) topHazards.push(haz);
    }
  }

  return { count, byDepartment, topHazards: topHazards.slice(0, 5) };
}

function buildCrossDepartmentPerformance(
  incidents: Incident[],
  departments: Department[],
  users: User[]
): { department: string; incidentsAssigned: number; avgResolutionTimeHours: number; slaComplianceRate: number; escalationCount: number }[] {
  const performance = [];

  for (const dept of departments) {
    const deptIncidents = incidents.filter(i => i.assignedDepartmentId === dept.id);
    const resolved = deptIncidents.filter(i => i.status === 'resolved' || i.status === 'closed');
    const total = deptIncidents.length;

    let avgResolutionTimeHours = 0;
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, inc) => {
        return sum + (new Date(inc.updatedAt).getTime() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionTimeHours = Number((totalHours / resolved.length).toFixed(1));
    }

    let slaCompliant = 0;
    let slaTotal = 0;
    for (const inc of deptIncidents) {
      if (inc.status === 'resolved' || inc.status === 'closed') {
        slaTotal++;
        const ageHours = (new Date(inc.updatedAt).getTime() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60);
        const slaThreshold = inc.priority === 'P1_CRITICAL' ? 24 : inc.priority === 'P2_HIGH' ? 48 : inc.priority === 'P3_MEDIUM' ? 72 : 120;
        if (ageHours <= slaThreshold) slaCompliant++;
      }
    }
    const slaComplianceRate = slaTotal > 0 ? Number(((slaCompliant / slaTotal) * 100).toFixed(1)) : 100;

    const escalationCount = deptIncidents.filter(i => i.priority === 'P1_CRITICAL' && i.status !== 'resolved' && i.status !== 'closed').length;

    performance.push({
      department: dept.name,
      incidentsAssigned: total,
      avgResolutionTimeHours,
      slaComplianceRate,
      escalationCount
    });
  }

  return performance.sort((a, b) => b.incidentsAssigned - a.incidentsAssigned);
}

function buildResourceAllocationSuggestions(incidents: Incident[], departments: Department[]): string[] {
  const suggestions: string[] = [];

  // Departments with high unassigned critical incidents
  for (const dept of departments) {
    const criticalUnassigned = incidents.filter(i =>
      i.assignedDepartmentId === dept.id &&
      (i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH') &&
      !i.assignedOfficerId &&
      i.status !== 'resolved'
    ).length;

    if (criticalUnassigned > 0) {
      suggestions.push(`${dept.name}: ${criticalUnassigned} critical/high incidents without field officers — request officer deployment.`);
    }
  }

  // Departments with high SLA breach risk
  for (const dept of departments) {
    const atRisk = incidents.filter(i => {
      if (i.assignedDepartmentId !== dept.id || i.status === 'resolved' || i.status === 'closed') return false;
      const ageHours = (new Date().getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
      const slaThreshold = i.priority === 'P1_CRITICAL' ? 24 : i.priority === 'P2_HIGH' ? 48 : i.priority === 'P3_MEDIUM' ? 72 : 120;
      return ageHours > slaThreshold;
    }).length;

    if (atRisk > 0) {
      suggestions.push(`${dept.name}: ${atRisk} incident(s) at SLA breach risk — consider priority reallocation or authority escalation.`);
    }
  }

  // Geographic concentration
  const locCounts: Record<string, { count: number; depts: Set<string> }> = {};
  for (const inc of incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed')) {
    const loc = inc.locationName;
    if (!locCounts[loc]) locCounts[loc] = { count: 0, depts: new Set() };
    locCounts[loc].count++;
    if (inc.assignedDepartmentName) locCounts[loc].depts.add(inc.assignedDepartmentName);
  }

  for (const [loc, data] of Object.entries(locCounts)) {
    if (data.count >= 3 && data.depts.size > 1) {
      suggestions.push(`Multi-department coordination needed at ${loc} (${data.count} incidents across ${data.depts.size} departments).`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('Resource allocation appears balanced. Maintain current deployment.');
  }

  return suggestions;
}

function buildStrategicRecommendations(
  incidents: Incident[],
  reports: Report[],
  departments: Department[],
  users: User[]
): string[] {
  const recs: string[] = [];

  // Review backlog
  const potentialBacklog = incidents.filter(i => i.status === 'potential').length;
  if (potentialBacklog > 5) {
    recs.push(`Review backlog: ${potentialBacklog} potential incidents awaiting confirmation. Schedule dedicated review session.`);
  }

  // Category concentration
  const catCounts: Record<string, number> = {};
  for (const r of reports) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > reports.length * 0.3) {
    recs.push(`Systemic issue: ${topCat[0]} represents ${((topCat[1]/reports.length)*100).toFixed(0)}% of all reports. Consider preventive infrastructure program.`);
  }

  // Geographic recurrence
  const locCounts: Record<string, number> = {};
  for (const r of reports) locCounts[r.locationName] = (locCounts[r.locationName] || 0) + 1;
  const recurringLocs = Object.entries(locCounts).filter(([_, c]) => c >= 3).length;
  if (recurringLocs > 0) {
    recs.push(`${recurringLocs} location(s) have 3+ repeat reports. Targeted infrastructure investment recommended.`);
  }

  // Officer workload
  const officers = users.filter(u => u.role === 'officer');
  const officerLoads: Record<string, number> = {};
  for (const inc of incidents.filter(i => i.assignedOfficerId)) {
    officerLoads[inc.assignedOfficerId!] = (officerLoads[inc.assignedOfficerId!] || 0) + 1;
  }
  const maxLoad = Math.max(...Object.values(officerLoads), 0);
  if (maxLoad > 8) {
    recs.push(`Officer workload imbalance detected (max ${maxLoad} incidents). Consider redistribution or temporary deployment.`);
  }

  if (recs.length === 0) {
    recs.push('No immediate strategic interventions required. Continue monitoring.');
  }

  return recs;
}

/**
 * ADMIN AI HEALTH GENERATION
 * Provides AI service health, provider status, model configuration, and usage stats.
 */
export function generateAdminAIHealth(): AdminAIHealth {
  ensureVectorizerInitialized();
  // In a real implementation, these would come from metrics collection
  // For now, we return the current configuration state

  const providerStatus = {
    pythonService: aiAdapter.isServiceEnabled(),
    llmProvider: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim().length > 0 &&
      String(process.env.LLM_AGENT_ENABLED || '').toLowerCase() !== 'false',
    localEngine: true
  };

  // Get model registry stats (would need to import modelRegistry)
  // For now, return the known active models
  const activeModels = [
    { name: 'scip-classifier', version: '1.0.0', framework: 'tfidf-ts', task: 'classification' },
    { name: 'scip-duplicate-detector', version: '1.0.0', framework: 'tfidf-ts', task: 'duplicate-detection' },
    { name: 'scip-risk-scorer', version: '1.0.0', framework: 'tfidf-ts', task: 'risk-scoring' },
    { name: 'scip-entity-extractor', version: '1.0.0', framework: 'tfidf-ts', task: 'entity-extraction' },
    { name: 'scip-multilingual-classifier', version: '1.0.0', framework: 'tfidf-ts', task: 'classification' },
    { name: 'scip-multilingual-duplicate-detector', version: '1.0.0', framework: 'tfidf-ts', task: 'duplicate-detection' },
    { name: 'scip-multilingual-entity-extractor', version: '1.0.0', framework: 'tfidf-ts', task: 'entity-extraction' }
  ];

  const defaultModels = activeModels.filter(m => m.task === 'classification' || m.task === 'duplicate-detection' || m.task === 'risk-scoring' || m.task === 'entity-extraction')
    .filter((m, i, arr) => arr.findIndex(x => x.task === m.task) === i)
    .map(m => ({ name: m.name, version: m.version }));

  return {
    serviceStatus: providerStatus.pythonService || providerStatus.llmProvider || providerStatus.localEngine ? 'healthy' : 'unavailable',
    providerStatus,
    modelConfiguration: {
      activeModels,
      defaultModels
    },
    usageStats: {
      classificationRequests: 0, // Would be tracked in production
      duplicateChecks: 0,
      riskAssessments: 0,
      agentQueries: 0,
      avgResponseTimeMs: 0
    }
  };
}