// SCIP - Notification API Routes
import express from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { notificationService, initializeNotificationTemplates } from '../../services/notificationService';
import { NotificationEventType, NotificationChannel, NotificationPriority } from '../../types/scip';

const router = express.Router();

// Initialize default templates on startup
initializeNotificationTemplates().catch(err => console.error('[Notifications] Failed to initialize templates:', err));

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - Get user's notifications with filters
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      eventType,
      channels,
      priority,
      read,
      dateFrom,
      dateTo,
      relatedEntityId,
      relatedEntityType,
      limit = '50',
      offset = '0'
    } = req.query;

    const filters: any = {};
    if (eventType) filters.eventType = eventType as NotificationEventType;
    if (channels) filters.channels = (channels as string).split(',') as NotificationChannel[];
    if (priority) filters.priority = priority as NotificationPriority;
    if (read !== undefined) filters.read = read === 'true';
    if (dateFrom) filters.dateFrom = dateFrom as string;
    if (dateTo) filters.dateTo = dateTo as string;
    if (relatedEntityId) filters.relatedEntityId = relatedEntityId as string;
    if (relatedEntityType) filters.relatedEntityType = relatedEntityType as any;
    filters.limit = Math.min(parseInt(limit as string, 10), 100);
    filters.offset = parseInt(offset as string, 10);

    const notifications = await notificationService.getByUser(userId, filters);
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await notificationService.getStats(userId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notification stats' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await notificationService.getStats(userId);
    res.json({ success: true, data: { unread: stats.unread } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch unread count' });
  }
});

// GET /api/notifications/templates - Get all notification templates (admin/authority only)
router.get('/templates', requireRole(['admin', 'authority']), async (req: AuthenticatedRequest, res) => {
  try {
    const templates = await notificationService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch templates' });
  }
});

// GET /api/notifications/templates/:eventType - Get specific template
router.get('/templates/:eventType', requireRole(['admin', 'authority']), async (req: AuthenticatedRequest, res) => {
  try {
    const { eventType } = req.params;
    const template = await notificationService.getTemplate(eventType as NotificationEventType);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch template' });
  }
});

// POST /api/notifications/templates - Create new template (admin only)
router.post('/templates', requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const template = await notificationService.createTemplate(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create template' });
  }
});

// PUT /api/notifications/templates/:id - Update template (admin only)
router.put('/templates/:id', requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const template = await notificationService.updateTemplate(id, req.body);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update template' });
  }
});

// DELETE /api/notifications/templates/:id - Delete template (admin only)
router.delete('/templates/:id', requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await notificationService.deleteTemplate(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete template' });
  }
});

// GET /api/notifications/preferences - Get user's notification preferences
router.get('/preferences', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await notificationService.getPreferences(userId);
    res.json({ success: true, data: preferences });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch preferences' });
  }
});

// PUT /api/notifications/preferences - Update user's notification preferences
router.put('/preferences', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const preferences = await notificationService.updatePreferences(userId, req.body);
    res.json({ success: true, data: preferences });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update preferences' });
  }
});

// POST /api/notifications/send - Send a notification (admin/authority/analyst/dept_officer)
router.post('/send', requireRole(['admin', 'authority', 'analyst', 'dept_officer']), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await notificationService.send(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send notification' });
  }
});

// POST /api/notifications/send-bulk - Send bulk notifications (admin only)
router.post('/send-bulk', requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { requests } = req.body;
    if (!Array.isArray(requests)) {
      return res.status(400).json({ success: false, message: 'requests must be an array' });
    }
    const results = await notificationService.sendBulk(requests);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send bulk notifications' });
  }
});

// POST /api/notifications/trigger - Trigger event-based notifications (internal/system use)
router.post('/trigger', requireRole(['admin', 'authority', 'system']), async (req: AuthenticatedRequest, res) => {
  try {
    const { eventType, data } = req.body;
    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }
    await notificationService.processEvent(eventType as NotificationEventType, data || {});
    res.json({ success: true, message: 'Event processed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process event' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await notificationService.markAsRead(id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to mark as read' });
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await notificationService.deleteNotification(id, userId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete notification' });
  }
});

export default router;