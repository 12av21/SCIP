// SCIP - Notification Service
// Multi-channel notification delivery with templates and user preferences

import { emailService } from './emailService';
import { smsService } from './smsService';
import {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  NotificationEventType,
  NotificationChannel,
  NotificationPriority,
  NotificationSendRequest,
  NotificationSendResult,
  NotificationFilters,
  NotificationStats
} from '../types/scip';
import { db as repository } from '../database';
import { UserRole } from '../types/scip';

interface NotificationService {
  send(request: NotificationSendRequest): Promise<NotificationSendResult>;
  sendBulk(requests: NotificationSendRequest[]): Promise<NotificationSendResult[]>;
  getById(id: string): Promise<Notification | null>;
  getByUser(userId: string, filters?: NotificationFilters): Promise<Notification[]>;
  getStats(userId: string): Promise<NotificationStats>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<number>;
  deleteNotification(id: string, userId: string): Promise<boolean>;
  getPreferences(userId: string): Promise<NotificationPreference>;
  updatePreferences(userId: string, preferences: Partial<NotificationPreference>): Promise<NotificationPreference>;
  getTemplates(): Promise<NotificationTemplate[]>;
  getTemplate(eventType: NotificationEventType): Promise<NotificationTemplate | null>;
  createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate>;
  updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null>;
  deleteTemplate(id: string): Promise<boolean>;
  processEvent(eventType: NotificationEventType, data: Record<string, any>): Promise<void>;
}

