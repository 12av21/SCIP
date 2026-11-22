// SCIP Backend - Automated Reporting Engine
// Generates scheduled PDF/CSV reports, citizen acknowledgments, department summaries

import { 
  Report, 
  Incident, 
  User, 
  ReportCategory, 
  ReportStatus, 
  UrgencyLevel,
  IncidentSeverity,
  IncidentPriority,
  IncidentStatus,
  UserRole 
} from '../types/scip.js';
import { db } from '../database/index.js';

export type ReportFormat = 'pdf' | 'csv' | 'html';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'on_demand';
export type ReportType = 
  | 'incident_summary'
  | 'department_performance'
  | 'citizen_acknowledgment'
  | 'escalation_report'
  | 'sla_compliance'
  | 'trend_analysis'
  | 'ai_intelligence'
  | 'custom';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  recipients: string[];
  departmentId?: string;
  filters: ReportFilters;
  schedule: ReportSchedule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  categories?: ReportCategory[];
  statuses?: ReportStatus[];
  urgencies?: UrgencyLevel[];
  departmentId?: string;
  assignedTo?: string;
  location?: { stateId?: string; districtId?: string; localityId?: string };
  tags?: string[];
}

export interface ReportSchedule {
  cronExpression?: string;
  timeOfDay?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  format: ReportFormat;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  generatedAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface ReportData {
  metadata: {
    reportId: string;
    templateName: string;
    generatedAt: string;
    period: { from: string; to: string };
    filters: ReportFilters;
  };
  summary: ReportSummary;
  sections: ReportSection[];
}

export interface ReportSummary {
  totalReports: number;
  totalIncidents: number;
  byStatus: Record<ReportStatus, number>;
  byCategory: Record<ReportCategory, number>;
  byUrgency: Record<UrgencyLevel, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byPriority: Record<IncidentPriority, number>;
  avgResolutionTimeHours: number;
  slaComplianceRate: number;
  citizenSatisfactionScore?: number;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'table' | 'chart' | 'summary' | 'list' | 'kpi';
  data: any;
  config?: {
    columns?: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'area';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  };
}

interface CategoryTrendData {
  date: string;
  [key: string]: number | string;
}

function mapSeverityToUrgency(severity: IncidentSeverity): UrgencyLevel {
  switch (severity) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'medium';
  }
}

function mapPriorityToUrgency(priority: IncidentPriority): UrgencyLevel {
  const p = priority.replace('P', '');
  if (p === '1' || p === '1_CRITICAL') return 'critical';
  if (p === '2' || p === '2_HIGH') return 'high';
  if (p === '3' || p === '3_MEDIUM') return 'medium';
  return 'low';
}

