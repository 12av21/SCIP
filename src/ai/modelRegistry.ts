// SCIP AI Model Registry
// Tracks model versions, performance metrics, and active model selection
// for the SCIP AI pipeline. Supports both local TypeScript TF-IDF models
// and Python sentence-transformers embedding models.

import {
  ModelFramework,
  ModelRegistryEntry,
  ModelRegistryStats,
  ModelSelection,
  ModelStatus,
  ModelTask,
  ModelVersion,
  ModelPerformance,
  ReportCategory,
} from '../types/scip.js';

export interface RegisterModelOptions {
  name: string;
  displayName: string;
  description: string;
  version: string;
  framework: ModelFramework;
  task: ModelTask;
  modelId?: string;
  status?: ModelStatus;
  isDefault?: boolean;
  config?: Record<string, any>;
  createdBy: string;
}

export interface RecordPerformanceOptions {
  modelName: string;
  version: string;
  performance: ModelPerformance;
}

export interface PromoteOptions {
  modelName: string;
  version: string;
  status: ModelStatus;
}

export interface SelectModelOptions {
  task: ModelTask;
  framework?: ModelFramework;
  preferProduction?: boolean;
}

const nowIso = (): string => new Date().toISOString();

const semverCompare = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
};

export class ModelRegistry {
  private models: Map<string, ModelRegistryEntry> = new Map();

