// SCIP Backend - Dataset Pipeline Routes

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { datasetService } from '../../services/datasetPipeline.js';
import { ReportCategory, DatasetSplit } from '../../types/scip.js';

const router = Router();

router.get('/', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, split, source, limit, offset } = req.query;
    
    const entries = datasetService.getDatasetEntries({
      category: category as ReportCategory | undefined,
      split: split as DatasetSplit | undefined,
      source: source as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });
    
    res.json({ success: true, data: entries, meta: { total: entries.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch dataset entries.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/stats', authenticate, requirePermission('analytics.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = datasetService.getDatasetStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute dataset stats.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/versions', authenticate, requirePermission('analytics.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const versions = datasetService.getAllDatasetVersions();
    res.json({ success: true, data: versions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch dataset versions.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/versions/:version', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const version = datasetService.getDatasetVersion(req.params.version);
    if (!version) { res.status(404).json({ success: false, message: 'Dataset version not found.' }); return; }
    res.json({ success: true, data: version });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch dataset version.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.post('/', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, urgency, locationName, latitude, longitude, source, split } = req.body || {};
    
    if (!title || !description || !category || !urgency || !locationName) {
      res.status(400).json({ success: false, message: 'Title, description, category, urgency, and locationName are required.' });
      return;
    }
    
    if (!Object.values(ReportCategory).includes(category)) {
      res.status(400).json({ success: false, message: 'Invalid category.' });
      return;
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(urgency)) {
      res.status(400).json({ success: false, message: 'Invalid urgency level.' });
      return;
    }
    
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      res.status(400).json({ success: false, message: 'Valid latitude and longitude required.' });
      return;
    }
    
    const entry = datasetService.addDatasetEntry({
      title: String(title).trim(),
      description: String(description).trim(),
      trueCategory: category,
      urgency: urgency as any,
      locationName: String(locationName).trim(),
      latitude: lat,
      longitude: lng,
      source: (source as 'seed' | 'synthetic' | 'crowd' | 'historical') || 'crowd',
      split: (split as DatasetSplit) || 'train',
      text: `${String(title).trim()} ${String(description).trim()}`
    });
    
    res.status(201).json({ success: true, message: 'Dataset entry added.', data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to add dataset entry.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.post('/bulk', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entries } = req.body || {};
    
    if (!Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ success: false, message: 'Entries array is required.' });
      return;
    }
    
    if (entries.length > 1000) {
      res.status(400).json({ success: false, message: 'Maximum 1000 entries per bulk request.' });
      return;
    }
    
    const added = datasetService.bulkAddDatasetEntries(entries.map(e => ({
      title: String(e.title).trim(),
      description: String(e.description).trim(),
      trueCategory: e.category,
      urgency: e.urgency,
      locationName: String(e.locationName).trim(),
      latitude: Number(e.latitude),
      longitude: Number(e.longitude),
      source: (e.source as 'seed' | 'synthetic' | 'crowd' | 'historical') || 'crowd',
      split: e.split || 'train',
      text: `${String(e.title).trim()} ${String(e.description).trim()}`
    })));
    
    res.status(201).json({ success: true, message: `${added.length} dataset entries added.`, data: added });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to bulk add dataset entries.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.put('/:id', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, urgency, locationName, latitude, longitude, source, split } = req.body || {};
    
    const updates: any = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (category !== undefined) updates.trueCategory = category;
    if (urgency !== undefined) updates.urgency = urgency;
    if (locationName !== undefined) updates.locationName = String(locationName).trim();
    if (latitude !== undefined) updates.latitude = Number(latitude);
    if (longitude !== undefined) updates.longitude = Number(longitude);
    if (source !== undefined) updates.source = source;
    if (split !== undefined) updates.split = split;
    
    const entry = datasetService.updateDatasetEntry(req.params.id, updates);
    if (!entry) { res.status(404).json({ success: false, message: 'Dataset entry not found.' }); return; }
    
    res.json({ success: true, message: 'Dataset entry updated.', data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update dataset entry.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.delete('/:id', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = datasetService.deleteDatasetEntry(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: 'Dataset entry not found.' }); return; }
    res.json({ success: true, message: 'Dataset entry deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete dataset entry.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.post('/versions', authenticate, requirePermission('model.evaluate'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { version, notes } = req.body || {};
    
    if (!version || typeof version !== 'string' || !/^\d+\.\d+\.\d+/.test(version)) {
      res.status(400).json({ success: false, message: 'Valid semantic version (e.g., 1.1.0) is required.' });
      return;
    }
    
    const newVersion = datasetService.createDatasetVersion(version, notes);
    res.status(201).json({ success: true, message: `Dataset version ${version} created.`, data: newVersion });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create dataset version.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/evaluate/:modelVersion', authenticate, requirePermission('model.evaluate'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { modelVersion } = req.params;
    if (!modelVersion) { res.status(400).json({ success: false, message: 'Model version parameter required.' }); return; }
    
    const evaluation = datasetService.evaluateModelOnDataset(modelVersion);
    res.json({ success: true, data: evaluation });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to evaluate model on dataset.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.post('/generate', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { count, category } = req.body || {};
    
    const num = Math.min(Math.max(parseInt(count as string, 10) || 10, 1), 1000);
    const cat = category as ReportCategory | undefined;
    
    if (cat && !Object.values(ReportCategory).includes(cat)) {
      res.status(400).json({ success: false, message: 'Invalid category.' });
      return;
    }
    
    const entries = datasetService.generateSyntheticExamples(num, cat);
    res.json({ success: true, message: `${entries.length} synthetic examples generated.`, data: entries });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate synthetic examples.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/export', authenticate, requirePermission('data.export'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const format = (req.query.format as string) || 'json';
    
    if (format === 'csv') {
      const csv = datasetService.exportDataset('csv');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="scip-dataset-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
      return;
    }
    
    const json = datasetService.exportDataset('json');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="scip-dataset-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(json);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to export dataset.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

export default router;