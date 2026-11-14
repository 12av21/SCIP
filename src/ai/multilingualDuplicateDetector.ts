// SCIP AI - Multilingual Duplicate Detection & Semantic Similarity
// Detects duplicate reports across Hindi, English, Hinglish, and mixed-language text.
// Uses language-aware normalization + TF-IDF cosine similarity + Haversine distance.
// No sentence-transformers: avoids model downloads and excessive memory.

import { Report, SimilarReportMatch } from '../types/scip.js';
import { calculateHaversineDistance, calculateTimeDeltaHours } from './duplicateDetector.js';
import { globalVectorizer } from './tfidf.js';
import { detectLanguage, normalizeHinglish } from './languageDetector.js';
import { preprocessMultilingualText } from './hindiPreprocessor.js';

export interface MultilingualSimilarityResult {
  similarity: number; // 0 to 1
  modelId: string;
  languageMatch: boolean;
  reasoning: string[];
}

export interface MultilingualDuplicateResult {
  topSimilar: SimilarReportMatch[];
  duplicateProbability: number;
  highestMatch?: SimilarReportMatch;
  evidence: string[];
}

/**
 * Compute semantic similarity between two text strings using language-aware
 * normalization and TF-IDF cosine similarity.
 */
export function computeMultilingualSimilarity(
  textA: string,
  textB: string
): MultilingualSimilarityResult {
  const reasoning: string[] = [];

  if (!textA || !textB || textA.trim().length === 0 || textB.trim().length === 0) {
    return {
      similarity: 0,
      modelId: 'scip-multilingual-ts-v1.0',
      languageMatch: false,
      reasoning: ['Empty input text']
    };
  }

  const langA = detectLanguage(textA);
  const langB = detectLanguage(textB);
  reasoning.push(`Text A language: ${langA.language} (confidence ${langA.confidence})`);
  reasoning.push(`Text B language: ${langB.language} (confidence ${langB.confidence})`);

  const languageMatch = langA.language === langB.language ||
    (langA.language === 'hinglish' && langB.language === 'en') ||
    (langA.language === 'en' && langB.language === 'hinglish') ||
    (langA.language === 'mixed' && langB.language === 'mixed');

  reasoning.push(`Language match: ${languageMatch}`);

  // Normalize both texts for cross-language comparison
  const normalizedA = normalizeHinglish(textA);
  const normalizedB = normalizeHinglish(textB);
  reasoning.push('Applied Hinglish normalization to both texts');

  // Fit vectorizer on both texts and compute cosine similarity
  globalVectorizer.fit([
    { id: 'a', text: normalizedA },
    { id: 'b', text: normalizedB }
  ]);

  const vecA = globalVectorizer.transform(normalizedA, 'a');
  const vecB = globalVectorizer.transform(normalizedB, 'b');

  const similarity = globalVectorizer.cosineSimilarity(vecA, vecB);
  reasoning.push(`TF-IDF cosine similarity: ${similarity.toFixed(4)}`);

  // Boost similarity if both texts share civic keywords in the same language
  const sharedTerms = globalVectorizer.getMatchingTerms(vecA, vecB, 5);
  if (sharedTerms.length > 0) {
    reasoning.push(`Shared terms: ${sharedTerms.join(', ')}`);
  }

  return {
    similarity: Number(similarity.toFixed(4)),
    modelId: 'scip-multilingual-ts-v1.0',
    languageMatch,
    reasoning
  };
}

/**
 * Find similar and duplicate reports for a target report across all languages.
 * Extends the existing findSimilarAndDuplicateReports with multilingual support.
 */