  registerModel(options: RegisterModelOptions): ModelRegistryEntry {
    const { name, displayName, description, version, framework, task, modelId, status = 'candidate', isDefault = false, config, createdBy } = options;

    const modelVersion: ModelVersion = {
      version,
      framework,
      task,
      modelId,
      status,
      performance: [],
      createdAt: nowIso(),
      createdBy,
      config,
      isDefault,
    };

    let entry = this.models.get(name);
    if (!entry) {
      entry = {
        name,
        displayName,
        description,
        versions: [],
        activeVersion: null,
        defaultVersion: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.models.set(name, entry);
    }

    // Prevent duplicate versions
    if (entry.versions.some((v) => v.version === version)) {
      throw new Error(`Model version ${version} already registered for model ${name}`);
    }

    entry.versions.push(modelVersion);
    entry.updatedAt = nowIso();

    // Set as default if first version or explicitly requested
    if (isDefault || entry.defaultVersion === null) {
      entry.defaultVersion = version;
    }

    // Set as active if it's the first production/staging version or explicitly requested
    if ((status === 'production' || status === 'staging') && entry.activeVersion === null) {
      entry.activeVersion = version;
    }

    return entry;
  }

  getModel(name: string): ModelRegistryEntry | undefined {
    return this.models.get(name);
  }

  getAllModels(): ModelRegistryEntry[] {
    return Array.from(this.models.values());
  }

  getActiveModel(name: string): ModelVersion | undefined {
    const entry = this.models.get(name);
    if (!entry || !entry.activeVersion) return undefined;
    return entry.versions.find((v) => v.version === entry.activeVersion);
  }

  getDefaultModel(name: string): ModelVersion | undefined {
    const entry = this.models.get(name);
    if (!entry || !entry.defaultVersion) return undefined;
    return entry.versions.find((v) => v.version === entry.defaultVersion);
  }

  getVersion(name: string, version: string): ModelVersion | undefined {
    const entry = this.models.get(name);
    if (!entry) return undefined;
    return entry.versions.find((v) => v.version === version);
  }

  setActiveModel(name: string, version: string): void {
    const entry = this.models.get(name);
    if (!entry) {
      throw new Error(`Model ${name} not found in registry`);
    }
    if (!entry.versions.some((v) => v.version === version)) {
      throw new Error(`Version ${version} not found for model ${name}`);
    }
    entry.activeVersion = version;
    entry.updatedAt = nowIso();
  }

  setDefaultModel(name: string, version: string): void {
    const entry = this.models.get(name);
    if (!entry) {
      throw new Error(`Model ${name} not found in registry`);
    }
    if (!entry.versions.some((v) => v.version === version)) {
      throw new Error(`Version ${version} not found for model ${name}`);
    }
    entry.defaultVersion = version;
    entry.updatedAt = nowIso();
  }

  recordPerformance(options: RecordPerformanceOptions): void {
    const { modelName, version, performance } = options;
    const entry = this.models.get(modelName);
    if (!entry) {
      throw new Error(`Model ${modelName} not found in registry`);
    }
    const modelVersion = entry.versions.find((v) => v.version === version);
    if (!modelVersion) {
      throw new Error(`Version ${version} not found for model ${modelName}`);
    }
    modelVersion.performance.push(performance);
    entry.updatedAt = nowIso();
  }

  promote(options: PromoteOptions): void {
    const { modelName, version, status } = options;
    const entry = this.models.get(modelName);
    if (!entry) {
      throw new Error(`Model ${modelName} not found in registry`);
    }
    const modelVersion = entry.versions.find((v) => v.version === version);
    if (!modelVersion) {
      throw new Error(`Version ${version} not found for model ${modelName}`);
    }

    // If promoting to production, demote other production versions of same task
    if (status === 'production') {
      for (const mv of entry.versions) {
        if (mv.status === 'production' && mv.version !== version) {
          mv.status = 'staging';
        }
      }
    }

    modelVersion.status = status;
    entry.updatedAt = nowIso();

    // Update active version if promoted to production or staging
    if (status === 'production' || status === 'staging') {
      entry.activeVersion = version;
    }
  }

  selectModel(options: SelectModelOptions): ModelSelection | null {
    const { task, framework, preferProduction = true } = options;

    const candidates: { name: string; version: ModelVersion; entry: ModelRegistryEntry }[] = [];

    for (const [name, entry] of this.models.entries()) {
      for (const mv of entry.versions) {
        if (mv.task !== task) continue;
        if (framework && mv.framework !== framework) continue;
        if (preferProduction && mv.status !== 'production' && mv.status !== 'staging') continue;
        candidates.push({ name, version: mv, entry });
      }
    }

    if (candidates.length === 0) return null;

    // Sort: production > staging > candidate, then by version (semver desc), then by best F1
    candidates.sort((a, b) => {
      const rank = (s: ModelStatus): number => {
        switch (s) {
          case 'production': return 4;
          case 'staging': return 3;
          case 'candidate': return 2;
          case 'deprecated': return 1;
          case 'retired': return 0;
        }
        return 0;
      };
      const ra = rank(a.version.status);
      const rb = rank(b.version.status);
      if (ra !== rb) return rb - ra;

      const va = a.version.performance.find((p) => p.task === task)?.f1Score ?? 0;
      const vb = b.version.performance.find((p) => p.task === task)?.f1Score ?? 0;
      if (va !== vb) return vb - va;

      return semverCompare(b.version.version, a.version.version);
    });

    const best = candidates[0];
    return {
      modelName: best.name,
      version: best.version.version,
      framework: best.version.framework,
      task: best.version.task,
      reason: `Selected ${best.name} v${best.version.version} (${best.version.status}, ${best.version.framework}) for task ${task}`,
    };
  }

  getStats(): ModelRegistryStats {
    const all = this.getAllModels();
    let production = 0;
    let staging = 0;
    let deprecated = 0;
    const byFramework: Record<ModelFramework, number> = { 'tfidf-ts': 0, 'sentence-transformers': 0, sklearn: 0 };
    const byTask: Record<ModelTask, number> = { classification: 0, embedding: 0, 'duplicate-detection': 0, 'entity-extraction': 0, 'risk-scoring': 0 };

    for (const entry of all) {
      for (const mv of entry.versions) {
        if (mv.status === 'production') production++;
        else if (mv.status === 'staging') staging++;
        else if (mv.status === 'deprecated') deprecated++;
        byFramework[mv.framework] = (byFramework[mv.framework] || 0) + 1;
        byTask[mv.task] = (byTask[mv.task] || 0) + 1;
      }
    }

    return {
      totalModels: all.length,
      productionModels: production,
      stagingModels: staging,
      deprecatedModels: deprecated,
      byFramework,
      byTask,
    };
  }
}

// Global singleton registry
export const modelRegistry = new ModelRegistry();

// Register the built-in TF-IDF classifier as the default production model
modelRegistry.registerModel({
  name: 'scip-classifier',
  displayName: 'SCIP Report Classifier',
  description: 'TF-IDF centroid-based municipal report classifier (8 categories)',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'classification',
  status: 'production',
  isDefault: true,
  createdBy: 'system',
});

modelRegistry.registerModel({
  name: 'scip-duplicate-detector',
  displayName: 'SCIP Duplicate Report Detector',
  description: 'TF-IDF + Haversine composite duplicate detection',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'duplicate-detection',
  status: 'production',
  isDefault: true,
  createdBy: 'system',
});

modelRegistry.registerModel({
  name: 'scip-risk-scorer',
  displayName: 'SCIP Risk Scorer',
  description: 'Explainable 5-factor risk scoring engine',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'risk-scoring',
  status: 'production',
  isDefault: true,
  createdBy: 'system',
});

modelRegistry.registerModel({
  name: 'scip-entity-extractor',
  displayName: 'SCIP Entity Extractor',
  description: 'Keyword-based location, infrastructure, and hazard extraction',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'entity-extraction',
  status: 'production',
  isDefault: true,
  createdBy: 'system',
});

// Multilingual (Hindi/English/Hinglish) models
modelRegistry.registerModel({
  name: 'scip-multilingual-classifier',
  displayName: 'SCIP Multilingual Classifier',
  description: 'Language-aware category classifier for Hindi, English, and Hinglish civic complaints',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'classification',
  status: 'production',
  isDefault: false,
  createdBy: 'system'
});

modelRegistry.registerModel({
  name: 'scip-multilingual-duplicate-detector',
  displayName: 'SCIP Multilingual Duplicate Detector',
  description: 'Cross-language duplicate detection for Hindi, English, and Hinglish reports',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'duplicate-detection',
  status: 'production',
  isDefault: false,
  createdBy: 'system'
});

modelRegistry.registerModel({
  name: 'scip-multilingual-entity-extractor',
  displayName: 'SCIP Multilingual Entity Extractor',
  description: 'Location, infrastructure, and hazard extraction for Hindi, English, and Hinglish text',
  version: '1.0.0',
  framework: 'tfidf-ts',
  task: 'entity-extraction',
  status: 'production',
  isDefault: false,
  createdBy: 'system'
});
