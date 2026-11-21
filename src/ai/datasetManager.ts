// SCIP Dataset Manager (Phase 3)
// Dataset registration, versioning, quality evaluation against ground truth,
// and classifier evaluation on the labeled civic text dataset.

import {
  CivicDatasetEntry,
  DatasetQualityMetrics,
  DatasetSplit,
  DatasetVersion,
  LabeledExample,
  ModelFramework,
  ModelPerformance,
  ModelTask,
  ReportCategory
} from '../types/scip.js';
import { modelRegistry } from './modelRegistry.js';
import { classifyReport } from './classifier.js';
import { CIVIC_DATASET_NAME, CIVIC_TEXT_DATASET_VERSION_1_0_0, getDatasetEntries } from './civicDataset.js';

const nowIso = (): string => new Date().toISOString();

const CATEGORIES: ReportCategory[] = [
  'Water & Drainage',
  'Roads & Traffic',
  'Public Sanitation',
  'Power & Lighting',
  'Parks & Environment',
  'Structural Safety',
  'Public Health',
  'Noise & Disturbance'
];

interface ConfusionCell {
  actual: ReportCategory;
  predicted: ReportCategory;
  count: number;
}

export class DatasetManager {
  private datasets: Map<string, CivicDatasetEntry[]> = new Map();
  private versions: Map<string, DatasetVersion[]> = new Map();

  constructor() {
    this.registerDataset(CIVIC_DATASET_NAME, getDatasetEntries(), CIVIC_TEXT_DATASET_VERSION_1_0_0);
  }

  // ------------------------------------------------------------------
  // Dataset registration & versioning
  // ------------------------------------------------------------------
  registerDataset(
    name: string,
    entries: CivicDatasetEntry[],
    version: DatasetVersion
  ): void {
    this.datasets.set(name, entries);
    const existing = this.versions.get(name) || [];
    existing.push(version);
    this.versions.set(name, existing);
  }

  getDataset(name: string): CivicDatasetEntry[] | undefined {
    return this.datasets.get(name);
  }

  getDatasetSplits(name: string): { train: CivicDatasetEntry[]; test: CivicDatasetEntry[]; validation: CivicDatasetEntry[] } | undefined {
    const entries = this.datasets.get(name);
    if (!entries) return undefined;
    return {
      train: entries.filter(e => e.split === 'train'),
      test: entries.filter(e => e.split === 'test'),
      validation: entries.filter(e => e.split === 'validation')
    };
  }

  getVersions(name: string): DatasetVersion[] | undefined {
    return this.versions.get(name);
  }

  listDatasets(): string[] {
    return Array.from(this.datasets.keys());
  }

