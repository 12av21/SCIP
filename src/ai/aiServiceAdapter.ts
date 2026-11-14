// SCIP AI Adapter - Bridges Python FastAPI Service & Local TypeScript ML Engine
// Ensures seamless fallover to local algorithms when the Python service is disabled,
// unreachable, or returns an error. The local TypeScript engine is always available.
//
// Configuration (environment):
//   AI_SERVICE_URL        Base URL of the Python FastAPI service (e.g. http://localhost:8000)
//   AI_SERVICE_ENABLED    "true" to enable Python integration (default: false)
//   AI_SERVICE_TIMEOUT_MS Request timeout in milliseconds (default: 5000)
// No production URLs or secrets are hardcoded.

import { classifyReport } from './classifier.js';
import { findSimilarAndDuplicateReports } from './duplicateDetector.js';
import { extractEntities } from './classifier.js';
import { computeExplainableRisk } from './riskScorer.js';
import { modelRegistry, SelectModelOptions } from './modelRegistry.js';
import { Report, ReportCategory, ModelTask, ModelFramework } from '../types/scip.js';

export interface AIClassificationResult {
  predictedCategory: ReportCategory;
  confidence: number;
  explanation: string;
  lowConfidenceReview: boolean;
  modelVersion: string;
}

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  modelId: string;
}

export interface SemanticSimilarityResult {
  similarity: number; // cosine similarity, 0 to 1
  modelId: string;
}

export interface EmbeddingDuplicateMatch {
  reportId: string;
  reportTitle: string;
  similarity: number;
  isPotentialDuplicate: boolean;
}

const CATEGORY_PROTOTYPES: Record<ReportCategory, string> = {
  'Water & Drainage': 'water drainage sewer flooding pipe leak overflow culvert stormwater manhole',
  'Roads & Traffic': 'road traffic pothole signal asphalt congestion street accident divider speed',
  'Public Sanitation': 'garbage waste trash dump bin litter smell odor debris cleanliness sweeping',
  'Power & Lighting': 'power electricity wire cable transformer pole blackout outage streetlight lamp voltage',
  'Parks & Environment': 'tree branch park grass garden plant lake pond wildlife foliage greenery',
  'Structural Safety': 'building wall crack collapse ceiling bridge pillar structure hazardous foundation',
  'Public Health': 'mosquito disease dengue malaria rodent infestation hygiene medical waste hazard',
  'Noise & Disturbance': 'noise loudspeaker music sound decibel construction night disturbance honking generator'
};

export interface AIServiceConfig {
  enabled: boolean;
  baseUrl: string | undefined;
  timeoutMs: number;
}

function loadAIServiceConfig(): AIServiceConfig {
  const enabled = process.env.AI_SERVICE_ENABLED === 'true';
  const baseUrl = process.env.AI_SERVICE_URL ? process.env.AI_SERVICE_URL.replace(/\/+$/, '') : undefined;
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS) || 5000;
  return { enabled, baseUrl, timeoutMs };
}

