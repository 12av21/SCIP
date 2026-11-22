// SCIP Backend - Reporting Engine Routes

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { reportingEngine, ReportTemplate, ReportFormat, ReportType, ReportFilters } from '../../services/reportingEngine.js';

const router = Router();

// Get all report templates
router.get('/templates', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const templates = reportingEngine.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch report templates.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Get a specific report template
router.get('/templates/:id', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = reportingEngine.getTemplate(req.params.id);
    if (!template) { res.status(404).json({ success: false, message: 'Report template not found.' }); return; }
    res.json({ success: true, data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch report template.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Create a new report template
router.post('/templates', authenticate, requirePermission('report.create'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, type, format, frequency, recipients, departmentId, filters, schedule, isActive } = req.body || {};
    
    if (!name || !description || !type || !format || !frequency || !schedule) {
      res.status(400).json({ success: false, message: 'Name, description, type, format, frequency, and schedule are required.' });
      return;
    }
    
    const validTypes: ReportType[] = ['incident_summary', 'department_performance', 'citizen_acknowledgment', 'escalation_report', 'sla_compliance', 'trend_analysis', 'ai_intelligence', 'custom'];
    const validFormats: ReportFormat[] = ['pdf', 'csv', 'html'];
    const validFrequencies = ['daily', 'weekly', 'monthly', 'on_demand'];
    
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, message: 'Invalid report type.' });
      return;
    }
    
    if (!validFormats.includes(format)) {
      res.status(400).json({ success: false, message: 'Invalid report format.' });
      return;
    }
    
    if (!validFrequencies.includes(frequency)) {
      res.status(400).json({ success: false, message: 'Invalid frequency.' });
      return;
    }
    
    const template = reportingEngine.createTemplate({
      name: String(name).trim(),
      description: String(description).trim(),
      type,
      format,
      frequency,
      recipients: Array.isArray(recipients) ? recipients : [],
      departmentId,
      filters: filters || {},
      schedule,
      isActive: isActive !== false
    });
    
    res.status(201).json({ success: true, message: 'Report template created.', data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create report template.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Update a report template
router.put('/templates/:id', authenticate, requirePermission('report.update'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, type, format, frequency, recipients, departmentId, filters, schedule, isActive } = req.body || {};
    
    const updates: Partial<ReportTemplate> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (type !== undefined) updates.type = type;
    if (format !== undefined) updates.format = format;
    if (frequency !== undefined) updates.frequency = frequency;
    if (recipients !== undefined) updates.recipients = recipients;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    if (filters !== undefined) updates.filters = filters;
    if (schedule !== undefined) updates.schedule = schedule;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const template = reportingEngine.updateTemplate(req.params.id, updates);
    if (!template) { res.status(404).json({ success: false, message: 'Report template not found.' }); return; }
    
    res.json({ success: true, message: 'Report template updated.', data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update report template.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Delete a report template
router.delete('/templates/:id', authenticate, requirePermission('report.delete'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = reportingEngine.deleteTemplate(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: 'Report template not found.' }); return; }
    res.json({ success: true, message: 'Report template deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete report template.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Generate a report on-demand
router.post('/generate', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { templateId, format, filters } = req.body || {};
    
    if (!templateId) {
      res.status(400).json({ success: false, message: 'Template ID is required.' });
      return;
    }
    
    const report = await reportingEngine.generateReport(templateId, { format, filters });
    res.status(202).json({ success: true, message: 'Report generation started.', data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to start report generation.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Get all generated reports
router.get('/generated', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { templateId, limit, offset } = req.query;
    let reports = reportingEngine.getGeneratedReports(templateId as string);
    
    if (limit) reports = reports.slice(0, parseInt(limit as string, 10));
    if (offset) reports = reports.slice(parseInt(offset as string, 10));
    
    res.json({ success: true, data: reports, meta: { total: reports.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch generated reports.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Get a specific generated report
router.get('/generated/:id', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = reportingEngine.getGeneratedReport(req.params.id);
    if (!report) { res.status(404).json({ success: false, message: 'Generated report not found.' }); return; }
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch generated report.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Download a generated report
router.get('/generated/:id/download', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const report = reportingEngine.getGeneratedReport(req.params.id);
    if (!report) { res.status(404).json({ success: false, message: 'Generated report not found.' }); return; }
    
    if (report.status !== 'completed') {
      res.status(400).json({ success: false, message: 'Report is not ready for download.' });
      return;
    }
    
    // In production, stream from object storage
    // For now, return a placeholder response
    res.json({ 
      success: true, 
      message: 'Download URL generated.',
      data: { downloadUrl: report.downloadUrl, fileName: `${report.name}.${report.format}`, expiresAt: report.expiresAt }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate download URL.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Delete a generated report
router.delete('/generated/:id', authenticate, requirePermission('report.delete'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = reportingEngine.deleteGeneratedReport(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: 'Generated report not found.' }); return; }
    res.json({ success: true, message: 'Generated report deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete generated report.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Trigger scheduled report processing (admin only)
router.post('/process-scheduled', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await reportingEngine.processScheduledReports();
    res.json({ success: true, message: 'Scheduled report processing triggered.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process scheduled reports.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

export default router;