export function findMultilingualSimilarAndDuplicateReports(
  targetReport: Report,
  allReports: Report[],
  thresholdSimilarity: number = 0.30
): MultilingualDuplicateResult {
  const targetText = `${targetReport.title} ${targetReport.description} ${targetReport.locationName}`;
  const targetLang = detectLanguage(targetText);

  // Normalize target text for cross-language comparison
  const normalizedTargetText = normalizeHinglish(targetText);

  const targetVec = globalVectorizer.transform(normalizedTargetText, targetReport.id);

  const matches: SimilarReportMatch[] = [];

  for (const report of allReports) {
    if (report.id === targetReport.id) continue;

    const reportText = `${report.title} ${report.description} ${report.locationName}`;
    const reportLang = detectLanguage(reportText);
    const normalizedReportText = normalizeHinglish(reportText);
    const reportVec = globalVectorizer.transform(normalizedReportText, report.id);

    const textSim = globalVectorizer.cosineSimilarity(targetVec, reportVec);
    const distanceMeters = calculateHaversineDistance(
      targetReport.latitude,
      targetReport.longitude,
      report.latitude,
      report.longitude
    );
    const timeDeltaHours = calculateTimeDeltaHours(targetReport.createdAt, report.createdAt);
    const matchingTerms = globalVectorizer.getMatchingTerms(targetVec, reportVec, 4);

    // Language compatibility bonus: same language or Hinglish↔English
    let languageCompatibility = 1.0;
    if (targetLang.language !== reportLang.language) {
      const compatiblePairs = [
        ['hinglish', 'en'], ['en', 'hinglish'],
        ['hi', 'mixed'], ['mixed', 'hi'],
        ['en', 'mixed'], ['mixed', 'en']
      ];
      const isCompatible = compatiblePairs.some(
        ([a, b]) => targetLang.language === a && reportLang.language === b
      );
      if (!isCompatible) {
        languageCompatibility = 0.6; // Cross-language penalty
      }
    }

    // Spatial factor: 1.0 at 0m, drops to 0 at 300m
    const spatialFactor = Math.max(0, 1 - distanceMeters / 300);
    // Temporal factor: 1.0 at 0h, drops to 0 at 48h
    const temporalFactor = Math.max(0, 1 - timeDeltaHours / 48);

    // Category match bonus
    const categoryFactor = targetReport.category === report.category ? 1.0 : 0.4;

    // Combined duplicate score with language compatibility
    let dupScore = (textSim * 0.45) + (spatialFactor * 0.35) + (temporalFactor * 0.10) + (languageCompatibility * 0.10);
    dupScore = dupScore * categoryFactor;

    const isDuplicate = dupScore >= 0.70 ||
      (distanceMeters <= 50 && timeDeltaHours <= 12 && textSim >= 0.55);

    if (textSim >= thresholdSimilarity || distanceMeters <= 200) {
      matches.push({
        reportId: report.id,
        reportTitle: report.title,
        category: report.category,
        similarityScore: Number(textSim.toFixed(3)),
        distanceMeters,
        timeDeltaHours,
        matchingTerms,
        isPotentialDuplicate: isDuplicate
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
      duplicateProbability = Number(
        Math.min(0.95, (highestMatch.similarityScore * 0.55) + (Math.max(0, 1 - highestMatch.distanceMeters / 200) * 0.35) + (highestMatch.timeDeltaHours <= 24 ? 0.1 : 0)).toFixed(2)
      );
      evidence.push(`High spatial proximity: ${highestMatch.distanceMeters}m from Report ${highestMatch.reportId}`);
      evidence.push(`Temporal window: within ${highestMatch.timeDeltaHours} hours of prior submission`);
      if (highestMatch.matchingTerms.length > 0) {
        evidence.push(`Key shared terms: ${highestMatch.matchingTerms.join(', ')}`);
      }
      evidence.push('AI Interpretation: Potential duplicate citizen report regarding the same underlying ground event');
    } else {
      duplicateProbability = Number(Math.max(0.05, highestMatch.similarityScore * 0.4).toFixed(2));
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

export const multilingualDuplicateDetector = {
  computeMultilingualSimilarity,
  findMultilingualSimilarAndDuplicateReports
};
