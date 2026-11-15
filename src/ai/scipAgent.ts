// SCIP AI/ML Foundation - SCIP Intelligence Agent
// Orchestrates 10 specialized intelligence tools to transform community observations into structured decision support.
// Strictly adheres to the Responsible AI principle and transparency standards.

import { Report, Incident, AgentBriefing, AgentToolResult, IncidentPriority } from '../types/scip';
import { classifyReport, extractEntities, determineSeverity } from './classifier';
import { globalVectorizer } from './tfidf';
import { findSimilarAndDuplicateReports, calculateHaversineDistance } from './duplicateDetector';
import { detectIncidentClusters } from './incidentClustering';
import { computeExplainableRisk } from './riskScorer';
import { aiAdapter } from './aiServiceAdapter';
import { isLLMAgentEnabled, runLLMAgent } from './llmAgent';

export interface AgentContext {
  reports: Report[];
  incidents: Incident[];
}

const UNCERTAINTY_DISCLAIMER =
  'RESPONSIBLE-AI NOTICE: This intelligence brief is an algorithmic analytical interpretation synthesizing citizen observations. It does not constitute a certified field inspection or final administrative decision. Human officers must verify ground conditions.';

function computeAgentConfidence(toolResults: AgentToolResult[]): number {
  if (toolResults.length === 0) return 0.3;
  const score = toolResults.reduce((acc, t) => {
    if (t.status === 'success') return acc + 1;
    if (t.status === 'partial') return acc + 0.6;
    return acc + 0.3;
  }, 0) / toolResults.length;
  return Number(Math.max(0.3, Math.min(0.95, score)).toFixed(2));
}

export class SCIPIntelligenceAgent {
  private reports: Report[];
  private incidents: Incident[];

  constructor(context: AgentContext) {
    this.reports = context.reports;
    this.incidents = context.incidents;
    // Ensure TF-IDF vectorizer is fitted on the reports corpus
    globalVectorizer.fit(
      this.reports.map(r => ({ id: r.id, text: `${r.title} ${r.description} ${r.category} ${r.locationName}` }))
    );
  }

  // Tool 1: Classification Tool
  public toolClassification(text: string, declaredCategory?: any): AgentToolResult {
    const start = performance.now();
    const result = classifyReport(text, declaredCategory);
    return {
      toolName: 'Classification Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Classified as "${result.predictedCategory}" with ${(result.confidence * 100).toFixed(0)}% confidence`,
      data: result
    };
  }

  // Tool 2: Entity Extraction Tool
  public async toolEntityExtraction(text: string): Promise<AgentToolResult> {
    const start = performance.now();
    const nerResult = await aiAdapter.ner(text);
    const entities = {
      locations: nerResult.locations,
      infrastructure: nerResult.infrastructure,
      hazards: nerResult.hazards,
      temporal: extractEntities(text).temporal
    };
    const count = entities.locations.length + entities.infrastructure.length + entities.hazards.length;
    return {
      toolName: 'Entity Extraction Tool',
      status: count > 0 ? 'success' : 'partial',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Extracted ${entities.locations.length} locations, ${entities.infrastructure.length} infrastructure elements, ${entities.hazards.length} hazard markers`,
      data: entities,
      modelVersion: nerResult.modelVersion
    };
  }

  // Tool 3: Similarity Tool
  public toolSimilarity(targetReportId: string, limit: number = 5): AgentToolResult {
    const start = performance.now();
    const target = this.reports.find(r => r.id === targetReportId);
    if (!target) {
      return {
        toolName: 'Similarity Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `Target report ${targetReportId} not found in database`,
        data: null
      };
    }

    const { topSimilar } = findSimilarAndDuplicateReports(target, this.reports);
    return {
      toolName: 'Similarity Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Computed cosine vector similarity against ${this.reports.length - 1} corpus documents; returned ${topSimilar.length} matches`,
      data: topSimilar.slice(0, limit)
    };
  }