function safeLog(message: string, ...args: unknown[]): void {
  // Log without sensitive report/citizen data. Args should be non-PII metadata only.
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[SCIP AI Adapter] ${message}`, ...args);
  }
}

export class AIServiceAdapter {
  private config: AIServiceConfig;

  constructor() {
    this.config = loadAIServiceConfig();
    safeLog(
      'initialized',
      `enabled=${this.config.enabled}`,
      this.config.baseUrl ? `url=${this.config.baseUrl}` : 'url=unset',
      `timeoutMs=${this.config.timeoutMs}`
    );
  }

  /** Whether Python integration is enabled and a base URL is configured. */
  public isServiceEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.baseUrl);
  }

  /** Current non-sensitive service configuration. */
  public getConfig(): { enabled: boolean; baseUrl: string | undefined; timeoutMs: number } {
    return { ...this.config };
  }

  /**
   * Fetch with a configurable timeout and consistent error handling.
   * Returns the parsed JSON body on success; throws on network/timeout/HTTP errors.
   * Never logs request bodies (may contain citizen report text).
   */
  private async fetchWithTimeout(input: string, init: RequestInit): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!res.ok) {
        safeLog('python service HTTP error', `status=${res.status}`, `path=${input}`);
        throw new Error(`Python service returned HTTP ${res.status}`);
      }
      const data = await res.json();
      safeLog('python service response ok', `path=${input}`);
      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        safeLog('python service request timeout', `timeoutMs=${this.config.timeoutMs}`, `path=${input}`);
        throw new Error(`Python service request timed out after ${this.config.timeoutMs}ms`);
      }
      safeLog('python service request failed', `path=${input}`, `reason=${err?.message || String(err)}`);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Probe the Python service health endpoint. Resolves to true only when the
   * service is enabled, reachable, and returns a healthy status.
   * Never throws; failures are reported as false so callers can fall back.
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isServiceEnabled()) {
      return false;
    }
    try {
      const data = await this.fetchWithTimeout(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      return Boolean(data && data.status === 'healthy');
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Embedding generation (Python sentence-transformers service)
  // ------------------------------------------------------------------
  public async embed(text: string, modelId?: string): Promise<EmbeddingResult> {
    if (this.isServiceEnabled()) {
      try {
        const data = await this.fetchWithTimeout(`${this.config.baseUrl}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model_id: modelId })
        });
        return {
          embedding: data.embedding,
          dimension: data.dimension,
          modelId: data.model_id
        };
      } catch {
        // Fall through to local
      }
    }
    throw new Error('Embedding service unavailable and no local embedding engine configured');
  }

  public async embedBatch(texts: string[], modelId?: string): Promise<EmbeddingResult[]> {
    if (this.isServiceEnabled()) {
      try {
        const data = await this.fetchWithTimeout(`${this.config.baseUrl}/embed-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts, model_id: modelId })
        });
        return data.embeddings.map((emb: number[], i: number) => ({
          embedding: emb,
          dimension: data.dimension,
          modelId: data.model_id
        }));
      } catch {
        // Fall through
      }
    }
    throw new Error('Embedding batch service unavailable');
  }

  // ------------------------------------------------------------------
  // Semantic similarity via sentence-transformers embeddings
  // ------------------------------------------------------------------
  public async semanticSimilarity(textA: string, textB: string, modelId?: string): Promise<SemanticSimilarityResult> {
    if (this.isServiceEnabled()) {
      try {
        const data = await this.fetchWithTimeout(`${this.config.baseUrl}/semantic-similarity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_a: textA, text_b: textB, model_id: modelId })
        });
        return {
          similarity: data.similarity,
          modelId: data.model_id
        };
      } catch {
        // Fall through to local TF-IDF cosine similarity
      }
    }

    // Local TF-IDF fallback
    const { globalVectorizer } = await import('./tfidf.js');
    globalVectorizer.fit([
      { id: 'a', text: textA },
      { id: 'b', text: textB }
    ]);
    const vecA = globalVectorizer.transform(textA, 'a');
    const vecB = globalVectorizer.transform(textB, 'b');
    const sim = globalVectorizer.cosineSimilarity(vecA, vecB);
    return {
      similarity: sim,
      modelId: 'scip-local-ts-tfidf-v1.0'
    };
  }

  // ------------------------------------------------------------------
  // Classification (existing: Python keyword or local TF-IDF centroid)
  // ------------------------------------------------------------------
  public async classify(text: string, declaredCategory?: ReportCategory): Promise<AIClassificationResult> {
    if (this.isServiceEnabled()) {
      try {
        const data = await this.fetchWithTimeout(`${this.config.baseUrl}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, declared_category: declaredCategory })
        });
        return {
          predictedCategory: data.predicted_category,
          confidence: data.confidence,
          explanation: data.explanation,
          lowConfidenceReview: data.low_confidence_review,
          modelVersion: data.model_version
        };
      } catch {
        // Fall back to local engine
      }
    }

    const local = classifyReport(text, declaredCategory);
    return {
      predictedCategory: local.predictedCategory,
      confidence: local.confidence,
      explanation: `Locally classified by supervised centroid vectorizer with ${(local.confidence * 100).toFixed(0)}% confidence.`,
      lowConfidenceReview: local.confidence < 0.65,
      modelVersion: 'scip-local-ts-centroid-v1.0'
    };
  }

  // ------------------------------------------------------------------
  // Embedding-based classification (sentence-transformers via Python)
  // Compares input embedding against category prototype embeddings.
  // ------------------------------------------------------------------
  public async classifyWithEmbeddings(text: string, declaredCategory?: ReportCategory, modelId?: string): Promise<AIClassificationResult> {
    let selectedModelId = modelId;
    if (!selectedModelId && this.config.baseUrl) {
      const selection = modelRegistry.selectModel({ task: 'classification', framework: 'sentence-transformers', preferProduction: true });
      if (selection) {
        selectedModelId = selection.version; // use version as model_id hint
      }
    }

    if (this.isServiceEnabled() && selectedModelId) {
      try {
        // Embed the input text
        const inputEmbedding = await this.embed(text, selectedModelId);

        // Embed all category prototypes
        const categories = Object.keys(CATEGORY_PROTOTYPES) as ReportCategory[];
        const protoTexts = categories.map(c => CATEGORY_PROTOTYPES[c]);
        const protoEmbeddings = await this.embedBatch(protoTexts, selectedModelId);

        // Compute cosine similarity against each prototype
        let bestCategory: ReportCategory = declaredCategory || 'Water & Drainage';
        let bestSimilarity = -1;

        for (let i = 0; i < categories.length; i++) {
          const sim = this._cosineSimilarity(inputEmbedding.embedding, protoEmbeddings[i].embedding);
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestCategory = categories[i];
          }
        }

        const confidence = Math.max(0, Math.min(1, bestSimilarity));
        return {
          predictedCategory: bestCategory,
          confidence,
          explanation: `Embedding-based classification using sentence-transformers (${selectedModelId}). Best category match: ${bestSimilarity.toFixed(3)} cosine similarity.`,
          lowConfidenceReview: confidence < 0.65,
          modelVersion: `scip-embed-${selectedModelId}`
        };
      } catch {
        // Fall through to local TF-IDF
      }
    }

    // Local TF-IDF fallback
    const local = classifyReport(text, declaredCategory);
    return {
      predictedCategory: local.predictedCategory,
      confidence: local.confidence,
      explanation: `Embedding service unavailable. Locally classified by TF-IDF centroid with ${(local.confidence * 100).toFixed(0)}% confidence.`,
      lowConfidenceReview: local.confidence < 0.65,
      modelVersion: 'scip-local-ts-centroid-v1.0'
    };
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  // ------------------------------------------------------------------
  // Duplicate detection (existing: Python or local TF-IDF + Haversine)
  // ------------------------------------------------------------------
  public async checkDuplicates(target: Report, corpus: Report[]) {
    if (this.isServiceEnabled()) {
      try {
        const candidates = corpus
          .filter(c => c.id !== target.id)
          .map(c => ({
            id: c.id,
            text: `${c.title} ${c.description}`,
            latitude: c.latitude,
            longitude: c.longitude
          }));

        const data = await this.fetchWithTimeout(`${this.config.baseUrl}/duplicate-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_text: `${target.title} ${target.description}`,
            target_lat: target.latitude,
            target_lng: target.longitude,
            candidates
          })
        });

        return data;
      } catch {
        // Fall back to local engine
      }
    }

    return findSimilarAndDuplicateReports(target, corpus);
  }

  // ------------------------------------------------------------------
  // Embedding-based duplicate detection (sentence-transformers)
  // ------------------------------------------------------------------
  public async checkDuplicatesWithEmbeddings(target: Report, corpus: Report[], modelId?: string, threshold: number = 0.70) {
    const targetText = `${target.title} ${target.description}`;
    const targetEmbedding = await this.embed(targetText, modelId);

    const candidates = corpus.filter(c => c.id !== target.id);
    if (candidates.length === 0) {
      return {
        topSimilar: [],
        duplicateProbability: 0,
        highestMatch: undefined,
        evidence: ['No candidate reports in corpus']
      };
    }

    const candidateTexts = candidates.map(c => `${c.title} ${c.description}`);
    const candidateEmbeddings = await this.embedBatch(candidateTexts, modelId);

    const matches: EmbeddingDuplicateMatch[] = [];
    let bestSimilarity = -1;
    let bestMatch: EmbeddingDuplicateMatch | undefined;

    for (let i = 0; i < candidates.length; i++) {
      const sim = this._cosineSimilarity(targetEmbedding.embedding, candidateEmbeddings[i].embedding);
      const match: EmbeddingDuplicateMatch = {
        reportId: candidates[i].id,
        reportTitle: candidates[i].title,
        similarity: Number(sim.toFixed(4)),
        isPotentialDuplicate: sim >= threshold
      };
      matches.push(match);

      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = match;
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      topSimilar: matches.slice(0, 10),
      duplicateProbability: Number(bestSimilarity.toFixed(4)),
      highestMatch: bestMatch,
      evidence: [`Embedding-based duplicate detection using sentence-transformers (${targetEmbedding.modelId})`, `Threshold: ${threshold}`, `Evaluated against ${candidates.length} candidate reports`]
    };
  }

  // ------------------------------------------------------------------
  // Model registry integration
  // ------------------------------------------------------------------
  public getModelForTask(task: ModelTask, framework?: ModelFramework): { modelName: string; version: string; framework: ModelFramework } | null {
    const selection = modelRegistry.selectModel({ task, framework, preferProduction: true });
    if (!selection) return null;
    return {
      modelName: selection.modelName,
      version: selection.version,
      framework: selection.framework
    };
  }

  public recordModelPerformance(modelName: string, version: string, performance: { task: ModelTask; accuracy?: number; precision?: number; recall?: number; f1Score?: number; sampleCount: number; evaluatedAt?: string; inferenceLatencyMs?: number; notes?: string }): void {
    modelRegistry.recordPerformance({
      modelName,
      version,
      performance: {
        task: performance.task,
        accuracy: performance.accuracy ?? 0,
        precision: performance.precision ?? 0,
        recall: performance.recall ?? 0,
        f1Score: performance.f1Score ?? 0,
        sampleCount: performance.sampleCount,
        evaluatedAt: performance.evaluatedAt ?? new Date().toISOString(),
        inferenceLatencyMs: performance.inferenceLatencyMs,
        notes: performance.notes
      }
    });
  }

  public getRegistryStats() {
    return modelRegistry.getStats();
  }
}

export const aiAdapter = new AIServiceAdapter();
