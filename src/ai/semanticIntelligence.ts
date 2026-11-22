// SCIP Semantic Intelligence & AI Evaluation (Phase 2.3)
// Evaluates semantic similarity, cross-language evaluation, duplicate detection,
// and entity extraction using local TF-IDF / rule-based engines.
// No sentence-transformers or trained ML models required — no model downloads.

import { aiAdapter } from './aiServiceAdapter.js';
import { classifyReport } from './classifier.js';
import { extractEntities, determineSeverity } from './classifier.js';
import { globalVectorizer } from './tfidf.js';
import { findSimilarAndDuplicateReports } from './duplicateDetector.js';
import { datasetManager } from './datasetManager.js';
import { CIVIC_DATASET_NAME, getDatasetEntries } from './civicDataset.js';
import {
  Report,
  ReportCategory,
  SemanticEvaluationResult,
  SemanticPairResult,
  SemanticClusteringResult,
  DuplicateDetectionEvaluation,
  EntityExtractionEvaluation,
  DatasetSplit
} from '../types/scip.js';

const nowIso = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Cross-language text pairs (English ↔ Hinglish ↔ Hindi)
// Built from hindiPreprocessor mappings + civic dataset entries.
// No external dependencies — all terms are synthetic/representative.
// ---------------------------------------------------------------------------
const CROSS_LANGUAGE_PAIRS: Array<{ textA: string; textB: string; label: string }> = [
  { textA: 'pothole on main road', textB: 'sadak par bada gaddha', label: 'English-Hinglish: pothole' },
  { textA: 'waterlogging outside market', textB: 'bazaar ke bahar paani bhar gaya', label: 'English-Hinglish: waterlogging' },
  { textA: 'garbage bin overflowing', textB: 'kuda dustbin se bahar nikla', label: 'English-Hinglish: garbage overflow' },
  { textA: 'streetlights dark on avenue', textB: 'sadak par street light band hai', label: 'English-Hinglish: streetlights dark' },
  { textA: 'sewage overflow in apartment', textB: 'apartment mein sewer overflow', label: 'English-Hinglish: sewage overflow' },
  { textA: 'traffic signal malfunction', textB: 'traffic signal kharab hai', label: 'English-Hinglish: traffic signal' },
  { textA: 'stray dog bite incidents', textB: 'awara kutte ke kaatne ki ghatnayein', label: 'English-Hinglish: dog bite' },
  { textA: 'dead animal on roadside', textB: 'sadak ke kinare mrt janwar', label: 'English-Hinglish: dead animal' }
];

// ---------------------------------------------------------------------------
// Labeled entity extraction examples for evaluation
// ---------------------------------------------------------------------------
const ENTITY_LABELS: Array<{ text: string; expected: { locations: string[]; infrastructure: string[]; hazards: string[] } }> = [
  {
    text: 'pothole on Sector 4 Market road near the bus stand',
    expected: { locations: ['Sector 4 Market', 'bus stand'], infrastructure: ['pothole', 'road'], hazards: [] }
  },
  {
    text: 'live wire sparking near school gate causing electrocution risk',
    expected: { locations: ['school gate'], infrastructure: ['live wire'], hazards: ['electrocution'] }
  },
  {
    text: 'gas smell near the pipeline junction in Karol Bagh',
    expected: { locations: ['Karol Bagh'], infrastructure: ['pipeline'], hazards: ['gas leak'] }
  },
  {
    text: 'building collapse danger on Connaught Place',
    expected: { locations: ['Connaught Place'], infrastructure: ['building'], hazards: ['structural collapse'] }
  },
  {
    text: 'overflowing garbage bin at Central Plaza attracting stray dogs',
    expected: { locations: ['Central Plaza'], infrastructure: ['garbage bin'], hazards: [] }
  },
  {
    text: 'traffic signal not working at West Boulevard Avenue junction',
    expected: { locations: ['West Boulevard Avenue'], infrastructure: ['traffic signal'], hazards: [] }
  },
  {
    text: 'sewage overflow in apartment complex courtyard health hazard',
    expected: { locations: ['apartment complex courtyard'], infrastructure: ['sewage'], hazards: [] }
  },
  {
    text: 'fallen tree branch across walking path in the park',
    expected: { locations: ['walking path', 'park'], infrastructure: ['tree branch'], hazards: [] }
  }
];