  // Tool 4: Duplicate Detection Tool
  public toolDuplicateDetection(targetReportId: string): AgentToolResult {
    const start = performance.now();
    const target = this.reports.find(r => r.id === targetReportId);
    if (!target) {
      return {
        toolName: 'Duplicate Detection Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `Target report ${targetReportId} not found`,
        data: null
      };
    }

    const dupAnalysis = findSimilarAndDuplicateReports(target, this.reports);
    const isDup = dupAnalysis.duplicateProbability >= 0.70;
    return {
      toolName: 'Duplicate Detection Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: isDup
        ? `Potential duplicate detected with ${(dupAnalysis.duplicateProbability * 100).toFixed(0)}% probability`
        : `Unique observation; duplicate probability ${(dupAnalysis.duplicateProbability * 100).toFixed(0)}%`,
      data: dupAnalysis
    };
  }

  // Tool 5: Geospatial Analysis Tool
  public toolGeospatialAnalysis(centerLat: number, centerLng: number, radiusMeters: number = 1000): AgentToolResult {
    const start = performance.now();
    const nearbyReports = this.reports.map(r => {
      const dist = calculateHaversineDistance(centerLat, centerLng, r.latitude, r.longitude);
      return { report: r, distanceMeters: dist };
    }).filter(item => item.distanceMeters <= radiusMeters);

    nearbyReports.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Density calculation: reports per square kilometer
    const areaSqKm = (Math.PI * Math.pow(radiusMeters / 1000, 2)) || 0.1;
    const densityPerSqKm = Number((nearbyReports.length / areaSqKm).toFixed(1));

    return {
      toolName: 'Geospatial Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Found ${nearbyReports.length} reports within ${radiusMeters}m (Density: ${densityPerSqKm} reports/km²)`,
      data: {
        radiusMeters,
        totalFound: nearbyReports.length,
        densityPerSqKm,
        reports: nearbyReports.slice(0, 10).map(nr => ({
          id: nr.report.id,
          title: nr.report.title,
          category: nr.report.category,
          distanceMeters: nr.distanceMeters,
          location: nr.report.locationName
        }))
      }
    };
  }

  // Tool 6: Incident Clustering Tool
  public toolIncidentClustering(): AgentToolResult {
    const start = performance.now();
    const clusters = detectIncidentClusters(this.reports);
    return {
      toolName: 'Incident Clustering Tool',
      status: clusters.length > 0 ? 'success' : 'partial',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Detected ${clusters.length} spatio-temporal report clusters representing potential municipal incidents`,
      data: clusters
    };
  }

  // Tool 7: Trend Analysis Tool
  public toolTrendAnalysis(categoryFilter?: string): AgentToolResult {
    const start = performance.now();
    const targetReports = categoryFilter
      ? this.reports.filter(r => r.category === categoryFilter)
      : this.reports;

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    for (const r of targetReports) {
      categoryDistribution[r.category] = (categoryDistribution[r.category] || 0) + 1;
    }

    // Daily breakdown for the last 7 days
    const dailyCounts: Record<string, number> = {};
    for (const r of targetReports) {
      const day = r.createdAt.split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    // Location frequency
    const locationCounts: Record<string, number> = {};
    for (const r of targetReports) {
      locationCounts[r.locationName] = (locationCounts[r.locationName] || 0) + 1;
    }

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc, count]) => ({ location: loc, count }));

    return {
      toolName: 'Trend Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Analyzed ${targetReports.length} reports across ${Object.keys(categoryDistribution).length} categories; primary hotspot: ${topLocations[0]?.location || 'N/A'}`,
      data: {
        totalReports: targetReports.length,
        categoryDistribution,
        dailyCounts,
        topLocations
      }
    };
  }