  // ------------------------------------------------------------------
  // Evaluate classifier on dataset (ground truth comparison)
  // ------------------------------------------------------------------
  evaluateClassifierOnDataset(
    datasetName: string,
    modelVersion: string = '1.0.0',
    split: DatasetSplit | 'all' = 'test'
  ): DatasetQualityMetrics {
    const entries = this.datasets.get(datasetName);
    if (!entries) {
      throw new Error(`Dataset ${datasetName} not found`);
    }

    const testEntries = split === 'all' ? entries : entries.filter(e => e.split === split);
    if (testEntries.length === 0) {
      throw new Error(`No entries found for dataset ${datasetName} split ${split}`);
    }

    const confusion: ConfusionCell[] = [];
    const perCategory: Record<ReportCategory, { tp: number; fp: number; fn: number; support: number }> = {} as any;

    for (const cat of CATEGORIES) {
      perCategory[cat] = { tp: 0, fp: 0, fn: 0, support: 0 };
    }

    let correct = 0;

    for (const entry of testEntries) {
      const result = classifyReport(entry.text);
      const predicted = result.predictedCategory;
      const actual = entry.trueCategory;

      perCategory[actual].support++;
      if (predicted === actual) {
        perCategory[actual].tp++;
        correct++;
      } else {
        perCategory[actual].fn++;
        perCategory[predicted].fp++;
      }

      const existing = confusion.find(c => c.actual === actual && c.predicted === predicted);
      if (existing) {
        existing.count++;
      } else {
        confusion.push({ actual, predicted, count: 1 });
      }
    }

    const perCatMetrics = CATEGORIES.map(cat => {
      const p = perCategory[cat];
      const precision = p.tp + p.fp > 0 ? p.tp / (p.tp + p.fp) : 0;
      const recall = p.support > 0 ? p.tp / p.support : 0;
      const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      return {
        category: cat,
        entryCount: p.support,
        precision: Number(precision.toFixed(4)),
        recall: Number(recall.toFixed(4)),
        f1: Number(f1.toFixed(4)),
        support: p.support
      };
    });

    const macroPrecision = Number((perCatMetrics.reduce((s, m) => s + m.precision, 0) / perCatMetrics.length).toFixed(4));
    const macroRecall = Number((perCatMetrics.reduce((s, m) => s + m.recall, 0) / perCatMetrics.length).toFixed(4));
    const macroF1 = Number((perCatMetrics.reduce((s, m) => s + m.f1, 0) / perCatMetrics.length).toFixed(4));

    const totalTP = perCatMetrics.reduce((s, m) => s + m.precision * m.support, 0);
    const totalSupport = testEntries.length;
    const microPrecision = Number((totalTP / totalSupport).toFixed(4));
    const microRecall = microPrecision;
    const microF1 = microPrecision;
    const overallAccuracy = Number((correct / totalSupport).toFixed(4));

    const metrics: DatasetQualityMetrics = {
      datasetName,
      version: modelVersion,
      totalEntries: testEntries.length,
      perCategory: perCatMetrics,
      macroPrecision,
      macroRecall,
      macroF1,
      microPrecision,
      microRecall,
      microF1,
      overallAccuracy,
      confusionMatrix: confusion.map(c => ({ actual: c.actual, predicted: c.predicted, count: c.count })),
      evaluatedAt: nowIso(),
      modelVersion
    };

    // Record performance in model registry
    const registryPerCat = perCatMetrics.map(m => ({
      category: m.category,
      precision: m.precision,
      recall: m.recall,
      f1: m.f1,
      sampleCount: m.support
    }));
    modelRegistry.recordPerformance({
      modelName: 'scip-classifier',
      version: modelVersion,
      performance: {
        task: 'classification',
        accuracy: overallAccuracy,
        precision: macroPrecision,
        recall: macroRecall,
        f1Score: macroF1,
        sampleCount: totalSupport,
        evaluatedAt: nowIso(),
        perCategoryMetrics: registryPerCat,
        notes: `Evaluated on ${datasetName} (${split} split, ${totalSupport} samples)`
      }
    });

    return metrics;
  }

  // ------------------------------------------------------------------
  // Convenience: evaluate the default dataset on test split
  // ------------------------------------------------------------------
  evaluateDefaultDataset(modelVersion?: string): DatasetQualityMetrics {
    return this.evaluateClassifierOnDataset(CIVIC_DATASET_NAME, modelVersion ?? '1.0.0', 'test');
  }

  // ------------------------------------------------------------------
  // Get labeled examples (for display/export)
  // ------------------------------------------------------------------
  getLabeledExamples(datasetName: string, split: DatasetSplit = 'test', limit?: number): LabeledExample[] {
    const entries = this.datasets.get(datasetName);
    if (!entries) return [];
    const filtered = entries.filter(e => e.split === split);
    const examples: LabeledExample[] = filtered.map(e => ({
      id: e.id,
      text: e.text,
      trueCategory: e.trueCategory
    }));
    return limit ? examples.slice(0, limit) : examples;
  }

  // ------------------------------------------------------------------
  // Dataset statistics
  // ------------------------------------------------------------------
  getDatasetStats(datasetName: string): {
    entryCount: number;
    categoryDistribution: Record<ReportCategory, number>;
    splitDistribution: Record<DatasetSplit, number>;
    sourceDistribution: Record<string, number>;
  } | undefined {
    const entries = this.datasets.get(datasetName);
    if (!entries) return undefined;

    const catDist = CATEGORIES.reduce((acc: Record<ReportCategory, number>, cat) => {
      acc[cat] = entries.filter(e => e.trueCategory === cat).length;
      return acc;
    }, {} as Record<ReportCategory, number>);

    const splitDist = { train: 0, test: 0, validation: 0 } as Record<DatasetSplit, number>;
    for (const e of entries) splitDist[e.split]++;

    const sourceDist: Record<string, number> = {};
    for (const e of entries) {
      sourceDist[e.source] = (sourceDist[e.source] || 0) + 1;
    }

    return {
      entryCount: entries.length,
      categoryDistribution: catDist,
      splitDistribution: splitDist,
      sourceDistribution: sourceDist
    };
  }
}

// Global singleton
export const datasetManager = new DatasetManager();