const DEFAULT_TEMPLATES: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    eventType: 'incident_created',
    name: 'Incident Created',
    description: 'Sent when a new incident is created from reports',
    channels: ['in_app', 'email'],
    subject: 'New Incident Created: {{incidentId}}',
    emailTemplate: `
      <h2>New Incident Created</h2>
      <p>An incident has been created from citizen reports.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP Alert: New incident {{incidentId}} created ({{category}}) at {{location}}. Priority: {{priority}}',
    inAppTemplate: 'New incident {{incidentId}} created ({{category}}) at {{location}}',
    priority: 'high',
    isActive: true
  },
  {
    eventType: 'incident_assigned',
    name: 'Incident Assigned',
    description: 'Sent when an incident is assigned to a field officer or department',
    channels: ['in_app', 'email', 'sms'],
    subject: 'Incident Assigned: {{incidentId}}',
    emailTemplate: `
      <h2>Incident Assigned to You</h2>
      <p>You have been assigned to handle an incident.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p><strong>SLA Deadline:</strong> {{slaDeadline}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP: Incident {{incidentId}} assigned to you. {{category}} at {{location}}. Priority: {{priority}}. SLA: {{slaDeadline}}',
    inAppTemplate: 'Incident {{incidentId}} assigned to you ({{category}}, {{priority}})',
    priority: 'high',
    isActive: true
  },
  {
    eventType: 'incident_updated',
    name: 'Incident Updated',
    description: 'Sent when an incident status or details are updated',
    channels: ['in_app', 'email'],
    subject: 'Incident Updated: {{incidentId}}',
    emailTemplate: `
      <h2>Incident Status Updated</h2>
      <p>An incident you are following has been updated.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>New Status:</strong> {{newStatus}}</p>
      <p><strong>Update:</strong> {{updateMessage}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP Update: Incident {{incidentId}} status changed to {{newStatus}}',
    inAppTemplate: 'Incident {{incidentId}} updated: {{newStatus}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'incident_closed',
    name: 'Incident Closed',
    description: 'Sent when an incident is closed/resolved',
    channels: ['in_app', 'email', 'sms'],
    subject: 'Incident Closed: {{incidentId}}',
    emailTemplate: `
      <h2>Incident Closed</h2>
      <p>An incident has been closed.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Resolution:</strong> {{resolution}}</p>
      <p><strong>Closed By:</strong> {{closedBy}}</p>
      <p><strong>Time to Resolution:</strong> {{resolutionTime}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP: Incident {{incidentId}} closed. Resolution: {{resolution}}',
    inAppTemplate: 'Incident {{incidentId}} closed: {{resolution}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'incident_reopened',
    name: 'Incident Reopened',
    description: 'Sent when a closed incident is reopened',
    channels: ['in_app', 'email', 'sms'],
    subject: 'Incident Reopened: {{incidentId}}',
    emailTemplate: `
      <h2>Incident Reopened</h2>
      <p>A previously closed incident has been reopened.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p><strong>Reopened By:</strong> {{reopenedBy}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP Alert: Incident {{incidentId}} reopened. Reason: {{reason}}',
    inAppTemplate: 'Incident {{incidentId}} reopened: {{reason}}',
    priority: 'high',
    isActive: true
  },
  {
    eventType: 'incident_verified',
    name: 'Incident Verified',
    description: 'Sent when an incident resolution is verified by citizen',
    channels: ['in_app', 'email'],
    subject: 'Incident Resolution Verified: {{incidentId}}',
    emailTemplate: `
      <h2>Incident Resolution Verified</h2>
      <p>A citizen has verified the resolution of an incident.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Verified By:</strong> {{citizenName}}</p>
      <p><strong>Feedback:</strong> {{feedback}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident</a></p>
    `,
    smsTemplate: 'SCIP: Incident {{incidentId}} resolution verified by citizen',
    inAppTemplate: 'Incident {{incidentId}} resolution verified by citizen',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'incident_escalated',
    name: 'Incident Escalated',
    description: 'Sent when an incident is escalated to higher authority',
    channels: ['in_app', 'email', 'sms'],
    subject: 'URGENT: Incident Escalated: {{incidentId}}',
    emailTemplate: `
      <h2 style="color: #dc2626;">INCIDENT ESCALATED</h2>
      <p>An incident has been escalated and requires immediate attention.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Current Priority:</strong> {{priority}}</p>
      <p><strong>Escalation Reason:</strong> {{escalationReason}}</p>
      <p><strong>Escalated To:</strong> {{escalatedTo}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">View Incident Immediately</a></p>
    `,
    smsTemplate: 'SCIP URGENT: Incident {{incidentId}} escalated to {{escalatedTo}}. Reason: {{escalationReason}}',
    inAppTemplate: 'URGENT: Incident {{incidentId}} escalated to {{escalatedTo}}',
    priority: 'critical',
    isActive: true
  },
  {
    eventType: 'incident_sla_breach',
    name: 'SLA Breach Alert',
    description: 'Sent when an incident SLA deadline is breached or at risk',
    channels: ['in_app', 'email', 'sms'],
    subject: 'SLA BREACH: Incident {{incidentId}}',
    emailTemplate: `
      <h2 style="color: #dc2626;">SLA BREACH ALERT</h2>
      <p>An incident has breached or is at risk of breaching its SLA deadline.</p>
      <p><strong>Incident ID:</strong> {{incidentId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Assigned To:</strong> {{assignedTo}}</p>
      <p><strong>SLA Deadline:</strong> {{slaDeadline}}</p>
      <p><strong>Time Overdue:</strong> {{timeOverdue}}</p>
      <p><a href="{{appUrl}}/incidents/{{incidentId}}">Take Action Now</a></p>
    `,
    smsTemplate: 'SCIP SLA ALERT: Incident {{incidentId}} SLA breached. {{timeOverdue}} overdue. Assigned to {{assignedTo}}',
    inAppTemplate: 'SLA BREACH: Incident {{incidentId}} - {{timeOverdue}} overdue',
    priority: 'critical',
    isActive: true
  },
  {
    eventType: 'report_submitted',
    name: 'Report Submitted',
    description: 'Sent when a citizen submits a new report',
    channels: ['in_app', 'email'],
    subject: 'New Report Submitted: {{reportId}}',
    emailTemplate: `
      <h2>New Report Submitted</h2>
      <p>A citizen has submitted a new civic report.</p>
      <p><strong>Report ID:</strong> {{reportId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Description:</strong> {{description}}</p>
      <p><a href="{{appUrl}}/reports/{{reportId}}">View Report</a></p>
    `,
    smsTemplate: 'SCIP: New report {{reportId}} submitted ({{category}}) at {{location}}',
    inAppTemplate: 'New report {{reportId}} submitted ({{category}}) at {{location}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'report_status_changed',
    name: 'Report Status Changed',
    description: 'Sent when a report status changes',
    channels: ['in_app', 'email'],
    subject: 'Report Status Update: {{reportId}}',
    emailTemplate: `
      <h2>Report Status Updated</h2>
      <p>Your report status has been updated.</p>
      <p><strong>Report ID:</strong> {{reportId}}</p>
      <p><strong>New Status:</strong> {{newStatus}}</p>
      <p><strong>Updated By:</strong> {{updatedBy}}</p>
      <p><a href="{{appUrl}}/reports/{{reportId}}">View Report</a></p>
    `,
    smsTemplate: 'SCIP: Your report {{reportId}} status changed to {{newStatus}}',
    inAppTemplate: 'Report {{reportId}} status: {{newStatus}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'report_assigned',
    name: 'Report Assigned',
    description: 'Sent when a report is assigned to a department/officer',
    channels: ['in_app', 'email'],
    subject: 'Report Assigned: {{reportId}}',
    emailTemplate: `
      <h2>Report Assigned</h2>
      <p>A report has been assigned to your department.</p>
      <p><strong>Report ID:</strong> {{reportId}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Assigned To:</strong> {{assignedTo}}</p>
      <p><a href="{{appUrl}}/reports/{{reportId}}">View Report</a></p>
    `,
    smsTemplate: 'SCIP: Report {{reportId}} assigned to {{assignedTo}}',
    inAppTemplate: 'Report {{reportId}} assigned to {{assignedTo}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'report_resolved',
    name: 'Report Resolved',
    description: 'Sent when a report is marked as resolved',
    channels: ['in_app', 'email', 'sms'],
    subject: 'Report Resolved: {{reportId}}',
    emailTemplate: `
      <h2>Report Resolved</h2>
      <p>Your report has been resolved.</p>
      <p><strong>Report ID:</strong> {{reportId}}</p>
      <p><strong>Resolution:</strong> {{resolution}}</p>
      <p><strong>Resolved By:</strong> {{resolvedBy}}</p>
      <p>Please verify the resolution if satisfied.</p>
      <p><a href="{{appUrl}}/reports/{{reportId}}">View Report</a></p>
    `,
    smsTemplate: 'SCIP: Your report {{reportId}} resolved. {{resolution}}. Please verify.',
    inAppTemplate: 'Report {{reportId}} resolved: {{resolution}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'report_acknowledged',
    name: 'Report Acknowledged',
    description: 'Sent when a citizen acknowledges a report resolution',
    channels: ['in_app', 'email'],
    subject: 'Report Resolution Acknowledged: {{reportId}}',
    emailTemplate: `
      <h2>Report Resolution Acknowledged</h2>
      <p>The citizen has acknowledged the resolution of their report.</p>
      <p><strong>Report ID:</strong> {{reportId}}</p>
      <p><strong>Acknowledged By:</strong> {{citizenName}}</p>
      <p><strong>Rating:</strong> {{rating}}/5</p>
      <p><strong>Feedback:</strong> {{feedback}}</p>
      <p><a href="{{appUrl}}/reports/{{reportId}}">View Report</a></p>
    `,
    smsTemplate: 'SCIP: Report {{reportId}} resolution acknowledged by citizen ({{rating}}/5)',
    inAppTemplate: 'Report {{reportId}} acknowledged ({{rating}}/5)',
    priority: 'low',
    isActive: true
  },
  {
    eventType: 'report_generated',
    name: 'Report Generated',
    description: 'Sent when a scheduled or on-demand report is generated',
    channels: ['in_app', 'email'],
    subject: 'Report Ready: {{reportName}}',
    emailTemplate: `
      <h2>Report Generated</h2>
      <p>A report has been generated and is ready for download.</p>
      <p><strong>Report:</strong> {{reportName}}</p>
      <p><strong>Type:</strong> {{reportType}}</p>
      <p><strong>Format:</strong> {{format}}</p>
      <p><strong>Period:</strong> {{dateFrom}} to {{dateTo}}</p>
      <p><a href="{{appUrl}}/reporting/history/{{reportId}}">Download Report</a></p>
    `,
    smsTemplate: 'SCIP: Report {{reportName}} ready for download',
    inAppTemplate: 'Report {{reportName}} ({{format}}) ready for download',
    priority: 'low',
    isActive: true
  },
  {
    eventType: 'report_scheduled',
    name: 'Report Scheduled',
    description: 'Sent when a report is scheduled for recurring generation',
    channels: ['in_app', 'email'],
    subject: 'Report Scheduled: {{templateName}}',
    emailTemplate: `
      <h2>Report Scheduled</h2>
      <p>A recurring report has been scheduled.</p>
      <p><strong>Template:</strong> {{templateName}}</p>
      <p><strong>Frequency:</strong> {{frequency}}</p>
      <p><strong>Time:</strong> {{timeOfDay}} {{timezone}}</p>
      <p><strong>Recipients:</strong> {{recipients}}</p>
      <p><a href="{{appUrl}}/reporting">Manage Reports</a></p>
    `,
    smsTemplate: 'SCIP: Report {{templateName}} scheduled {{frequency}} at {{timeOfDay}}',
    inAppTemplate: 'Report {{templateName}} scheduled {{frequency}}',
    priority: 'low',
    isActive: true
  },
  {
    eventType: 'user_registered',
    name: 'User Registered',
    description: 'Sent when a new user registers',
    channels: ['in_app', 'email'],
    subject: 'Welcome to SCIP!',
    emailTemplate: `
      <h2>Welcome to SCIP!</h2>
      <p>Thank you for registering with the Smart Community Intelligence Platform.</p>
      <p><strong>Name:</strong> {{name}}</p>
      <p><strong>Role:</strong> {{role}}</p>
      <p>Please verify your email to activate your account.</p>
      <p><a href="{{appUrl}}/verify-email?token={{token}}&email={{email}}">Verify Email</a></p>
    `,
    smsTemplate: 'Welcome to SCIP! Please verify your email to activate your account.',
    inAppTemplate: 'Welcome to SCIP! Please verify your email.',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'user_role_changed',
    name: 'Role Changed',
    description: 'Sent when a user role is changed',
    channels: ['in_app', 'email'],
    subject: 'Your SCIP Role Has Been Updated',
    emailTemplate: `
      <h2>Role Updated</h2>
      <p>Your role in SCIP has been changed.</p>
      <p><strong>New Role:</strong> {{newRole}}</p>
      <p><strong>Changed By:</strong> {{changedBy}}</p>
      <p>Your permissions have been updated accordingly.</p>
      <p><a href="{{appUrl}}/dashboard">View Dashboard</a></p>
    `,
    smsTemplate: 'SCIP: Your role changed to {{newRole}}',
    inAppTemplate: 'Your role changed to {{newRole}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'system_announcement',
    name: 'System Announcement',
    description: 'System-wide announcements',
    channels: ['in_app', 'email'],
    subject: 'SCIP Announcement: {{title}}',
    emailTemplate: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <p><a href="{{appUrl}}/announcements/{{announcementId}}">Read More</a></p>
    `,
    smsTemplate: 'SCIP Announcement: {{title}}',
    inAppTemplate: '{{title}}',
    priority: 'medium',
    isActive: true
  },
  {
    eventType: 'ai_insight_generated',
    name: 'AI Insight Generated',
    description: 'Sent when AI generates a new insight or anomaly detection',
    channels: ['in_app', 'email'],
    subject: 'AI Insight: {{insightTitle}}',
    emailTemplate: `
      <h2>AI Intelligence Alert</h2>
      <p>The AI engine has generated a new insight.</p>
      <p><strong>Title:</strong> {{insightTitle}}</p>
      <p><strong>Type:</strong> {{insightType}}</p>
      <p><strong>Severity:</strong> {{severity}}</p>
      <p><strong>Description:</strong> {{description}}</p>
      <p><strong>Affected Area:</strong> {{affectedArea}}</p>
      <p><a href="{{appUrl}}/intelligence/{{insightId}}">View Insight</a></p>
    `,
    smsTemplate: 'SCIP AI Alert: {{insightTitle}} ({{severity}})',
    inAppTemplate: 'AI Insight: {{insightTitle}} ({{severity}})',
    priority: 'high',
    isActive: true
  },
  {
    eventType: 'department_alert',
    name: 'Department Alert',
    description: 'Sent for department-specific alerts (workload, performance, etc.)',
    channels: ['in_app', 'email'],
    subject: 'Department Alert: {{alertTitle}}',
    emailTemplate: `
      <h2>Department Alert</h2>
      <p>{{message}}</p>
      <p><strong>Department:</strong> {{departmentName}}</p>
      <p><strong>Metric:</strong> {{metricName}}: {{metricValue}} (threshold: {{threshold}})</p>
      <p><a href="{{appUrl}}/departments/{{departmentId}}">View Dashboard</a></p>
    `,
    smsTemplate: 'SCIP Dept Alert: {{alertTitle}} - {{metricName}}: {{metricValue}}',
    inAppTemplate: 'Dept Alert: {{alertTitle}}',
    priority: 'high',
    isActive: true
  }
];

function createNotificationService(): NotificationService {
  const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  async function renderTemplate(template: string, data: Record<string, any>): Promise<string> {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] ?? match);
  }

  async function getEffectiveChannels(userId: string, eventType: NotificationEventType, requestedChannels: NotificationChannel[]): Promise<NotificationChannel[]> {
    const prefs = await getPreferencesInternal(userId);
    if (!prefs) return requestedChannels;

    const allowedChannels = prefs.channelPreferences[eventType] || requestedChannels;
    const result: NotificationChannel[] = [];

    if (requestedChannels.includes('email') && prefs.emailEnabled && allowedChannels.includes('email')) result.push('email');
    if (requestedChannels.includes('sms') && prefs.smsEnabled && allowedChannels.includes('sms')) result.push('sms');
    if (requestedChannels.includes('in_app') && prefs.inAppEnabled && allowedChannels.includes('in_app')) result.push('in_app');
    if (requestedChannels.includes('push') && prefs.pushEnabled && allowedChannels.includes('push')) result.push('push');

    return result.length > 0 ? result : ['in_app'];
  }

  async function getPreferencesInternal(userId: string): Promise<NotificationPreference | null> {
    try {
      const prefs = await repository.findNotificationPreferencesByUserId(userId);
      return prefs ?? null;
    } catch {
      return null;
    }
  }

  async function checkQuietHours(prefs: NotificationPreference | null): Promise<boolean> {
    if (!prefs?.quietHours?.enabled) return false;
    const now = new Date();
    const tz = prefs.quietHours.timezone || 'UTC';
    const currentTime = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    const start = prefs.quietHours.start;
    const end = prefs.quietHours.end;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }

  return {
    async send(request: NotificationSendRequest): Promise<NotificationSendResult> {
      const user = await repository.getUserById(request.userId);
      if (!user) {
        return {
          success: false,
          notificationId: '',
          channels: {},
          errors: ['User not found']
        };
      }

      const template = await repository.findNotificationTemplateByEventType(request.eventType);
      const channels = request.channels || (template?.channels || ['in_app']);
      const effectiveChannels = await getEffectiveChannels(request.userId, request.eventType, channels);
      const prefs = await getPreferencesInternal(request.userId);
      const inQuietHours = await checkQuietHours(prefs);

      if (inQuietHours && !['critical', 'high'].includes(request.priority || 'medium')) {
        return {
          success: true,
          notificationId: '',
          channels: { inApp: { success: true } },
          errors: []
        };
      }

      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const title = template ? await renderTemplate(template.subject, request.data ?? {}) : request.title;
      const emailBody = template ? await renderTemplate(template.emailTemplate, { ...(request.data ?? {}), appUrl }) : request.message;
      const smsBody = template ? await renderTemplate(template.smsTemplate, { ...(request.data ?? {}), appUrl }) : request.message;
      const inAppBody = template ? await renderTemplate(template.inAppTemplate, { ...(request.data ?? {}), appUrl }) : request.message;

      const notification: Notification = {
        id: notificationId,
        userId: request.userId,
        eventType: request.eventType,
        title,
        message: inAppBody,
        channels: effectiveChannels,
        priority: request.priority || template?.priority || 'medium',
        data: request.data,
        read: false,
        emailSent: false,
        smsSent: false,
        pushSent: false,
        correlationId: request.correlationId,
        relatedEntityId: request.relatedEntityId,
        relatedEntityType: request.relatedEntityType,
        createdAt: now
      };

      await repository.createNotification(notification);

      const results: NotificationSendResult['channels'] = {};
      const errors: string[] = [];

      if (effectiveChannels.includes('email') && user.email) {
        const emailResult = await emailService.sendEmail({
          to: user.email,
          subject: title,
          htmlBody: emailBody,
          textBody: smsBody,
          correlationId: notificationId
        });
        results.email = { success: emailResult.success, messageId: emailResult.messageId, error: emailResult.error };
        if (emailResult.success) {
          notification.emailSent = true;
          notification.emailSentAt = new Date().toISOString();
        } else {
          errors.push(`Email: ${emailResult.error}`);
        }
      }

      if (effectiveChannels.includes('sms') && user.phone) {
        const smsResult = await smsService.sendSms({
          to: user.phone,
          message: smsBody,
          correlationId: notificationId
        });
        results.sms = { success: smsResult.success, messageId: smsResult.messageId, error: smsResult.error };
        if (smsResult.success) {
          notification.smsSent = true;
          notification.smsSentAt = new Date().toISOString();
        } else {
          errors.push(`SMS: ${smsResult.error}`);
        }
      }

      if (effectiveChannels.includes('in_app')) {
        results.inApp = { success: true };
      }

      if (effectiveChannels.includes('push')) {
        results.push = { success: false, error: 'Push notifications not yet implemented' };
        errors.push('Push: not implemented');
      }

      await repository.updateNotification(notificationId, notification);

      return {
        success: errors.length === 0 || effectiveChannels.length === 1,
        notificationId,
        channels: results,
        errors
      };
    },

    async sendBulk(requests: NotificationSendRequest[]): Promise<NotificationSendResult[]> {
      return Promise.all(requests.map(r => this.send(r)));
    },

    async getById(id: string): Promise<Notification | null> {
      const notif = await repository.findNotificationById(id);
      return notif ?? null;
    },

    async getByUser(userId: string, filters?: NotificationFilters): Promise<Notification[]> {
      return repository.findNotificationsByUser(userId, filters);
    },

    async getStats(userId: string): Promise<NotificationStats> {
      const notifications = await repository.findNotificationsByUser(userId);
      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<NotificationEventType, number>,
        byChannel: {} as Record<NotificationChannel, number>,
        byPriority: {} as Record<NotificationPriority, number>
      };

      for (const n of notifications) {
        stats.byType[n.eventType] = (stats.byType[n.eventType] || 0) + 1;
        for (const c of n.channels) {
          stats.byChannel[c] = (stats.byChannel[c] || 0) + 1;
        }
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
      }

      return stats;
    },

    async markAsRead(id: string, userId: string): Promise<boolean> {
      const notification = await repository.findNotificationById(id);
      if (!notification || notification.userId !== userId) return false;

      notification.read = true;
      notification.readAt = new Date().toISOString();
      await repository.updateNotification(id, notification);
      return true;
    },

    async markAllAsRead(userId: string): Promise<number> {
      const notifications = await repository.findNotificationsByUser(userId, { read: false });
      let count = 0;
      for (const n of notifications) {
        n.read = true;
        n.readAt = new Date().toISOString();
        await repository.updateNotification(n.id, n);
        count++;
      }
      return count;
    },

    async deleteNotification(id: string, userId: string): Promise<boolean> {
      const notification = await repository.findNotificationById(id);
      if (!notification || notification.userId !== userId) return false;
      return repository.deleteNotification(id);
    },

    async getPreferences(userId: string): Promise<NotificationPreference> {
      let prefs = await repository.findNotificationPreferencesByUserId(userId);
      if (!prefs) {
        prefs = await this.updatePreferences(userId, {});
      }
      return prefs;
    },

    async updatePreferences(userId: string, updates: Partial<NotificationPreference>): Promise<NotificationPreference> {
      const existing = await repository.findNotificationPreferencesByUserId(userId);
      const now = new Date().toISOString();

      const defaultPrefs: NotificationPreference = {
        userId,
        emailEnabled: true,
        smsEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
        channelPreferences: {
          incident_created: ['in_app', 'email'],
          incident_assigned: ['in_app', 'email', 'sms'],
          incident_updated: ['in_app', 'email'],
          incident_closed: ['in_app', 'email'],
          incident_reopened: ['in_app', 'email', 'sms'],
          incident_verified: ['in_app', 'email'],
          incident_escalated: ['in_app', 'email', 'sms'],
          incident_sla_breach: ['in_app', 'email', 'sms'],
          report_submitted: ['in_app'],
          report_status_changed: ['in_app', 'email'],
          report_assigned: ['in_app', 'email'],
          report_resolved: ['in_app', 'email', 'sms'],
          report_acknowledged: ['in_app', 'email'],
          report_generated: ['in_app', 'email'],
          report_scheduled: ['in_app', 'email'],
          user_registered: ['in_app', 'email'],
          user_role_changed: ['in_app', 'email'],
          system_announcement: ['in_app', 'email'],
          ai_insight_generated: ['in_app', 'email'],
          department_alert: ['in_app', 'email'],
        } as Record<NotificationEventType, NotificationChannel[]>,
        quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' },
        frequency: 'immediate',
        updatedAt: now
      };

      const merged = { ...defaultPrefs, ...existing, ...updates, updatedAt: now };
      await repository.upsertNotificationPreferences(merged);
      return merged;
    },

    async getTemplates(): Promise<NotificationTemplate[]> {
      return repository.findAllNotificationTemplates();
    },

    async getTemplate(eventType: NotificationEventType): Promise<NotificationTemplate | null> {
      const template = await repository.findNotificationTemplateByEventType(eventType);
      return template ?? null;
    },

    async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
      const now = new Date().toISOString();
      const newTemplate: NotificationTemplate = {
        ...template,
        id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now
      };
      await repository.createNotificationTemplate(newTemplate);
      return newTemplate;
    },

    async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
      const existing = await repository.findNotificationTemplateById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      await repository.updateNotificationTemplate(id, updated);
      return updated;
    },

    async deleteTemplate(id: string): Promise<boolean> {
      return repository.deleteNotificationTemplate(id);
    },

    async processEvent(eventType: NotificationEventType, data: Record<string, any>): Promise<void> {
      const template = await repository.findNotificationTemplateByEventType(eventType);
      if (!template || !template.isActive) return;

      let targetUserIds: string[] = [];

      switch (eventType) {
        case 'incident_created':
        case 'incident_assigned':
        case 'incident_updated':
        case 'incident_closed':
        case 'incident_reopened':
        case 'incident_verified':
        case 'incident_escalated':
        case 'incident_sla_breach':
          if (data.assignedTo) targetUserIds.push(data.assignedTo);
          if (data.departmentId) {
            const deptUsers = await repository.findUsersByDepartment(data.departmentId);
            targetUserIds.push(...deptUsers.map(u => u.id));
          }
          break;
        case 'report_submitted':
        case 'report_assigned':
          if (data.departmentId) {
            const deptUsers = await repository.findUsersByDepartment(data.departmentId);
            targetUserIds.push(...deptUsers.map(u => u.id));
          }
          break;
        case 'report_status_changed':
        case 'report_resolved':
        case 'report_acknowledged':
          if (data.citizenId) targetUserIds.push(data.citizenId);
          break;
        case 'report_generated':
        case 'report_scheduled':
          if (data.recipients) targetUserIds.push(...data.recipients);
          break;
        case 'user_registered':
        case 'user_role_changed':
          if (data.userId) targetUserIds.push(data.userId);
          break;
        case 'system_announcement':
          const allUsers = await repository.getUsers();
          targetUserIds = allUsers.map(u => u.id);
          break;
        case 'ai_insight_generated':
          const analysts = await repository.findUsersByRole('analyst');
          const authorities = await repository.findUsersByRole('authority');
          targetUserIds.push(...analysts.map(u => u.id), ...authorities.map(u => u.id));
          break;
        case 'department_alert':
          if (data.departmentId) {
            const deptUsers = await repository.findUsersByDepartment(data.departmentId);
            targetUserIds.push(...deptUsers.map(u => u.id));
          }
          break;
      }

      targetUserIds = [...new Set(targetUserIds)];

      const requests: NotificationSendRequest[] = targetUserIds.map(userId => ({
        userId,
        eventType,
        title: '',
        message: '',
        data,
        priority: template.priority
      }));

      await this.sendBulk(requests);
    }
  };
}

export const notificationService = createNotificationService();

export async function initializeNotificationTemplates(): Promise<void> {
  for (const tmpl of DEFAULT_TEMPLATES) {
    const existing = await repository.findNotificationTemplateByEventType(tmpl.eventType);
    if (!existing) {
      await notificationService.createTemplate(tmpl);
    }
  }
}