  // Tool 8: Risk Analysis Tool
  public async toolRiskAnalysis(reportIds: string[]): Promise<AgentToolResult> {
    const start = performance.now();
    const matchingReports = this.reports.filter(r => reportIds.includes(r.id));
    if (matchingReports.length === 0) {
      return {
        toolName: 'Risk Analysis Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: 'No reports found for provided IDs',
        data: null
      };
    }

    const loc = matchingReports[0].locationName;
    const isHotspot = loc.toLowerCase().includes('sector 4') || loc.toLowerCase().includes('market');

    // Python AI service prioritization when enabled, local TS fallback
    let riskScoreResult: { score: number; priority: IncidentPriority; explanation: string };
    if (aiAdapter.isServiceEnabled()) {
      try {
        riskScoreResult = await aiAdapter.prioritize({
          severity: matchingReports[0].urgency,
          reportCount: matchingReports.length,
          isHotspot,
          affectedInfrastructure: false
        });
      } catch {
        const risk = computeExplainableRisk({
          entityType: 'incident',
          entityId: `EVAL-${Date.now().toString().slice(-4)}`,
          reports: matchingReports,
          locationName: loc,
          isRecurrentHotspot: isHotspot,
          declaredUrgency: undefined,
          inferredUrgencyFromKeywords: undefined
        });
        riskScoreResult = { score: risk.score, priority: risk.priority, explanation: risk.explanation };
      }
    } else {
      const risk = computeExplainableRisk({
        entityType: 'incident',
        entityId: `EVAL-${Date.now().toString().slice(-4)}`,
        reports: matchingReports,
        locationName: loc,
        isRecurrentHotspot: isHotspot,
        declaredUrgency: undefined,
        inferredUrgencyFromKeywords: undefined
      });
      riskScoreResult = { score: risk.score, priority: risk.priority, explanation: risk.explanation };
    }

    return {
      toolName: 'Risk Analysis Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Computed risk score of ${riskScoreResult.score}/100 (${riskScoreResult.priority})`,
      data: {
        score: riskScoreResult.score,
        priority: riskScoreResult.priority,
        explanation: riskScoreResult.explanation,
        factors: []
      }
    };
  }

  // Tool 9: Evidence Retrieval Tool
  public toolEvidenceRetrieval(incidentOrClusterId: string): AgentToolResult {
    const start = performance.now();
    const incident = this.incidents.find(i => i.id === incidentOrClusterId);

    let relatedReports: Report[] = [];
    if (incident) {
      relatedReports = this.reports.filter(r => incident.reportIds.includes(r.id));
    } else {
      // Check if it corresponds to an active cluster
      const clusters = detectIncidentClusters(this.reports);
      const cluster = clusters.find(c => c.clusterId === incidentOrClusterId);
      if (cluster) {
        relatedReports = this.reports.filter(r => cluster.reportIds.includes(r.id));
      }
    }

    if (relatedReports.length === 0) {
      return {
        toolName: 'Evidence Retrieval Tool',
        status: 'insufficient_evidence',
        executionTimeMs: Number((performance.now() - start).toFixed(2)),
        summary: `No correlated observations retrieved for ${incidentOrClusterId}`,
        data: []
      };
    }

    const evidenceItems = relatedReports.map(r => ({
      reportId: r.id,
      title: r.title,
      description: r.description,
      locationName: r.locationName,
      coordinates: [r.latitude, r.longitude],
      reportedAt: r.createdAt,
      urgency: r.urgency
    }));

    return {
      toolName: 'Evidence Retrieval Tool',
      status: 'success',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      summary: `Retrieved ${evidenceItems.length} ground truth citizen observations`,
      data: evidenceItems
    };
  }