// ---------------------------------------------------------------------------
// Semantic similarity evaluation
// ---------------------------------------------------------------------------
export async function evaluateSemanticSimilarity(textA: string, textB: string): Promise<SemanticPairResult> {
  const result = await aiAdapter.semanticSimilarity(textA, textB);
  const scriptA = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(textA);
  const scriptB = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(textB);
  return {
    textA,
    textB,
    similarity: result.similarity,
    modelId: result.modelId,
    languageMatch: scriptA === scriptB
  };
}

// ---------------------------------------------------------------------------
// Cross-language similarity evaluation
// ---------------------------------------------------------------------------
export function evaluateCrossLanguageSimilarity(): SemanticPairResult[] {
  const results: SemanticPairResult[] = [];
  for (const pair of CROSS_LANGUAGE_PAIRS) {
    const sim = globalVectorizer.fit([{ id: 'a', text: pair.textA }, { id: 'b', text: pair.textB }]);
    const vecA = globalVectorizer.transform(pair.textA, 'a');
    const vecB = globalVectorizer.transform(pair.textB, 'b');
    const similarity = globalVectorizer.cosineSimilarity(vecA, vecB);
    const scriptA = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(pair.textA);
    const scriptB = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(pair.textB);
    results.push({
      textA: pair.textA,
      textB: pair.textB,
      similarity: Number(similarity.toFixed(4)),
      modelId: 'scip-local-ts-tfidf-v1.0',
      languageMatch: scriptA === scriptB
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Semantic clustering evaluation
// ---------------------------------------------------------------------------
export function evaluateSemanticClustering(reports: Report[]): SemanticClusteringResult {
  const total = reports.length;
  if (total === 0) {
    return {
      totalReports: 0,
      clusterCount: 0,
      averageSilhouette: 0,
      intraClusterSimilarity: 0,
      interClusterSimilarity: 0,
      clusterSizeDistribution: []
    };
  }

  // Fit TF-IDF on report texts
  const docs = reports.map((r, i) => ({
    id: `r${i}`,
    text: `${r.title} ${r.description} ${r.category}`
  }));
  globalVectorizer.fit(docs);

  // Compute pairwise similarities
  const vectors = reports.map((r, i) => globalVectorizer.transform(`${r.title} ${r.description} ${r.category}`, `r${i}`));

  // Simple clustering by category (ground truth categories as clusters)
  const byCategory = new Map<ReportCategory, number[]>();
  reports.forEach((r, i) => {
    const cat = r.category;
    const ids = byCategory.get(cat) || [];
    ids.push(i);
    byCategory.set(cat, ids);
  });

  const clusterSizes = Array.from(byCategory.values()).map(ids => ids.length);
  const clusterCount = clusterSizes.length;

  // Intra-cluster similarity (average similarity within same-category pairs)
  let intraSum = 0;
  let intraCount = 0;
  for (const ids of byCategory.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        intraSum += globalVectorizer.cosineSimilarity(vectors[ids[i]], vectors[ids[j]]);
        intraCount++;
      }
    }
  }
  const intraClusterSimilarity = intraCount > 0 ? Number((intraSum / intraCount).toFixed(4)) : 0;

  // Inter-cluster similarity (average similarity across different-category pairs)
  let interSum = 0;
  let interCount = 0;
  const catArray = Array.from(byCategory.keys());
  for (let i = 0; i < catArray.length; i++) {
    for (let j = i + 1; j < catArray.length; j++) {
      const idsA = byCategory.get(catArray[i])!;
      const idsB = byCategory.get(catArray[j])!;
      for (const ia of idsA) {
        for (const ib of idsB) {
          interSum += globalVectorizer.cosineSimilarity(vectors[ia], vectors[ib]);
          interCount++;
        }
      }
    }
  }
  const interClusterSimilarity = interCount > 0 ? Number((interSum / interCount).toFixed(4)) : 0;

  // Approximate silhouette: (inter - intra) / max(intra, inter)
  const avgSilhouette = Number(((interClusterSimilarity - intraClusterSimilarity) / Math.max(intraClusterSimilarity, interClusterSimilarity, 0.001)).toFixed(4));

  return {
    totalReports: total,
    clusterCount,
    averageSilhouette: Math.max(-1, Math.min(1, avgSilhouette)),
    intraClusterSimilarity,
    interClusterSimilarity,
    clusterSizeDistribution: clusterSizes.sort((a, b) => b - a)
  };
}

// ---------------------------------------------------------------------------
// Duplicate detection evaluation (precision/recall on synthetic labeled pairs)
// ---------------------------------------------------------------------------
export function evaluateDuplicateDetection(): DuplicateDetectionEvaluation {
  const testEntries = getDatasetEntries('test' as DatasetSplit);
  if (testEntries.length === 0) {
    return {
      totalEvaluated: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      threshold: 0.70
    };
  }

  // Build positive pairs: near-duplicate variations of same text
  const positivePairs: Array<{ a: Report; b: Report }> = [];
  for (const entry of testEntries) {
    const base: Report = {
      id: `DUP-POS-${entry.id}`,
      title: entry.title,
      description: entry.description,
      category: entry.trueCategory,
      locationName: entry.locationName,
      latitude: entry.latitude,
      longitude: entry.longitude,
      citizenId: 'eval',
      citizenName: 'Evaluator',
      citizenEmail: 'eval@scip.internal',
      status: 'analyzed',
      urgency: entry.urgency,
      images: [],
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt
    };
    // Near-duplicate: same core text with minor wording variation
    const dup: Report = {
      ...base,
      id: `DUP-POS-VAR-${entry.id}`,
      title: entry.title + ' (follow-up)',
      description: entry.description + '. This is a repeat observation of the same issue.'
    };
    positivePairs.push({ a: base, b: dup });
  }

  // Build negative pairs: different categories at different locations
  const negativePairs: Array<{ a: Report; b: Report }> = [];
  for (let i = 0; i < testEntries.length; i++) {
    const aEntry = testEntries[i];
    const bEntry = testEntries[(i + 1) % testEntries.length];
    if (aEntry.trueCategory !== bEntry.trueCategory) {
      const a: Report = {
        id: `DUP-NEG-A-${aEntry.id}`,
        title: aEntry.title,
        description: aEntry.description,
        category: aEntry.trueCategory,
        locationName: aEntry.locationName,
        latitude: aEntry.latitude,
        longitude: aEntry.longitude,
        citizenId: 'eval', citizenName: 'Evaluator', citizenEmail: 'eval@scip.internal',
        status: 'analyzed', urgency: aEntry.urgency, images: [],
        createdAt: aEntry.createdAt, updatedAt: aEntry.createdAt
      };
      const b: Report = {
        id: `DUP-NEG-B-${bEntry.id}`,
        title: bEntry.title,
        description: bEntry.description,
        category: bEntry.trueCategory,
        locationName: bEntry.locationName,
        latitude: bEntry.latitude,
        longitude: bEntry.longitude,
        citizenId: 'eval', citizenName: 'Evaluator', citizenEmail: 'eval@scip.internal',
        status: 'analyzed', urgency: bEntry.urgency, images: [],
        createdAt: bEntry.createdAt, updatedAt: bEntry.createdAt
      };
      negativePairs.push({ a, b });
    }
  }

  let truePositives = 0;
  let falseNegatives = 0;
  for (const { a, b } of positivePairs) {
    const result = findSimilarAndDuplicateReports(b, [a]);
    if (result.highestMatch?.isPotentialDuplicate === true) {
      truePositives++;
    } else {
      falseNegatives++;
    }
  }

  let falsePositives = 0;
  for (const { a, b } of negativePairs) {
    const result = findSimilarAndDuplicateReports(b, [a]);
    if (result.highestMatch?.isPotentialDuplicate === true) {
      falsePositives++;
    }
  }

  const totalEvaluated = positivePairs.length + negativePairs.length;
  const precision = (truePositives + falsePositives) > 0 ? Number((truePositives / (truePositives + falsePositives)).toFixed(4)) : 0;
  const recall = (truePositives + falseNegatives) > 0 ? Number((truePositives / (truePositives + falseNegatives)).toFixed(4)) : 0;
  const f1Score = (precision + recall) > 0 ? Number((2 * precision * recall / (precision + recall)).toFixed(4)) : 0;

  return {
    totalEvaluated,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    threshold: 0.70
  };
}

// ---------------------------------------------------------------------------
// Entity extraction evaluation (precision/recall on labeled examples)
// ---------------------------------------------------------------------------
export function evaluateEntityExtraction(): EntityExtractionEvaluation {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const byType: Record<'locations' | 'infrastructure' | 'hazards', { tp: number; fp: number; fn: number }> = {
    locations: { tp: 0, fp: 0, fn: 0 },
    infrastructure: { tp: 0, fp: 0, fn: 0 },
    hazards: { tp: 0, fp: 0, fn: 0 }
  };

  for (const labeled of ENTITY_LABELS) {
    const extracted = extractEntities(labeled.text);

    for (const type of ['locations', 'infrastructure', 'hazards'] as const) {
      const expected = new Set(labeled.expected[type].map(e => e.toLowerCase()));
      const got = new Set(extracted[type].map(e => e.toLowerCase()));

      // True positives: expected entities that were extracted
      for (const e of expected) {
        if (got.has(e)) {
          truePositives++;
          byType[type].tp++;
        } else {
          falseNegatives++;
          byType[type].fn++;
        }
      }
      // False positives: extracted entities not in expected
      for (const e of got) {
        if (!expected.has(e)) {
          falsePositives++;
          byType[type].fp++;
        }
      }
    }
  }

  const precision = (truePositives + falsePositives) > 0 ? Number((truePositives / (truePositives + falsePositives)).toFixed(4)) : 0;
  const recall = (truePositives + falseNegatives) > 0 ? Number((truePositives / (truePositives + falseNegatives)).toFixed(4)) : 0;
  const f1Score = (precision + recall) > 0 ? Number((2 * precision * recall / (precision + recall)).toFixed(4)) : 0;

  const byTypeMetrics: Record<'locations' | 'infrastructure' | 'hazards', { precision: number; recall: number; f1: number }> = {} as any;
  for (const type of ['locations', 'infrastructure', 'hazards'] as const) {
    const bt = byType[type];
    const p = (bt.tp + bt.fp) > 0 ? Number((bt.tp / (bt.tp + bt.fp)).toFixed(4)) : 0;
    const r = (bt.tp + bt.fn) > 0 ? Number((bt.tp / (bt.tp + bt.fn)).toFixed(4)) : 0;
    const f = (p + r) > 0 ? Number((2 * p * r / (p + r)).toFixed(4)) : 0;
    byTypeMetrics[type] = { precision: p, recall: r, f1: f };
  }

  return {
    totalEvaluated: ENTITY_LABELS.length,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    byType: byTypeMetrics
  };
}

// ---------------------------------------------------------------------------
// Full semantic + AI evaluation
// ---------------------------------------------------------------------------
export async function runFullEvaluation(targetReport?: Report): Promise<SemanticEvaluationResult> {
  const allEntries = datasetManager.getDataset('scip-civic-text-dataset') ?? [];
  const toReport = (e: any): Report => ({
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.trueCategory,
    locationName: e.locationName,
    latitude: e.latitude,
    longitude: e.longitude,
    citizenId: 'eval',
    citizenName: 'Evaluator',
    citizenEmail: 'eval@scip.internal',
    status: 'analyzed',
    urgency: e.urgency,
    images: [],
    createdAt: e.createdAt,
    updatedAt: e.createdAt
  });
  const allReports = allEntries.map(toReport);
  const reports = targetReport ? [targetReport, ...allReports.slice(0, 49)] : allReports.slice(0, 50);

  // Semantic pair example
  const semanticPair = await evaluateSemanticSimilarity(
    'pothole on main road near sector 4 market',
    'large pothole on arterial road causing vehicle damage'
  );

  // Cross-language pairs
  const crossLanguagePairs = evaluateCrossLanguageSimilarity();

  // Semantic clustering
  const semanticClustering = evaluateSemanticClustering(reports);

  // Duplicate detection
  const duplicateDetection = evaluateDuplicateDetection();

  // Entity extraction
  const entityExtraction = evaluateEntityExtraction();

  // Overall composite score (0-100)
  const overallScore = Number((
    semanticPair.similarity * 20 +
    (crossLanguagePairs.reduce((s, p) => s + p.similarity, 0) / Math.max(1, crossLanguagePairs.length)) * 20 +
    Math.max(0, semanticClustering.averageSilhouette) * 20 +
    duplicateDetection.f1Score * 20 +
    entityExtraction.f1Score * 20
  ).toFixed(1));

  const limitations: string[] = [
    'Semantic similarity computed via TF-IDF cosine similarity, not sentence-transformers embeddings',
    'Cross-language pairs are synthetic English-Hinglish mappings, not native Hindi evaluation',
    'Duplicate detection evaluation uses generated near-duplicate variations, not real user-submitted duplicates',
    'Entity extraction evaluation uses a fixed labeled set of 8 examples',
    'All evaluations are heuristic/statistical — not trained ML model validation'
  ];

  return {
    evaluatedAt: nowIso(),
    semanticPair,
    crossLanguagePairs,
    semanticClustering,
    duplicateDetection,
    entityExtraction,
    overallScore,
    limitations
  };
}

// Global singleton instance for route access
export const semanticIntelligence = {
  evaluateSemanticSimilarity,
  evaluateCrossLanguageSimilarity,
  evaluateSemanticClustering,
  evaluateDuplicateDetection,
  evaluateEntityExtraction,
  runFullEvaluation
};
