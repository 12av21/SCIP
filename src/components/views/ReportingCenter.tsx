// SCIP Reporting Center - Comprehensive Reporting Interface
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/apiClient';
import { ReportCategory, ReportStatus, UrgencyLevel, UserRole } from '../../types/scip';
import { TemplateCard } from './ReportingCenter/TemplateCard';
import { ReportCard } from './ReportingCenter/ReportCard';
import { ReportTemplate, GeneratedReport } from './ReportingCenter/types';
import {
  ClipboardList,
  Building2,
  UserCheck,
  Shield,
  AlertTriangle,
  TrendingUp,
  Cpu,
  LayoutDashboard,
  FileType,
  FileSpreadsheet,
  FileCode,
  CalendarDays,
  Calendar,
  Zap,
  FileText,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XIcon,
  ListIcon,
  Grid,
  ArrowUp,
  ArrowDown,
  Loader2,
  Eye,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Info,
  History as HistoryIcon,
  Settings,
  X,
  AlertCircle
} from 'lucide-react';

const REPORT_CATEGORIES: ReportCategory[] = [
  'Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting',
  'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'
];

const REPORT_STATUSES: ReportStatus[] = [
  'submitted', 'processing', 'analyzed', 'linked', 'under_review', 'assigned', 'resolved', 'closed'
];

const URGENCY_LEVELS: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  categories: ReportCategory[];
  statuses: ReportStatus[];
  urgencies: UrgencyLevel[];
  departmentId?: string;
  assignedTo?: string;
  location?: { stateId?: string; districtId?: string; localityId?: string };
  tags: string[];
}

const REPORT_TYPES = [
  { value: 'incident_summary', label: 'Incident Summary', icon: ClipboardList, description: 'Overview of all incidents with KPIs' },
  { value: 'department_performance', label: 'Department Performance', icon: Building2, description: 'Performance metrics per department' },
  { value: 'citizen_acknowledgment', label: 'Citizen Acknowledgment', icon: UserCheck, description: 'Reports requiring citizen acknowledgment' },
  { value: 'sla_compliance', label: 'SLA Compliance', icon: Shield, description: 'Service level agreement compliance' },
  { value: 'escalation_report', label: 'Escalation Report', icon: AlertTriangle, description: 'Incidents requiring escalation' },
  { value: 'trend_analysis', label: 'Trend Analysis', icon: TrendingUp, description: 'Historical trends and patterns' },
  { value: 'ai_intelligence', label: 'AI Intelligence', icon: Cpu, description: 'AI-generated insights and anomalies' },
  { value: 'custom', label: 'Custom Report', icon: LayoutDashboard, description: 'Custom configurable report' }
];

const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: FileType, description: 'Portable Document Format' },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Comma-separated values' },
  { value: 'html', label: 'HTML', icon: FileCode, description: 'Web page preview' }
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', icon: CalendarDays, description: 'Every day at specified time' },
  { value: 'weekly', label: 'Weekly', icon: Calendar, description: 'Once per week on specified day' },
  { value: 'monthly', label: 'Monthly', icon: Calendar, description: 'Once per month on specified day' },
  { value: 'on_demand', label: 'On Demand', icon: Zap, description: 'Generated manually when needed' }
];

