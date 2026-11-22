// SCIP AI/ML Foundation - Duplicate Report Detection Engine
// Detects whether a report is an observation of an already reported municipal incident

import { Report, SimilarReportMatch } from '../types/scip';
import { globalVectorizer } from './tfidf';

/**
 * Calculate Great-Circle Distance (Haversine Formula) between two coordinates in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculate time difference in hours between two ISO timestamp strings.
 */
export function calculateTimeDeltaHours(timeA: string, timeB: string): number {
  const dateA = new Date(timeA).getTime();
  const dateB = new Date(timeB).getTime();
  const diffMs = Math.abs(dateA - dateB);
  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
}

/**
 * Find similar reports and calculate duplicate probabilities for a given target report.
 *
 * Single unified scoring formula (documented):
 *
 *   dupScore = (textSim * 0.50) + (spatialFactor * 0.35) + (temporalFactor * 0.15)
 *   dupScore = dupScore * categoryFactor
 *
 *   spatialFactor   = max(0, 1 - distanceMeters / 300)   // 1.0 at 0m, 0 at 300m
 *   temporalFactor  = max(0, 1 - timeDeltaHours / 48)    // 1.0 at 0h, 0 at 48h
 *   categoryFactor  = 1.0 if same category, 0.4 if different
 *
 * Duplicate threshold: dupScore >= 0.70 OR (distance <= 50m AND time <= 12h AND textSim >= 0.55)
 *
 * The same dupScore is used for both isPotentialDuplicate and duplicateProbability,
 * so they always agree. duplicateProbability is a clamped rescaling of dupScore into [0, 0.95].
 */
export function findSimilarAndDuplicateReports(
  targetReport: Report,
  allReports: Report[],
  thresholdSimilarity: number = 0.30
): {
  topSimilar: SimilarReportMatch[];
  duplicateProbability: number;
  highestMatch?: SimilarReportMatch;
  evidence: string[];
} {
  const targetText = `${targetReport.title} ${targetReport.description} ${targetReport.locationName}`;
  const targetVec = globalVectorizer.transform(targetText, targetReport.id);

  const matches: SimilarReportMatch[] = [];

  for (const report of allReports) {
    if (report.id === targetReport.id) continue;

    const reportText = `${report.title} ${report.description} ${report.locationName}`;
    const reportVec = globalVectorizer.transform(reportText, report.id);

    const textSim = globalVectorizer.cosineSimilarity(targetVec, reportVec);
    const distanceMeters = calculateHaversineDistance(
      targetReport.latitude,
      targetReport.longitude,
      report.latitude,
      report.longitude
    );
    const timeDeltaHours = calculateTimeDeltaHours(targetReport.createdAt, report.createdAt);
    const matchingTerms = globalVectorizer.getMatchingTerms(targetVec, reportVec, 4);

    // Spatial factor: 1.0 at 0m, drops linearly to 0 at 300m
    const spatialFactor = Math.max(0, 1 - distanceMeters / 300);
    // Temporal factor: 1.0 at 0h, drops linearly to 0 at 48h
    const temporalFactor = Math.max(0, 1 - timeDeltaHours / 48);

    // Category match bonus
    const categoryFactor = targetReport.category === report.category ? 1.0 : 0.4;

    // Combined duplicate score (unified formula)
    let dupScore = (textSim * 0.50) + (spatialFactor * 0.35) + (temporalFactor * 0.15);
    dupScore = dupScore * categoryFactor;

    const isDuplicate = dupScore >= 0.70 || (distanceMeters <= 50 && timeDeltaHours <= 12 && textSim >= 0.55);

    if (textSim >= thresholdSimilarity || distanceMeters <= 200) {
      matches.push({
        reportId: report.id,
        reportTitle: report.title,
        category: report.category,
        similarityScore: Number(textSim.toFixed(3)),
        distanceMeters,
        timeDeltaHours,
        matchingTerms,
        isPotentialDuplicate: isDuplicate,
        duplicateScore: Number(dupScore.toFixed(4))
      });
    }
  }

  // Sort by highest similarity score
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  const topSimilar = matches.slice(0, 5);
  const highestMatch = topSimilar.find(m => m.isPotentialDuplicate) || topSimilar[0];

  let duplicateProbability = 0;
  const evidence: string[] = [];

  if (highestMatch) {
    if (highestMatch.isPotentialDuplicate) {
      // Probability is derived from the same duplicateScore that drove isPotentialDuplicate,
      // so isPotentialDuplicate=true ⟺ duplicateProbability >= 0.70 (never contradictory).
      // Duplicate scores in [0.70, 1.00] map to [0.70, 0.95]; override-path duplicates
      // (dupScore < 0.70 but still duplicate) are floored at 0.70.
      const dupScore = highestMatch.duplicateScore ?? 0;
      duplicateProbability = Number(
        Math.min(0.95, Math.max(0.70, dupScore)).toFixed(2)
      );
      evidence.push(`High spatial proximity: ${highestMatch.distanceMeters}m from Report ${highestMatch.reportId}`);
      evidence.push(`Temporal window: within ${highestMatch.timeDeltaHours} hours of prior submission`);
      if (highestMatch.matchingTerms.length > 0) {
        evidence.push(`Key shared terms: ${highestMatch.matchingTerms.join(', ')}`);
      }
      evidence.push('AI Interpretation: Potential duplicate citizen report regarding the same underlying ground event');
    } else {
      // Non-duplicate: probability stays strictly below 0.70 to avoid contradicting the decision.
      const dupScore = highestMatch.duplicateScore ?? 0;
      duplicateProbability = Number(Math.min(0.69, Math.max(0.00, dupScore)).toFixed(2));
      evidence.push(`Related reports identified in vicinity (${highestMatch.distanceMeters}m), but distinct observations`);
    }
  } else {
    evidence.push('No immediate duplicate reports detected within standard spatial/temporal window.');
  }

  return {
    topSimilar,
    duplicateProbability,
    highestMatch,
    evidence
  };
}
