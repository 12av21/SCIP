// SCIP AI/ML Foundation - Explainable Priority & Risk Scoring Engine
// Calculates multidimensional risk scores [0-100] with explicit transparent factors.
// Shows WHY a priority/risk value was generated.
//
// Decision logic for critical hazards:
// - Explicitly critical physical hazards (live wire, electrocution, gas leak,
//   structural collapse) carry a minimum floor of P2_HIGH (score >= 60).
// - They cannot be silently downgraded to P3/P4 by low density/velocity factors.
// - Declared urgency (citizen-stated) and inferred urgency (keyword-detected)
//   are tracked separately; the higher of the two governs the severity factor.
// - Human officers can always override via incident review/resolution workflows.

import { Report, IncidentPriority, RiskFactor, RiskScore, UrgencyLevel } from '../types/scip';

interface RiskEvaluationInput {
  entityType: 'report' | 'incident' | 'cluster';
  entityId: string;
  reports: Report[];
  locationName: string;
  isRecurrentHotspot?: boolean;
  declaredUrgency?: UrgencyLevel;
  inferredUrgencyFromKeywords?: UrgencyLevel;
}

export interface RiskScoreExplanation {
  criticalFloorApplied: boolean;
  declaredUrgency: UrgencyLevel | null;
  inferredUrgency: UrgencyLevel | null;
  fieldInferredUrgency: UrgencyLevel | null;
  governingUrgency: UrgencyLevel;
  factorBreakdown: Array<{ factor: string; weight: number; score: number; weightedContribution: number }>;
}