  // Tool 10: Intelligence Report Tool
  public toolIntelligenceReport(query: string, toolResults: AgentToolResult[]): AgentBriefing {
    const toolsRun = toolResults.map(t => t.toolName);
    const clusteringResult = toolResults.find(t => t.toolName === 'Incident Clustering Tool');
    const riskResult = toolResults.find(t => t.toolName === 'Risk Analysis Tool');
    const geoResult = toolResults.find(t => t.toolName === 'Geospatial Analysis Tool');

    let summary = `SCIP Intelligence synthesis executed across ${toolResults.length} analytical tools. `;
    const actions: string[] = [];

    if (clusteringResult && clusteringResult.data?.length > 0) {
      const count = clusteringResult.data.length;
      summary += `Identified ${count} active spatio-temporal cluster(s) with correlated ground reports. `;
      actions.push(`Route cluster observations to Human Review Queue for administrative confirmation.`);
    }

    if (riskResult && riskResult.data) {
      const risk = riskResult.data;
      summary += `Assessed risk level as ${risk.priority} (Score: ${risk.score}/100) driven by ${risk.factors[0]?.factor}. `;
      if (risk.score >= 70) {
        actions.push(`Immediate operational dispatch recommended for high-priority hazard.`);
      }
    }

    if (geoResult && geoResult.data) {
      summary += `Geospatial density observed at ${geoResult.data.densityPerSqKm} reports/km² within ${geoResult.data.radiusMeters}m perimeter. `;
    }

    // Specific grounded natural-language answers based on query intent
    const qLower = query.toLowerCase();
    if (qLower.includes('frequently reported') || qLower.includes('most frequent') || qLower.includes('top problem')) {
      const catCounts: Record<string, number> = {};
      this.reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        summary += `The most frequently reported issue across the community is "${topCat[0]}" with ${topCat[1]} reported observations. `;
      }
    } else if (qLower.includes('require attention') || qLower.includes('need attention') || qLower.includes('urgent')) {
      const pendingIncidents = this.incidents.filter(i => i.status === 'potential' || (i.status === 'confirmed' && (i.priority === 'P1' || i.priority === 'P2')));
      summary += `Currently, ${pendingIncidents.length} incident(s) require urgent attention, including "${pendingIncidents[0]?.title || 'high-priority safety clusters'}". `;
      actions.push(`Expedite field dispatch for high-priority incidents.`);
    } else if (qLower.includes('recurring') || qLower.includes('recurring reports') || qLower.includes('hotspot')) {
      const locCounts: Record<string, number> = {};
      this.reports.forEach(r => { locCounts[r.locationName] = (locCounts[r.locationName] || 0) + 1; });
      const repeatLocs = Object.entries(locCounts).filter(([_, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
      summary += `Recurring reports are concentrated in: ${repeatLocs.map(([l, c]) => `${l} (${c} reports)`).slice(0, 3).join(', ')}. `;
    } else if (qLower.includes('resolution status') || qLower.includes('current resolution') || qLower.includes('progress')) {
      const resolved = this.incidents.filter(i => i.status === 'resolved').length;
      const total = this.incidents.length;
      const rate = total > 0 ? ((resolved / total) * 100).toFixed(0) : '0';
      summary += `Municipal resolution progress: ${resolved} of ${total} incidents resolved (${rate}% completion rate). `;
    }

    actions.push('Require designated authority officer review prior to municipal work order creation.');

    return {
      id: `BRIEF-${Date.now().toString().slice(-6)}`,
      query,
      timestamp: new Date().toISOString(),
      executiveSummary: summary,
      confidence: computeAgentConfidence(toolResults),
      toolResults,
      recommendedActions: actions,
      uncertaintyDisclaimer: UNCERTAINTY_DISCLAIMER,
      modelUsed: 'scip-rules-v1'
    };
  }

  public async executeToolByName(name: string, args: Record<string, any>): Promise<AgentToolResult> {
    const a = args || {};
    switch (name) {
      case 'classification':
        return this.toolClassification(String(a.text ?? ''), a.declaredCategory);
      case 'entity_extraction':
        return await this.toolEntityExtraction(String(a.text ?? ''));
      case 'similarity':
        return this.toolSimilarity(String(a.reportId ?? ''), Number(a.limit) > 0 ? Number(a.limit) : 5);
      case 'duplicate_detection':
        return this.toolDuplicateDetection(String(a.reportId ?? ''));
      case 'geospatial_analysis': {
        const lat = Math.max(-90, Math.min(90, Number(a.lat) || 0));
        const lng = Math.max(-180, Math.min(180, Number(a.lng) || 0));
        const radius = Number(a.radiusMeters) > 0 ? Number(a.radiusMeters) : 1000;
        return this.toolGeospatialAnalysis(lat, lng, radius);
      }
      case 'incident_clustering':
        return this.toolIncidentClustering();
      case 'trend_analysis':
        return this.toolTrendAnalysis(typeof a.category === 'string' && a.category.trim() ? a.category : undefined);
      case 'risk_analysis':
        return await this.toolRiskAnalysis(Array.isArray(a.reportIds) ? a.reportIds.map(String) : []);
      case 'evidence_retrieval':
        return this.toolEvidenceRetrieval(String(a.incidentOrClusterId ?? ''));
      default:
        return {
          toolName: name,
          status: 'insufficient_evidence',
          executionTimeMs: 0,
          summary: `Unknown tool requested: ${name}`,
          data: null
        };
    }
  }

  /**
   * Main Agent Execution Pipeline: Receives a query or intent, selects tools, executes them,
   * and compiles the final intelligence synthesis.
   */
  public async executeIntelligenceQuery(query: string, specificTool?: string): Promise<AgentBriefing> {
    if (!specificTool && isLLMAgentEnabled()) {
      try {
        const llm = await runLLMAgent({ query, executeTool: (name, args) => this.executeToolByName(name, args) });
        const actions = llm.recommendedActions.length > 0
          ? llm.recommendedActions
          : ['Require designated authority officer review prior to municipal work order creation.'];
        return {
          id: `BRIEF-${Date.now().toString().slice(-6)}`,
          query,
          timestamp: new Date().toISOString(),
          executiveSummary: llm.summary,
          confidence: computeAgentConfidence(llm.toolResults),
          toolResults: llm.toolResults,
          recommendedActions: actions,
          uncertaintyDisclaimer: UNCERTAINTY_DISCLAIMER,
          modelUsed: llm.model
        };
      } catch {
        // LLM unavailable or failed: fall through to the deterministic rules-based agent.
      }
    }

    const qLower = query.toLowerCase();
    const toolResults: AgentToolResult[] = [];

    if (specificTool) {
      switch (specificTool) {
        case 'clustering':
          toolResults.push(this.toolIncidentClustering());
          break;
        case 'trends':
          toolResults.push(this.toolTrendAnalysis());
          break;
        case 'hotspots':
          toolResults.push(this.toolGeospatialAnalysis(28.6139, 77.2090, 800));
          break;
        case 'entities':
          toolResults.push(await this.toolEntityExtraction(query));
          break;
      }
    } else {
      // Intelligent Tool Orchestration based on query semantics
      if (qLower.includes('cluster') || qLower.includes('incident') || qLower.includes('flood') || qLower.includes('drain') || qLower.includes('require attention')) {
        toolResults.push(this.toolIncidentClustering());
      }

      if (qLower.includes('sector 4') || qLower.includes('market') || qLower.includes('near') || qLower.includes('area') || qLower.includes('recurring') || qLower.includes('hotspot')) {
        toolResults.push(this.toolGeospatialAnalysis(28.6139, 77.2090, 600));
      }

      if (qLower.includes('risk') || qLower.includes('priority') || qLower.includes('hazard') || qLower.includes('attention')) {
        const topRepIds = this.reports.slice(0, 3).map(r => r.id);
        toolResults.push(await this.toolRiskAnalysis(topRepIds));
      }

      if (qLower.includes('trend') || qLower.includes('recurrence') || qLower.includes('frequency') || qLower.includes('stat') || qLower.includes('problem') || qLower.includes('status')) {
        toolResults.push(this.toolTrendAnalysis());
      }

      if (qLower.includes('entity') || qLower.includes('extract') || qLower.length > 20) {
        toolResults.push(await this.toolEntityExtraction(query));
      }

      // Default fallback if no specific tool was selected
      if (toolResults.length === 0) {
        toolResults.push(this.toolIncidentClustering());
        toolResults.push(this.toolTrendAnalysis());
      }
    }

    return this.toolIntelligenceReport(query, toolResults);
  }
}