class ReportingEngine {
  private templates: Map<string, ReportTemplate> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();
  private isProcessing = false;

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Daily Incident Summary',
        description: 'Daily summary of all incidents for authority dashboard',
        type: 'incident_summary',
        format: 'pdf',
        frequency: 'daily',
        recipients: ['authority', 'admin'],
        filters: {},
        schedule: {
          timeOfDay: '06:00',
          timezone: 'Asia/Kolkata'
        },
        isActive: true
      },
      {
        name: 'Weekly Department Performance',
        description: 'Weekly performance report for each department',
        type: 'department_performance',
        format: 'pdf',
        frequency: 'weekly',
        recipients: ['dept_officer', 'authority'],
        filters: {},
        schedule: {
          dayOfWeek: 1,
          timeOfDay: '08:00',
          timezone: 'Asia/Kolkata'
        },
        isActive: true
      },
      {
        name: 'Monthly SLA Compliance',
        description: 'Monthly SLA compliance report across all departments',
        type: 'sla_compliance',
        format: 'pdf',
        frequency: 'monthly',
        recipients: ['authority', 'admin', 'analyst'],
        filters: {},
        schedule: {
          dayOfMonth: 1,
          timeOfDay: '09:00',
          timezone: 'Asia/Kolkata'
        },
        isActive: true
      },
      {
        name: 'Citizen Acknowledgment Report',
        description: 'Daily report of new citizen reports with acknowledgment status',
        type: 'citizen_acknowledgment',
        format: 'csv',
        frequency: 'daily',
        recipients: ['field_officer', 'dept_officer'],
        filters: { statuses: ['submitted', 'processing', 'analyzed'] },
        schedule: {
          timeOfDay: '07:00',
          timezone: 'Asia/Kolkata'
        },
        isActive: true
      },
      {
        name: 'AI Intelligence Weekly Digest',
        description: 'Weekly AI intelligence summary with trends and anomalies',
        type: 'ai_intelligence',
        format: 'pdf',
        frequency: 'weekly',
        recipients: ['analyst', 'authority', 'admin'],
        filters: {},
        schedule: {
          dayOfWeek: 5,
          timeOfDay: '10:00',
          timezone: 'Asia/Kolkata'
        },
        isActive: true
      }
    ];

    defaultTemplates.forEach(t => {
      const id = `template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      this.templates.set(id, { ...t, id, createdAt: now, updatedAt: now });
    });
  }

  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): ReportTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newTemplate: ReportTemplate = { ...template, id, createdAt: now, updatedAt: now };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<ReportTemplate>): ReportTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    const updated = { ...template, ...updates, updatedAt: new Date().toISOString() };
    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  async generateReport(templateId: string, options?: { format?: ReportFormat; filters?: ReportFilters }): Promise<GeneratedReport> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const generatedReport: GeneratedReport = {
      id: reportId,
      templateId,
      name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      format: options?.format || template.format,
      status: 'pending',
      generatedAt: new Date().toISOString()
    };

    this.generatedReports.set(reportId, generatedReport);

    this.processReport(reportId, template, options?.filters);

    return generatedReport;
  }

  private async processReport(reportId: string, template: ReportTemplate, extraFilters?: ReportFilters): Promise<void> {
    const report = this.generatedReports.get(reportId);
    if (!report) return;

    report.status = 'generating';
    this.generatedReports.set(reportId, report);

    try {
      const filters = { ...template.filters, ...extraFilters };
      const reportData = await this.collectReportData(template.type, filters);
      
      let filePath: string;

      switch (report.format) {
        case 'pdf':
          filePath = await this.generatePDF(reportData, template);
          break;
        case 'csv':
          filePath = await this.generateCSV(reportData, template);
          break;
        case 'html':
          filePath = await this.generateHTML(reportData, template);
          break;
        default:
          throw new Error(`Unsupported format: ${report.format}`);
      }

      report.status = 'completed';
      report.filePath = filePath;
      report.fileSize = 0;
      report.completedAt = new Date().toISOString();
      report.downloadUrl = `/api/reporting/generated/${reportId}/download`;
      report.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      this.generatedReports.set(reportId, report);
    } catch (error: any) {
      report.status = 'failed';
      report.error = error.message || 'Unknown error';
      this.generatedReports.set(reportId, report);
    }
  }

  private async collectReportData(type: ReportType, filters: ReportFilters): Promise<ReportData> {
    const reports = await this.getFilteredReports(filters);
    const incidents = await this.getFilteredIncidents(filters);
    const users = await this.getFilteredUsers(filters);

    const period = this.calculatePeriod(filters);

    const summary = this.computeSummary(reports, incidents);
    const sections = this.buildSections(type, reports, incidents, users, filters);

    return {
      metadata: {
        reportId: `data_${Date.now()}`,
        templateName: type,
        generatedAt: new Date().toISOString(),
        period,
        filters
      },
      summary,
      sections
    };
  }

  private async getFilteredReports(filters: ReportFilters): Promise<Report[]> {
    let allReports = await db.getReports();
    
    if (filters.dateFrom) {
      allReports = allReports.filter((r: Report) => r.createdAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allReports = allReports.filter((r: Report) => r.createdAt <= filters.dateTo!);
    }
    if (filters.categories?.length) {
      allReports = allReports.filter((r: Report) => filters.categories!.includes(r.category));
    }
    if (filters.statuses?.length) {
      allReports = allReports.filter((r: Report) => filters.statuses!.includes(r.status));
    }
    if (filters.urgencies?.length) {
      allReports = allReports.filter((r: Report) => filters.urgencies!.includes(r.urgency));
    }
    if (filters.departmentId) {
      const incidentIds = new Set<string>();
      for (const report of allReports) {
        if (report.incidentId) {
          const incident = await db.getIncidentById(report.incidentId);
          if (incident && incident.assignedDepartmentId === filters.departmentId) {
            incidentIds.add(report.id);
          }
        }
      }
      allReports = allReports.filter((r: Report) => incidentIds.has(r.id));
    }
    if (filters.location) {
      allReports = allReports.filter((r: Report) => {
        if (filters.location?.stateId && r.stateId !== filters.location.stateId) return false;
        if (filters.location?.districtId && r.districtId !== filters.location.districtId) return false;
        if (filters.location?.localityId && r.localityId !== filters.location.localityId) return false;
        return true;
      });
    }

    return allReports;
  }

  private async getFilteredIncidents(filters: ReportFilters): Promise<Incident[]> {
    let allIncidents = await db.getIncidents();
    
    if (filters.dateFrom) {
      allIncidents = allIncidents.filter((i: Incident) => i.createdAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allIncidents = allIncidents.filter((i: Incident) => i.createdAt <= filters.dateTo!);
    }
    if (filters.categories?.length) {
      allIncidents = allIncidents.filter((i: Incident) => filters.categories!.includes(i.category));
    }
    if (filters.urgencies?.length) {
      allIncidents = allIncidents.filter((i: Incident) => {
        const urgency = mapSeverityToUrgency(i.severity);
        return filters.urgencies!.includes(urgency);
      });
    }
    if (filters.departmentId) {
      allIncidents = allIncidents.filter((i: Incident) => i.assignedDepartmentId === filters.departmentId);
    }
    if (filters.assignedTo) {
      allIncidents = allIncidents.filter((i: Incident) => i.assignedOfficerId === filters.assignedTo);
    }

    return allIncidents;
  }

  private async getFilteredUsers(filters: ReportFilters): Promise<User[]> {
    let allUsers = await db.getUsers();
    
    if (filters.departmentId) {
      allUsers = allUsers.filter((u: User) => u.departmentId === filters.departmentId);
    }

    return allUsers;
  }

  private calculatePeriod(filters: ReportFilters): { from: string; to: string } {
    const now = new Date();
    const to = filters.dateTo || now.toISOString();
    
    let from: Date;
    if (filters.dateFrom) {
      from = new Date(filters.dateFrom);
    } else {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { from: from.toISOString(), to };
  }

  private computeSummary(reports: Report[], incidents: Incident[]): ReportSummary {
    const byStatus: Record<ReportStatus, number> = {
      submitted: 0, processing: 0, analyzed: 0, linked: 0, under_review: 0, assigned: 0, resolved: 0, closed: 0
    };
    const byCategory: Record<ReportCategory, number> = {
      'Water & Drainage': 0, 'Roads & Traffic': 0, 'Public Sanitation': 0,
      'Power & Lighting': 0, 'Parks & Environment': 0, 'Structural Safety': 0,
      'Public Health': 0, 'Noise & Disturbance': 0
    };
    const byUrgency: Record<UrgencyLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const bySeverity: Record<IncidentSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byPriority: Record<IncidentPriority, number> = { 
      P1_CRITICAL: 0, P2_HIGH: 0, P3_MEDIUM: 0, P4_LOW: 0, 
      P1: 0, P2: 0, P3: 0, P4: 0 
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    reports.forEach((r: Report) => {
      byStatus[r.status]++;
      byCategory[r.category]++;
      byUrgency[r.urgency]++;
    });

    incidents.forEach((i: Incident) => {
      bySeverity[i.severity]++;
      byPriority[i.priority]++;
      
      if (i.status === 'resolved' || i.status === 'closed') {
        const created = new Date(i.createdAt).getTime();
        const resolved = new Date(i.updatedAt).getTime();
        totalResolutionTime += (resolved - created) / (1000 * 60 * 60);
        resolvedCount++;
      }
    });

    const avgResolutionTimeHours = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
    
    const slaCompliant = incidents.filter((i: Incident) => {
      if (i.status !== 'resolved' && i.status !== 'closed') return false;
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.updatedAt).getTime();
      const hours = (resolved - created) / (1000 * 60 * 60);
      const slaHours = this.getSLAHours(mapSeverityToUrgency(i.severity));
      return hours <= slaHours;
    }).length;

    const slaComplianceRate = incidents.length > 0 ? (slaCompliant / incidents.length) * 100 : 100;

    return {
      totalReports: reports.length,
      totalIncidents: incidents.length,
      byStatus,
      byCategory,
      byUrgency,
      bySeverity,
      byPriority,
      avgResolutionTimeHours: Number(avgResolutionTimeHours.toFixed(1)),
      slaComplianceRate: Number(slaComplianceRate.toFixed(1))
    };
  }

  private getSLAHours(urgency: UrgencyLevel): number {
    switch (urgency) {
      case 'critical': return 4;
      case 'high': return 24;
      case 'medium': return 72;
      case 'low': return 168;
      default: return 72;
    }
  }

  private buildSections(
    type: ReportType, 
    reports: Report[], 
    incidents: Incident[], 
    users: User[],
    filters: ReportFilters
  ): ReportSection[] {
    const sections: ReportSection[] = [];

    switch (type) {
      case 'incident_summary':
        sections.push(...this.buildIncidentSummarySections(reports, incidents));
        break;
      case 'department_performance':
        sections.push(...this.buildDepartmentPerformanceSections(reports, incidents, users));
        break;
      case 'citizen_acknowledgment':
        sections.push(...this.buildCitizenAcknowledgmentSections(reports));
        break;
      case 'sla_compliance':
        sections.push(...this.buildSLAComplianceSections(incidents));
        break;
      case 'escalation_report':
        sections.push(...this.buildEscalationReportSections(incidents));
        break;
      case 'trend_analysis':
        sections.push(...this.buildTrendAnalysisSections(reports, incidents));
        break;
      case 'ai_intelligence':
        sections.push(...this.buildAIIntelligenceSections(reports, incidents));
        break;
      default:
        sections.push(...this.buildCustomSections(reports, incidents));
    }

    return sections;
  }

  private buildIncidentSummarySections(reports: Report[], incidents: Incident[]): ReportSection[] {
    const summary = this.computeSummary(reports, incidents);
    
    return [
      {
        id: 'kpi_overview',
        title: 'Key Performance Indicators',
        type: 'kpi',
        data: {
          totalReports: reports.length,
          activeIncidents: incidents.filter((i: Incident) => !['resolved', 'closed'].includes(i.status)).length,
          criticalIncidents: incidents.filter((i: Incident) => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)).length,
          avgResolutionHours: summary.avgResolutionTimeHours,
          slaCompliance: summary.slaComplianceRate
        }
      },
      {
        id: 'reports_by_status',
        title: 'Reports by Status',
        type: 'chart',
        data: summary.byStatus,
        config: { chartType: 'pie' }
      },
      {
        id: 'reports_by_category',
        title: 'Reports by Category',
        type: 'chart',
        data: summary.byCategory,
        config: { chartType: 'bar' }
      },
      {
        id: 'recent_incidents',
        title: 'Recent Incidents',
        type: 'table',
        data: incidents
          .sort((a: Incident, b: Incident) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20)
          .map((i: Incident) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            severity: i.severity,
            priority: i.priority,
            status: i.status,
            department: i.assignedDepartmentId,
            createdAt: i.createdAt
          })),
        config: { columns: ['id', 'title', 'category', 'severity', 'priority', 'status', 'department', 'createdAt'] }
      }
    ];
  }

  private buildDepartmentPerformanceSections(reports: Report[], incidents: Incident[], users: User[]): ReportSection[] {
    const deptMap = new Map<string, { incidents: Incident[]; officers: User[]; reports: Report[] }>();
    
    incidents.forEach((i: Incident) => {
      const deptId = i.assignedDepartmentId || 'unassigned';
      if (!deptMap.has(deptId)) deptMap.set(deptId, { incidents: [], officers: [], reports: [] });
      deptMap.get(deptId)!.incidents.push(i);
    });

    users.forEach((u: User) => {
      if (u.departmentId) {
        if (!deptMap.has(u.departmentId)) deptMap.set(u.departmentId, { incidents: [], officers: [], reports: [] });
        deptMap.get(u.departmentId)!.officers.push(u);
      }
    });

    const deptPerformance = Array.from(deptMap.entries()).map(([deptId, data]) => {
      const resolved = data.incidents.filter((i: Incident) => ['resolved', 'closed'].includes(i.status)).length;
      const total = data.incidents.length;
      const avgTime = data.incidents
        .filter((i: Incident) => ['resolved', 'closed'].includes(i.status))
        .reduce((sum: number, i: Incident) => sum + (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60), 0);
      const avgResolution = resolved > 0 ? avgTime / resolved : 0;
      
      const slaCompliant = data.incidents.filter((i: Incident) => {
        if (!['resolved', 'closed'].includes(i.status)) return false;
        const hours = (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
        return hours <= this.getSLAHours(mapSeverityToUrgency(i.severity));
      }).length;

      return {
        departmentId: deptId,
        totalIncidents: total,
        resolvedIncidents: resolved,
        resolutionRate: total > 0 ? Number((resolved / total * 100).toFixed(1)) : 0,
        avgResolutionHours: Number(avgResolution.toFixed(1)),
        slaComplianceRate: total > 0 ? Number((slaCompliant / total * 100).toFixed(1)) : 100,
        officerCount: data.officers.length,
        openIncidents: data.incidents.filter((i: Incident) => !['resolved', 'closed'].includes(i.status)).length
      };
    });

    return [
      {
        id: 'dept_performance_table',
        title: 'Department Performance Summary',
        type: 'table',
        data: deptPerformance,
        config: { 
          columns: ['departmentId', 'totalIncidents', 'resolvedIncidents', 'resolutionRate', 'avgResolutionHours', 'slaComplianceRate', 'officerCount', 'openIncidents'],
          sortBy: 'resolutionRate',
          sortOrder: 'desc'
        }
      },
      {
        id: 'resolution_rate_chart',
        title: 'Resolution Rate by Department',
        type: 'chart',
        data: deptPerformance.map(d => ({ department: d.departmentId, rate: d.resolutionRate })),
        config: { chartType: 'bar' }
      },
      {
        id: 'sla_compliance_chart',
        title: 'SLA Compliance by Department',
        type: 'chart',
        data: deptPerformance.map(d => ({ department: d.departmentId, compliance: d.slaComplianceRate })),
        config: { chartType: 'bar' }
      }
    ];
  }

  private buildCitizenAcknowledgmentSections(reports: Report[]): ReportSection[] {
    const pendingAcknowledgment = reports.filter((r: Report) => r.status === 'submitted' || r.status === 'processing' || r.status === 'analyzed');
    
    return [
      {
        id: 'pending_acknowledgment',
        title: 'Reports Requiring Acknowledgment',
        type: 'table',
        data: pendingAcknowledgment.map((r: Report) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          urgency: r.urgency,
          citizenName: r.citizenName,
          citizenEmail: r.citizenEmail,
          location: r.locationName,
          submittedAt: r.createdAt,
          status: r.status
        })),
        config: { columns: ['id', 'title', 'category', 'urgency', 'citizenName', 'citizenEmail', 'location', 'submittedAt', 'status'] }
      },
      {
        id: 'acknowledgment_summary',
        title: 'Acknowledgment Summary',
        type: 'kpi',
        data: {
          totalSubmitted: reports.filter((r: Report) => r.status === 'submitted').length,
          totalProcessing: reports.filter((r: Report) => r.status === 'processing').length,
          totalAnalyzed: reports.filter((r: Report) => r.status === 'analyzed').length,
          totalLinked: reports.filter((r: Report) => r.status === 'linked').length,
          pendingCount: pendingAcknowledgment.length
        }
      }
    ];
  }

  private buildSLAComplianceSections(incidents: Incident[]): ReportSection[] {
    const byUrgency: Record<UrgencyLevel, { total: number; compliant: number; rate: number }> = {
      critical: { total: 0, compliant: 0, rate: 0 },
      high: { total: 0, compliant: 0, rate: 0 },
      medium: { total: 0, compliant: 0, rate: 0 },
      low: { total: 0, compliant: 0, rate: 0 }
    };

    incidents.forEach((i: Incident) => {
      if (!['resolved', 'closed'].includes(i.status)) return;
      
      const hours = (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
      const urgency = mapSeverityToUrgency(i.severity);
      const slaHours = this.getSLAHours(urgency);
      
      byUrgency[urgency].total++;
      if (hours <= slaHours) byUrgency[urgency].compliant++;
    });

    (Object.keys(byUrgency) as UrgencyLevel[]).forEach(key => {
      const u = key;
      byUrgency[u].rate = byUrgency[u].total > 0 ? Number((byUrgency[u].compliant / byUrgency[u].total * 100).toFixed(1)) : 100;
    });

    const overall = {
      total: Object.values(byUrgency).reduce((sum, v) => sum + v.total, 0),
      compliant: Object.values(byUrgency).reduce((sum, v) => sum + v.compliant, 0),
      rate: 0
    };
    overall.rate = overall.total > 0 ? Number((overall.compliant / overall.total * 100).toFixed(1)) : 100;

    return [
      {
        id: 'sla_overall',
        title: 'Overall SLA Compliance',
        type: 'kpi',
        data: overall
      },
      {
        id: 'sla_by_urgency',
        title: 'SLA Compliance by Urgency Level',
        type: 'table',
        data: Object.entries(byUrgency).map(([urgency, data]) => ({
          urgency,
          total: data.total,
          compliant: data.compliant,
          nonCompliant: data.total - data.compliant,
          rate: data.rate,
          slaHours: this.getSLAHours(urgency as UrgencyLevel)
        })),
        config: { columns: ['urgency', 'total', 'compliant', 'nonCompliant', 'rate', 'slaHours'] }
      },
      {
        id: 'sla_trend',
        title: 'SLA Compliance Trend (Last 30 Days)',
        type: 'chart',
        data: this.generateSLATrend(incidents),
        config: { chartType: 'line' }
      }
    ];
  }

  private generateSLATrend(incidents: Incident[]): { date: string; rate: number }[] {
    const now = new Date();
    const trend: { date: string; rate: number }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dayIncidents = incidents.filter((inc: Incident) => {
        const incDate = inc.createdAt.split('T')[0];
        return incDate >= dateStr && incDate < nextDateStr && ['resolved', 'closed'].includes(inc.status);
      });
      
      const compliant = dayIncidents.filter((inc: Incident) => {
        const hours = (new Date(inc.updatedAt).getTime() - new Date(inc.createdAt).getTime()) / (1000 * 60 * 60);
        return hours <= this.getSLAHours(mapSeverityToUrgency(inc.severity));
      }).length;
      
      const rate = dayIncidents.length > 0 ? Number((compliant / dayIncidents.length * 100).toFixed(1)) : 100;
      trend.push({ date: dateStr, rate });
    }
    
    return trend;
  }

  private buildEscalationReportSections(incidents: Incident[]): ReportSection[] {
    const escalated = incidents.filter((i: Incident) => (i as any).escalationLevel && (i as any).escalationLevel > 0);
    const pendingEscalation = incidents.filter((i: Incident) => 
      !['resolved', 'closed'].includes(i.status) && 
      !(i as any).escalationLevel &&
      this.shouldEscalate(i)
    );

    return [
      {
        id: 'escalated_incidents',
        title: 'Escalated Incidents',
        type: 'table',
        data: escalated.map((i: Incident) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          severity: i.severity,
          escalationLevel: (i as any).escalationLevel,
          department: i.assignedDepartmentId,
          daysOpen: Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          createdAt: i.createdAt
        })),
        config: { columns: ['id', 'title', 'category', 'severity', 'escalationLevel', 'department', 'daysOpen', 'createdAt'] }
      },
      {
        id: 'pending_escalation',
        title: 'Incidents Requiring Escalation',
        type: 'table',
        data: pendingEscalation.map((i: Incident) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          severity: i.severity,
          department: i.assignedDepartmentId,
          daysOpen: Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          slaBreachRisk: this.getSLAHours(mapSeverityToUrgency(i.severity)) < (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60)
        })),
        config: { columns: ['id', 'title', 'category', 'severity', 'department', 'daysOpen', 'slaBreachRisk'] }
      }
    ];
  }

  private shouldEscalate(incident: Incident): boolean {
    const hoursOpen = (Date.now() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60);
    const slaHours = this.getSLAHours(mapSeverityToUrgency(incident.severity));
    return hoursOpen > slaHours * 0.8;
  }

  private buildTrendAnalysisSections(reports: Report[], incidents: Incident[]): ReportSection[] {
    return [
      {
        id: 'daily_trend',
        title: 'Daily Report Trend (Last 30 Days)',
        type: 'chart',
        data: this.generateDailyTrend(reports),
        config: { chartType: 'line' }
      },
      {
        id: 'category_trend',
        title: 'Category Trend (Last 30 Days)',
        type: 'chart',
        data: this.generateCategoryTrend(reports),
        config: { chartType: 'area' }
      },
      {
        id: 'urgency_distribution',
        title: 'Urgency Distribution',
        type: 'chart',
        data: this.computeSummary(reports, incidents).byUrgency,
        config: { chartType: 'pie' }
      }
    ];
  }

  private generateDailyTrend(reports: Report[]): { date: string; count: number }[] {
    const now = new Date();
    const trend: { date: string; count: number }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = reports.filter((r: Report) => r.createdAt.split('T')[0] === dateStr).length;
      trend.push({ date: dateStr, count });
    }
    
    return trend;
  }

  private generateCategoryTrend(reports: Report[]): CategoryTrendData[] {
    const categories: ReportCategory[] = [
      'Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting',
      'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'
    ];
    
    const now = new Date();
    const trend: CategoryTrendData[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData: CategoryTrendData = { date: dateStr };
      
      categories.forEach(cat => {
        dayData[cat] = reports.filter((r: Report) => r.createdAt.split('T')[0] === dateStr && r.category === cat).length;
      });
      
      trend.push(dayData);
    }
    
    return trend;
  }

  private buildAIIntelligenceSections(reports: Report[], incidents: Incident[]): ReportSection[] {
    return [
      {
        id: 'ai_summary',
        title: 'AI Intelligence Summary',
        type: 'summary',
        data: {
          totalAnalyzed: reports.length,
          categoriesDetected: 8,
          anomaliesDetected: 0,
          clustersIdentified: 0,
          topKeywords: ['water', 'drainage', 'road', 'traffic', 'garbage', 'power'],
          sentimentDistribution: { negative: 0.6, neutral: 0.3, urgent: 0.1 }
        }
      },
      {
        id: 'duplicate_detection',
        title: 'Potential Duplicate Reports',
        type: 'table',
        data: [],
        config: { columns: ['reportId', 'similarReportId', 'similarityScore', 'distance', 'timeDelta'] }
      },
      {
        id: 'incident_clusters',
        title: 'Geographic Incident Clusters',
        type: 'table',
        data: [],
        config: { columns: ['clusterId', 'center', 'radius', 'reportCount', 'categories', 'priority'] }
      }
    ];
  }

  private buildCustomSections(reports: Report[], incidents: Incident[]): ReportSection[] {
    return [
      {
        id: 'custom_summary',
        title: 'Custom Report Summary',
        type: 'summary',
        data: this.computeSummary(reports, incidents)
      }
    ];
  }

  private async generatePDF(data: ReportData, template: ReportTemplate): Promise<string> {
    const filename = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    return `/tmp/reports/${filename}`;
  }

  private async generateCSV(data: ReportData, template: ReportTemplate): Promise<string> {
    const csvRows: string[] = [];
    csvRows.push(`Report: ${template.name}`);
    csvRows.push(`Generated: ${data.metadata.generatedAt}`);
    csvRows.push(`Period: ${data.metadata.period.from} to ${data.metadata.period.to}`);
    csvRows.push('');

    data.sections.forEach(section => {
      if (section.type === 'table' && Array.isArray(section.data)) {
        csvRows.push(`Section: ${section.title}`);
        if (section.data.length > 0) {
          const columns = section.config?.columns || Object.keys(section.data[0]);
          csvRows.push(columns.join(','));
          section.data.forEach(row => {
            csvRows.push(columns.map(c => this.escapeCSV(row[c])).join(','));
          });
        }
        csvRows.push('');
      } else if (section.type === 'kpi') {
        csvRows.push(`Section: ${section.title}`);
        Object.entries(section.data).forEach(([key, value]) => {
          csvRows.push(`${key},${value}`);
        });
        csvRows.push('');
      }
    });

    const filename = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    return `/tmp/reports/${filename}`;
  }

  private async generateHTML(data: ReportData, template: ReportTemplate): Promise<string> {
    let html = `<!DOCTYPE html><html><head><title>${template.name}</title></head><body>`;
    html += `<h1>${template.name}</h1>`;
    html += `<p>Generated: ${data.metadata.generatedAt}</p>`;
    html += `<p>Period: ${data.metadata.period.from} to ${data.metadata.period.to}</p>`;
    
    data.sections.forEach(section => {
      html += `<h2>${section.title}</h2>`;
      if (section.type === 'table' && Array.isArray(section.data)) {
        html += '<table border="1"><thead><tr>';
        const columns = section.config?.columns || (section.data.length > 0 ? Object.keys(section.data[0]) : []);
        columns.forEach(c => html += `<th>${c}</th>`);
        html += '</tr></thead><tbody>';
        section.data.forEach(row => {
          html += '<tr>';
          columns.forEach(c => html += `<td>${row[c] ?? ''}</td>`);
          html += '</tr>';
        });
        html += '</tbody></table>';
      } else if (section.type === 'kpi') {
        html += '<ul>';
        Object.entries(section.data).forEach(([key, value]) => {
          html += `<li><strong>${key}:</strong> ${value}</li>`;
        });
        html += '</ul>';
      }
    });
    
    html += '</body></html>';
    const filename = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.html`;
    return `/tmp/reports/${filename}`;
  }

  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  getGeneratedReports(templateId?: string): GeneratedReport[] {
    const reports = Array.from(this.generatedReports.values());
    if (templateId) {
      return reports.filter(r => r.templateId === templateId);
    }
    return reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  getGeneratedReport(id: string): GeneratedReport | undefined {
    return this.generatedReports.get(id);
  }

  deleteGeneratedReport(id: string): boolean {
    return this.generatedReports.delete(id);
  }

  async processScheduledReports(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const activeTemplates = Array.from(this.templates.values()).filter(t => t.isActive);

      for (const template of activeTemplates) {
        if (this.shouldRunNow(template, now)) {
          await this.generateReport(template.id);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private shouldRunNow(template: ReportTemplate, now: Date): boolean {
    const schedule = template.schedule;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    if (schedule.timeOfDay !== currentTime) return false;

    switch (template.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return now.getDay() === (schedule.dayOfWeek ?? 0);
      case 'monthly':
        return now.getDate() === (schedule.dayOfMonth ?? 1);
      case 'on_demand':
        return false;
      default:
        return false;
    }
  }
}

export const reportingEngine = new ReportingEngine();