export function computeExplainableRisk(input: RiskEvaluationInput): RiskScore {
  const { entityType, entityId, reports, locationName, isRecurrentHotspot, declaredUrgency, inferredUrgencyFromKeywords } = input;
  const count = reports.length;

  const factors: RiskFactor[] = [];

  // ------------------------------------------------------------------
  // Factor 1: Inherent Severity & Hazard (weight 40%, increased from 30%)
  // ------------------------------------------------------------------
  let severityScore = 20;
  const hasCritical = reports.some(r => r.urgency === 'critical');
  const hasHigh = reports.some(r => r.urgency === 'high');
  const hasMedium = reports.some(r => r.urgency === 'medium');

  // Declared urgency (citizen-stated), keyword-inferred urgency, and
  // report-field urgency are tracked independently. The highest governs.
  let declaredUrgencyResolved: UrgencyLevel | null = declaredUrgency ?? null;
  let inferredUrgencyResolved: UrgencyLevel | null = inferredUrgencyFromKeywords ?? null;
  let fieldInferredUrgencyResolved: UrgencyLevel | null = null;

  if (hasCritical) {
    fieldInferredUrgencyResolved = 'critical';
    severityScore = 95;
  } else if (hasHigh) {
    fieldInferredUrgencyResolved = 'high';
    severityScore = 75;
  } else if (hasMedium) {
    fieldInferredUrgencyResolved = 'medium';
    severityScore = 45;
  }

  // Governing urgency: the highest of declared, keyword-inferred, and field-inferred
  const urgencyRank: Record<UrgencyLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const candidates: UrgencyLevel[] = [
    declaredUrgencyResolved,
    inferredUrgencyResolved,
    fieldInferredUrgencyResolved
  ].filter((u): u is UrgencyLevel => u !== null);
  const governingUrgency: UrgencyLevel = candidates.length > 0
    ? candidates.reduce((best, current) => urgencyRank[current] > urgencyRank[best] ? current : best, candidates[0])
    : 'low';

  if (governingUrgency === 'critical' && severityScore < 95) {
    severityScore = 95;
  }

  // Category hazard multiplier
  const categories = reports.map(r => r.category);
  if (categories.includes('Power & Lighting') || categories.includes('Structural Safety')) {
    severityScore = Math.min(100, severityScore + 10);
  }

  factors.push({
    factor: 'Inherent Physical Hazard',
    weight: 0.40,
    score: severityScore,
    description: governingUrgency === 'critical'
      ? 'Critical urgency keywords detected (electrocution risk / structural hazard / major flood)'
      : governingUrgency === 'high'
        ? 'High severity conditions reported impacting public safety'
        : 'Standard municipal observation without immediate structural danger'
  });

  // ------------------------------------------------------------------
  // Factor 2: Report Density / Volume (weight 25%)
  // ------------------------------------------------------------------
  let densityScore = 15;
  if (count >= 5) {
    densityScore = 95;
  } else if (count >= 3) {
    densityScore = 75;
  } else if (count >= 2) {
    densityScore = 50;
  }

  factors.push({
    factor: 'Community Report Density',
    weight: 0.25,
    score: densityScore,
    description: `${count} independent citizen report(s) clustered in immediate perimeter`
  });

  // ------------------------------------------------------------------
  // Factor 3: Infrastructure / Public Impact (weight 20%)
  // ------------------------------------------------------------------
  const lowerLoc = locationName.toLowerCase();
  const allText = reports.map(r => `${r.title} ${r.description}`).join(' ').toLowerCase();

  let impactScore = 30;
  let impactReason = 'Standard local residential street or public space';

  if (
    lowerLoc.includes('hospital') ||
    lowerLoc.includes('school') ||
    lowerLoc.includes('station') ||
    lowerLoc.includes('metro') ||
    allText.includes('ambulance') ||
    allText.includes('hospital')
  ) {
    impactScore = 95;
    impactReason = 'Directly affects emergency access corridor, transit station, or medical institution';
  } else if (
    lowerLoc.includes('market') ||
    lowerLoc.includes('boulevard') ||
    lowerLoc.includes('junction') ||
    lowerLoc.includes('plaza') ||
    allText.includes('traffic jam') ||
    allText.includes('flooded road')
  ) {
    impactScore = 75;
    impactReason = 'Located on primary commercial artery or heavy transit intersection';
  }

  factors.push({
    factor: 'Public Infrastructure Impact',
    weight: 0.20,
    score: impactScore,
    description: impactReason
  });

  // ------------------------------------------------------------------
  // Factor 4: Temporal Escalation Rate (weight 10%, reduced from 15%)
  // ------------------------------------------------------------------
  let velocityScore = 20;
  let velocityDesc = 'Steady or single occurrence timeframe';

  if (reports.length >= 2) {
    const dates = reports.map(r => new Date(r.createdAt).getTime());
    const spanHours = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60);

    if (spanHours <= 3) {
      velocityScore = 90;
      velocityDesc = `Rapid surge: ${reports.length} incoming reports submitted within ${spanHours.toFixed(1)} hours`;
    } else if (spanHours <= 12) {
      velocityScore = 65;
      velocityDesc = `Escalating reports within past 12 hours`;
    }
  }

  factors.push({
    factor: 'Temporal Escalation Velocity',
    weight: 0.10,
    score: velocityScore,
    description: velocityDesc
  });

  // ------------------------------------------------------------------
  // Factor 5: Historical Recurrence (weight 5%, reduced from 10%)
  // ------------------------------------------------------------------
  const recurrenceScore = isRecurrentHotspot ? 85 : 20;
  factors.push({
    factor: 'Historical Area Recurrence',
    weight: 0.05,
    score: recurrenceScore,
    description: isRecurrentHotspot
      ? 'Area identified as recurring municipal issue hotspot (Sector 4 / Low-lying zone)'
      : 'First documented incident occurrence in recent monitoring window'
  });

  // Compute final weighted composite risk score [0 - 100]
  let compositeScore = 0;
  for (const f of factors) {
    compositeScore += f.score * f.weight;
  }

  // Critical floor: explicitly critical physical hazards (live wire, electrocution,
  // gas leak, structural collapse) cannot be downgraded below P2_HIGH (60), regardless
  // of low report volume, sparse location, or a low citizen-declared urgency.
  const criticalFloorApplied = governingUrgency === 'critical';
  let finalScore = Math.min(100, Math.max(10, Math.round(compositeScore)));
  if (criticalFloorApplied && finalScore < 60) {
    finalScore = 60;
  }

  // Derive Priority
  let priority: IncidentPriority = 'P4_LOW';
  if (finalScore >= 80) {
    priority = 'P1_CRITICAL';
  } else if (finalScore >= 60) {
    priority = 'P2_HIGH';
  } else if (finalScore >= 40) {
    priority = 'P3_MEDIUM';
  }

  const topFactor = [...factors].sort((a, b) => b.score - a.score)[0];
  const explanation = `Priority level ${priority} derived from composite risk score ${finalScore}/100. Primary driver: ${topFactor.factor} (${topFactor.score}/100) — ${topFactor.description}.${criticalFloorApplied ? ` Critical-hazard floor applied (governing urgency: ${governingUrgency}); declared=${declaredUrgencyResolved ?? 'none'}, keyword-inferred=${inferredUrgencyResolved ?? 'none'}, field-inferred=${fieldInferredUrgencyResolved ?? 'none'}.` : ''}`;

  return {
    id: `RISK-${entityId}`,
    entityType,
    entityId,
    score: finalScore,
    priority,
    factors,
    explanation,
    computedAt: new Date().toISOString()
  };
}