export const ReportingCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'generate' | 'history' | 'schedule' | 'settings'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Template form state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    description: string;
    type: string;
    format: string;
    frequency: string;
    recipients: string[];
    departmentId: string;
    filters: any;
    schedule: { timeOfDay: string; timezone: string; dayOfWeek?: number; dayOfMonth?: number };
    isActive: boolean;
  }>({
    name: '',
    description: '',
    type: 'incident_summary',
    format: 'pdf',
    frequency: 'on_demand',
    recipients: [],
    departmentId: '',
    filters: {},
    schedule: { timeOfDay: '06:00', timezone: 'Asia/Kolkata' },
    isActive: true
  });

  // Generate report state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generateFilters, setGenerateFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    categories: [] as ReportCategory[],
    statuses: [] as ReportStatus[],
    urgencies: [] as UrgencyLevel[],
    departmentId: '',
    assignedTo: '',
    location: {},
    tags: []
  });
  const [generateFormat, setGenerateFormat] = useState<'pdf' | 'csv' | 'html'>('pdf');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Schedule state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  // UI state
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load generated reports when history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      loadGeneratedReports();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getReportTemplates();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeneratedReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getGeneratedReports();
      setGeneratedReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load generated reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (editingTemplate) {
        await api.updateReportTemplate(editingTemplate.id, templateForm);
        setSuccess('Template updated successfully');
      } else {
        await api.createReportTemplate(templateForm);
        setSuccess('Template created successfully');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetTemplateForm();
      loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteReportTemplate(id);
      setSuccess('Template deleted successfully');
      loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description,
      type: template.type,
      format: template.format,
      frequency: template.frequency,
      recipients: template.recipients,
      departmentId: template.departmentId || '',
      filters: template.filters,
      schedule: template.schedule,
      isActive: template.isActive
    });
    setShowTemplateModal(true);
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }
    setGeneratingReport(selectedTemplateId);
    setError(null);
    try {
      const report = await api.generateReport(selectedTemplateId, {
        format: generateFormat,
        filters: generateFilters
      });
      setSuccess(`Report generation started: ${report.name}`);
      setGeneratingReport(null);
      loadGeneratedReports();
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      setGeneratingReport(null);
    }
  };

  const handleDownloadReport = async (report: GeneratedReport) => {
    setError(null);
    try {
      const result = await api.downloadGeneratedReport(report.id);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
      setSuccess('Download started');
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    }
  };

  const handlePreviewReport = async (report: GeneratedReport) => {
    setError(null);
    try {
      const data = await api.getGeneratedReport(report.id);
      setPreviewReport(data);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to preview report');
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteGeneratedReport(id);
      setSuccess('Report deleted successfully');
      loadGeneratedReports();
    } catch (err: any) {
      setError(err.message || 'Failed to delete report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessScheduled = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.processScheduledReports();
      setSuccess('Scheduled reports processing triggered');
    } catch (err: any) {
      setError(err.message || 'Failed to process scheduled reports');
    } finally {
      setIsLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      type: 'incident_summary',
      format: 'pdf',
      frequency: 'on_demand',
      recipients: [],
      departmentId: '',
      filters: {},
      schedule: { timeOfDay: '06:00', timezone: 'Asia/Kolkata' },
      isActive: true
    });
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    resetTemplateForm();
    setShowTemplateModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'generating': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeInfo = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type) || { label: type, icon: FileText, description: '' };
  };

  const getFormatInfo = (format: string) => {
    return REPORT_FORMATS.find(f => f.value === format) || { label: format, icon: FileText, description: '' };
  };

  const getFrequencyInfo = (freq: string) => {
    return FREQUENCIES.find(f => f.value === freq) || { label: freq, icon: Calendar, description: '' };
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab !== 'templates') return true;
    return true;
  });

  const filteredReports = generatedReports
    .filter(r => {
      if (selectedTemplateId && r.templateId !== selectedTemplateId) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy === 'date' ? 'generatedAt' : sortBy === 'name' ? 'name' : 'status'];
      const bVal = b[sortBy === 'date' ? 'generatedAt' : sortBy === 'name' ? 'name' : 'status'];
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting Center</h1>
            <p className="text-gray-600 mt-1">Generate, schedule, and manage automated reports</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcessScheduled}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Process Scheduled</span>
            </button>
            <button
              onClick={openNewTemplateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8" aria-label="Reporting Center tabs">
            {[
              { id: 'templates', label: 'Templates', icon: ClipboardList, count: templates.length },
              { id: 'generate', label: 'Generate', icon: FileText },
              { id: 'history', label: 'History', icon: HistoryIcon, count: generatedReports.length },
              { id: 'schedule', label: 'Scheduling', icon: Calendar },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={viewMode === 'grid' ? 'List view' : 'Grid view'}
                >
                  {viewMode === 'grid' ? <ListIcon className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                </button>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                  <option value="status">Sort by Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                >
                  {sortOrder === 'asc' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500 mb-4">Create your first report template to get started</p>
                <button onClick={openNewTemplateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Create Template
                </button>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onDelete={handleDeleteTemplate}
                      typeInfo={getTypeInfo(template.type)}
                      formatInfo={getFormatInfo(template.format)}
                      frequencyInfo={getFrequencyInfo(template.frequency)}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Format</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Frequency</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Recipients</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTemplates.map(template => {
                        const TypeIcon = getTypeInfo(template.type).icon;
                        const FormatIcon = getFormatInfo(template.format).icon;
                        const FrequencyIcon = getFrequencyInfo(template.frequency).icon;
                        return (
                          <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">{template.name}</div>
                              <div className="text-sm text-gray-500">{template.description}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                <TypeIcon className="w-3 h-3" />
                                {getTypeInfo(template.type).label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                <FormatIcon className="w-3 h-3" />
                                {getFormatInfo(template.format).label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                                <FrequencyIcon className="w-3 h-3" />
                                {getFrequencyInfo(template.frequency).label}
                              </span>
                            </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {template.recipients.map((r: string) => (
                                <span key={r} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTemplate(template)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                aria-label="Edit template"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Delete template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Template</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {templates.map(template => {
                    const TypeIcon = getTypeInfo(template.type).icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setGenerateFormat(template.format as any);
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedTemplateId === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <TypeIcon className="w-5 h-5" />
                          </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{template.name}</div>
                          <div className="text-sm text-gray-500 truncate">{template.description}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              {getFormatInfo(template.format).label}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              {getFrequencyInfo(template.frequency).label}
                            </span>
                          </div>
                        </div>
                        {selectedTemplateId === template.id && (
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
</button>
                    )
                  })}
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2" />
                      <p>No templates available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Configuration</h3>
                
                {selectedTemplateId ? (
                  <div className="space-y-6">
                    {/* Format Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                      <div className="flex gap-3">
                        {REPORT_FORMATS.map(fmt => (
                          <button
                            key={fmt.value}
                            onClick={() => setGenerateFormat(fmt.value as any)}
                            className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                              generateFormat === fmt.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <fmt.icon className={`w-5 h-5 ${generateFormat === fmt.value ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`font-medium ${generateFormat === fmt.value ? 'text-blue-600' : 'text-gray-700'}`}>
                              {fmt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                        <input
                          type="date"
                          value={generateFilters.dateFrom}
                          onChange={e => setGenerateFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                        <input
                          type="date"
                          value={generateFilters.dateTo}
                          onChange={e => setGenerateFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                      <div className="flex flex-wrap gap-2">
                        {REPORT_CATEGORIES.map(cat => (
                          <label key={cat} className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={generateFilters.categories.includes(cat)}
                              onChange={e => setGenerateFilters(prev => ({
                                ...prev,
                                categories: e.target.checked
                                  ? [...prev.categories, cat]
                                  : prev.categories.filter(c => c !== cat)
                              }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Statuses */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statuses</label>
                      <div className="flex flex-wrap gap-2">
                        {REPORT_STATUSES.map(status => (
                          <label key={status} className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={generateFilters.statuses.includes(status)}
                              onChange={e => setGenerateFilters(prev => ({
                                ...prev,
                                statuses: e.target.checked
                                  ? [...prev.statuses, status]
                                  : prev.statuses.filter(s => s !== status)
                              }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Urgencies */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Levels</label>
                      <div className="flex flex-wrap gap-2">
                        {URGENCY_LEVELS.map(urgency => (
                          <label key={urgency} className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={generateFilters.urgencies.includes(urgency)}
                              onChange={e => setGenerateFilters(prev => ({
                                ...prev,
                                urgencies: e.target.checked
                                  ? [...prev.urgencies, urgency]
                                  : prev.urgencies.filter(u => u !== urgency)
                              }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{urgency}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Department Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <select
                        value={generateFilters.departmentId}
                        onChange={e => setGenerateFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Departments</option>
                        {/* Would be populated from API */}
                      </select>
                    </div>

                    {/* Location Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <select
                          value={generateFilters.location?.stateId || ''}
                          onChange={e => setGenerateFilters(prev => ({
                            ...prev,
                            location: { ...prev.location, stateId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All States</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                        <select
                          value={generateFilters.location?.districtId || ''}
                          onChange={e => setGenerateFilters(prev => ({
                            ...prev,
                            location: { ...prev.location, districtId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Districts</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Locality</label>
                        <select
                          value={generateFilters.location?.localityId || ''}
                          onChange={e => setGenerateFilters(prev => ({
                            ...prev,
                            location: { ...prev.location, localityId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Localities</option>
                        </select>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleGenerateReport}
                        disabled={generatingReport === selectedTemplateId || isLoading}
                        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {generatingReport === selectedTemplateId ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-5 h-5" />
                            <span>Generate Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Template</h4>
                    <p className="text-gray-500">Choose a report template from the left to configure and generate a report</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Generated Reports</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={loadGeneratedReports}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <select
                  value={viewMode}
                  onChange={e => setViewMode(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {sortOrder === 'asc' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated yet</h3>
                <p className="text-gray-500 mb-4">Generate your first report from the Generate tab</p>
                <button onClick={() => setActiveTab('generate')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Generate Report
                </button>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      template={templates.find(t => t.id === report.templateId)}
                      onPreview={handlePreviewReport}
                      onDownload={handleDownloadReport}
                      onDelete={handleDeleteReport}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Format</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Generated</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Completed</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map(report => (
                        <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{report.name}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{templates.find(t => t.id === report.templateId)?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{report.format.toUpperCase()}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(report.generatedAt)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{report.completedAt ? formatDate(report.completedAt) : '—'}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {report.status === 'completed' && (
                                <button
                                  onClick={() => handlePreviewReport(report)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  aria-label="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {report.status === 'completed' && (
                                <button
                                  onClick={() => handleDownloadReport(report)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  aria-label="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Report Scheduling</h2>
              <button
                onClick={handleProcessScheduled}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Run Scheduled Now</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Frequency</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Schedule</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Timezone</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Last Run</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Next Run</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.filter(t => t.frequency !== 'on_demand').map(template => {
                      const FrequencyIcon = getFrequencyInfo(template.frequency).icon;
                      return (
                        <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-500">{template.description}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                              <FrequencyIcon className="w-3 h-3" />
                              {getFrequencyInfo(template.frequency).label}
                            </span>
                          </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {template.schedule.timeOfDay} ({template.frequency === 'weekly' ? `Day ${template.schedule.dayOfWeek}` : template.frequency === 'monthly' ? `Day ${template.schedule.dayOfMonth}` : 'Daily'})
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">{template.schedule.timezone}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">—</td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {template.frequency === 'daily' ? 'Tomorrow' : template.frequency === 'weekly' ? 'Next Week' : 'Next Month'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label="Edit schedule"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditTemplate({ ...template, isActive: !template.isActive })}
                              className={`p-2 transition-colors rounded-lg ${template.isActive ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                              aria-label={template.isActive ? 'Disable schedule' : 'Enable schedule'}
                            >
                              {template.isActive ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </button>
                          </div>
</td>
                      </tr>
                    )
                  })}
                  {templates.filter(t => t.frequency !== 'on_demand').length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          <Calendar className="w-10 h-10 mx-auto mb-2" />
                          <p>No scheduled reports configured</p>
                          <p className="text-sm mt-1">Create templates with daily, weekly, or monthly frequency to enable scheduling</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scheduler Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                How Scheduling Works
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> Reports are generated automatically based on the schedule configuration</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> The server checks for due reports every minute</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> Use "Run Scheduled Now" to manually trigger processing</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> Missed runs are caught on the next check (no duplicate execution)</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> Reports expire after 30 days and are automatically cleaned up</li>
              </ul>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-900">Reporting Settings</h2>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Report Retention</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
                  <input
                    type="number"
                    defaultValue={30}
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Reports per Template</label>
                  <input
                    type="number"
                    defaultValue={100}
                    min={1}
                    max={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Output Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Format</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Time</label>
                  <input
                    type="time"
                    defaultValue="06:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Email notifications on report completion</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Email notifications on report failure</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">In-app notifications</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Enable parallel report generation</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Compress large reports (ZIP)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Include metadata in exports</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-gray-700">Validate data before generation</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
                <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTemplate} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={templateForm.description}
                    onChange={e => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                    <select
                      value={templateForm.type}
                      onChange={e => setTemplateForm(prev => ({ ...prev, type: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format *</label>
                    <select
                      value={templateForm.format}
                      onChange={e => setTemplateForm(prev => ({ ...prev, format: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {REPORT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
                    <select
                      value={templateForm.frequency}
                      onChange={e => setTemplateForm(prev => ({ ...prev, frequency: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>

                {templateForm.frequency !== 'on_demand' && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Schedule Configuration</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                        <input
                          type="time"
                          value={templateForm.schedule.timeOfDay}
                          onChange={e => setTemplateForm(prev => ({ ...prev, schedule: { ...prev.schedule, timeOfDay: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                          value={templateForm.schedule.timezone}
                          onChange={e => setTemplateForm(prev => ({ ...prev, schedule: { ...prev.schedule, timezone: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">America/New_York (EST)</option>
                          <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                      </div>
                      {templateForm.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                          <select
                            value={templateForm.schedule.dayOfWeek || 0}
                            onChange={e => setTemplateForm(prev => ({ ...prev, schedule: { ...prev.schedule, dayOfWeek: parseInt(e.target.value) } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[0,1,2,3,4,5,6].map(d => <option key={d} value={d}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]}</option>)}
                          </select>
                        </div>
                      )}
                      {templateForm.frequency === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                          <select
                            value={templateForm.schedule.dayOfMonth || 1}
                            onChange={e => setTemplateForm(prev => ({ ...prev, schedule: { ...prev.schedule, dayOfMonth: parseInt(e.target.value) } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipients (Roles)</label>
                  <div className="flex flex-wrap gap-2">
                    {['citizen', 'officer', 'dept_officer', 'analyst', 'authority', 'admin'].map(role => (
                      <label key={role} className="inline-flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={templateForm.recipients.includes(role)}
                          onChange={e => setTemplateForm(prev => ({
                            ...prev,
                            recipients: e.target.checked
                              ? [...prev.recipients, role]
                              : prev.recipients.filter(r => r !== role)
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                  <select
                    value={templateForm.departmentId}
                    onChange={e => setTemplateForm(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.isActive}
                      onChange={e => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button type="button" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }} className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {isLoading ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Report Preview</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownloadReport(previewReport)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button onClick={() => setShowPreview(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{previewReport.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Format: {previewReport.format.toUpperCase()} | Status: {previewReport.status} | Generated: {formatDate(previewReport.generatedAt)}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 min-h-[400px] bg-white">
                  {previewReport.format === 'html' ? (
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: 'HTML preview would be rendered here' }} />
                  ) : previewReport.format === 'csv' ? (
                    <pre className="text-sm font-mono text-gray-700 overflow-x-auto">CSV preview would be shown here</pre>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <FileType className="w-16 h-16 mb-2" />
                      <p>PDF preview not available in browser</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default ReportingCenter;