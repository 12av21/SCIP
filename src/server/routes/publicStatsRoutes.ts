// SCIP Backend - Public Statistics Routes
// Public endpoints for dashboard metrics (no authentication required)

import { Router, Response } from 'express';
import { db } from '../../database/index.js';

const router = Router();

// GET /api/public/stats - Public dashboard statistics
router.get('/stats', async (_req, res: Response): Promise<void> => {
  try {
    // Fetch all data (these are aggregated counts, no PII)
    const [reports, incidents, users] = await Promise.all([
      db.getReports({}),
      db.getIncidents({}),
      db.getUsers()
    ]);

    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === 'submitted' || r.status === 'analyzed').length;
    const underReviewReports = reports.filter(r => r.status === 'under_review' || r.status === 'linked' || r.status === 'assigned').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;
    const activeIncidents = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress').length;
    const registeredCitizens = users.filter(u => u.role === 'citizen').length;
    const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    for (const r of reports) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }

    // Daily volume for last 7 days
    const dailyVolume: Record<string, number> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    for (const r of reports) {
      const dateKey = r.createdAt.split('T')[0];
      const reportDate = new Date(dateKey);
      if (reportDate >= sevenDaysAgo) {
        dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + 1;
      }
    }

    // Incident status distribution
    const incidentStatusCounts: Record<string, number> = {};
    for (const i of incidents) {
      incidentStatusCounts[i.status] = (incidentStatusCounts[i.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        registeredCitizens,
        totalReports,
        pendingReports,
        underReviewReports,
        resolvedReports,
        activeIncidents,
        resolutionRate,
        categoryCounts,
        dailyVolume,
        incidentStatusCounts,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch public statistics',
      errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
    });
  }
});

// GET /api/public/latest - Latest public activities (reports & incidents)
router.get('/latest', async (_req, res: Response): Promise<void> => {
  try {
    const [reports, incidents] = await Promise.all([
      db.getReports({}),
      db.getIncidents({})
    ]);

    const latestActivities = [
      ...incidents
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(inc => ({
          id: inc.id,
          title: inc.title,
          category: inc.category,
          date: inc.createdAt,
          type: 'incident' as const,
          status: inc.status,
          location: inc.locationName,
          summary: inc.description?.slice(0, 200) || ''
        })),
      ...reports
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(rep => ({
          id: rep.id,
          title: rep.title,
          category: rep.category,
          date: rep.createdAt,
          type: 'report' as const,
          status: rep.status,
          location: rep.locationName,
          summary: rep.description?.slice(0, 200) || ''
        }))
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.json({ success: true, data: latestActivities });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch latest activities',
      errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
    });
  }
});

export default router;